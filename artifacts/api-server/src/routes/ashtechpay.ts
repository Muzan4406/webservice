import { Router, type IRouter, type Response } from "express";
import { randomUUID } from "node:crypto";
import { and, desc, eq, isNull, or } from "drizzle-orm";
import {
  appSettingsTable,
  db,
  depositsTable,
  pendingSpDepositsTable,
  vipPaymentsTable,
} from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { logger } from "../lib/logger.js";
import { getDatabaseIssue } from "../lib/database-errors.js";
import {
  ashtechPayRequest,
  AshtechPayError,
  getAshtechPayApiKey,
  getAshtechPayWebhookUrl,
  normalizeAshtechCountries,
  normalizeAshtechPhone,
  normalizeAshtechStatus,
  type AshtechPayCountry,
  type AshtechPayTransaction,
} from "../lib/ashtechpay.js";
import { settleAshtechPayPayment } from "../lib/ashtechpay-settlement.js";

const router: IRouter = Router();
const REQUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MIN_AMOUNT = 50;
const MAX_AMOUNT = 1_000_000;
const COUNTRY_CACHE_MS = 5 * 60_000;
const UNKNOWN_OUTCOME_PREFIX = "unknown:";
const IN_FLIGHT_PREFIX = "inflight:";

let countryCache: { expiresAt: number; countries: AshtechPayCountry[] } | undefined;

function uncertainReference(prefix: string, providerReference: string): string {
  return `${prefix}${encodeURIComponent(providerReference)}`;
}

function getUncertainReference(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const prefix = [UNKNOWN_OUTCOME_PREFIX, IN_FLIGHT_PREFIX]
    .find((candidate) => value.startsWith(candidate));
  if (!prefix) return undefined;
  try {
    return decodeURIComponent(value.slice(prefix.length));
  } catch {
    return undefined;
  }
}

function responseRequestId(orderId: string, prefix: "dep" | "vip", userId: number): string | undefined {
  const match = new RegExp(`^${prefix}_${userId}_(${REQUEST_ID_PATTERN.source.slice(1, -1)})$`, "i").exec(orderId);
  return match?.[1];
}

async function getCountries(): Promise<AshtechPayCountry[]> {
  if (countryCache && countryCache.expiresAt > Date.now()) return countryCache.countries;
  const { data } = await ashtechPayRequest<unknown>("/v1/countries");
  const countries = normalizeAshtechCountries(data);
  if (!countries.length) throw new AshtechPayError("Aucun corridor Mobile Money compatible n'est actif.", 503);
  countryCache = { countries, expiresAt: Date.now() + COUNTRY_CACHE_MS };
  return countries;
}

function safePaymentErrorMetadata(error: unknown): Record<string, unknown> {
  const candidate = error && typeof error === "object"
    ? error as { name?: unknown; code?: unknown }
    : undefined;
  const code = typeof candidate?.code === "string" && /^[A-Z0-9_-]{1,32}$/.test(candidate.code)
    ? candidate.code
    : undefined;
  return {
    errorType: error instanceof Error ? error.name : typeof error,
    ...(code ? { errorCode: code } : {}),
    ...(error instanceof AshtechPayError
      ? { upstreamStatus: error.statusCode, outcomeUnknown: error.outcomeUnknown }
      : {}),
  };
}

function sendPaymentError(res: Response, error: unknown, flow: string): void {
  const diagnosticId = randomUUID();
  logger.error({ diagnosticId, flow, ...safePaymentErrorMetadata(error) }, "Ashtechpay payment request failed");

  if (error instanceof AshtechPayError) {
    const status = error.statusCode === 401 || error.statusCode === 403 ? 503 : error.statusCode;
    const message = error.message;
    res.status(status).json({ error: message, diagnosticId });
    return;
  }

  const databaseIssue = getDatabaseIssue(error);
  if (databaseIssue) {
    res.status(503).json({ error: databaseIssue.message, code: databaseIssue.code, diagnosticId });
    return;
  }
  res.status(500).json({
    error: "Impossible de démarrer le paiement pour le moment. Réessayez plus tard.",
    code: "payment_start_failed",
    diagnosticId,
  });
}

function safeWavePaymentUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "pay.wave.com" ? url.toString() : null;
  } catch {
    return null;
  }
}

async function fetchVerifiedTransaction(transactionId: string): Promise<AshtechPayTransaction> {
  const { data } = await ashtechPayRequest<AshtechPayTransaction>(
    `/v1/transaction/${encodeURIComponent(transactionId)}`,
  );
  if (data.transaction_id !== transactionId) {
    throw new AshtechPayError("La réponse de paiement ne correspond pas à la transaction.", 502);
  }
  return data;
}

type PaymentFlow = "international" | "vip";

type PaymentInput = {
  requestId: string;
  amount: number;
  country: AshtechPayCountry;
  operator: string;
  phone: string;
  oneXbetAccountId?: string;
  otp?: string;
  confirmedNoCharge: boolean;
};

async function validatePaymentInput(
  body: Record<string, unknown>,
): Promise<PaymentInput | { error: string }> {
  const requestId = typeof body.requestId === "string" && REQUEST_ID_PATTERN.test(body.requestId)
    ? body.requestId
    : "";
  if (!requestId) return { error: "Identifiant de demande invalide." };

  const countries = await getCountries();
  const countryCode = typeof body.countryCode === "string" ? body.countryCode.toUpperCase() : "";
  const country = countries.find((item) => item.code === countryCode);
  if (!country) return { error: "Pays non disponible avec Ashtechpay." };

  const operator = typeof body.operator === "string" ? country.operators.find((item) => item.code === body.operator) : undefined;
  if (!operator) return { error: "Opérateur non disponible pour ce pays." };

  const phone = normalizeAshtechPhone(body.phone, country);
  if (!phone) {
    return {
      error: `Entrez les ${country.nationalNumberLength} chiffres du numéro local, sans +${country.callingCode}.`,
    };
  }

  const amount = Number(body.amount);
  if (!Number.isSafeInteger(amount) || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
    return { error: `Le montant doit être compris entre ${MIN_AMOUNT} et ${MAX_AMOUNT}.` };
  }

  const otp = typeof body.otp === "string" ? body.otp.trim() : "";
  if (otp && !/^\d{4,8}$/.test(otp)) return { error: "Le code OTP doit contenir entre 4 et 8 chiffres." };

  const oneXbetAccountId = typeof body.oneXbetAccountId === "string" ? body.oneXbetAccountId.trim() : undefined;
  if (oneXbetAccountId !== undefined && (!oneXbetAccountId || oneXbetAccountId.length > 100)) {
    return { error: "Entrez un identifiant de compte 1xBet valide." };
  }

  return {
    requestId,
    amount,
    country,
    operator: operator.code,
    phone,
    ...(oneXbetAccountId ? { oneXbetAccountId } : {}),
    ...(otp ? { otp } : {}),
    confirmedNoCharge: body.confirmedNoCharge === true,
  };
}

function getExistingPaymentResponse(
  orderId: string,
  userId: number,
  prefix: "dep" | "vip",
  providerReference: string | null,
  providerTransactionId: string | null,
  otpUssdCode: string | null,
) {
  const requestId = responseRequestId(orderId, prefix, userId);
  if (getUncertainReference(providerReference)) {
    return {
      status: "confirmation_required",
      transactionId: orderId,
      requestId,
      requiresNoChargeConfirmation: true,
    };
  }
  if (providerReference && !providerTransactionId) {
    return {
      status: "otp_required",
      transactionId: orderId,
      requestId,
      ussdCode: otpUssdCode ?? null,
      otpBySms: !otpUssdCode,
    };
  }
  if (providerTransactionId) {
    return { status: "pending", transactionId: orderId, requestId };
  }
  return null;
}

async function collectPayment(
  req: AuthRequest,
  res: Response,
  flow: PaymentFlow,
): Promise<void> {
  const body = req.body as Record<string, unknown>;
  let input: PaymentInput | { error: string };
  try {
    input = await validatePaymentInput(body);
  } catch (error) {
    sendPaymentError(res, error, flow);
    return;
  }
  if ("error" in input) {
    res.status(400).json({ error: input.error });
    return;
  }
  const userId = req.userId!;
  let orderId = `${flow === "vip" ? "vip" : "dep"}_${userId}_${input.requestId}`;
  let activeRequestId = input.requestId;

  if (flow === "international" && !input.oneXbetAccountId) {
    res.status(400).json({ error: "Entrez un identifiant de compte 1xBet valide." });
    return;
  }

  let pendingDepositId: number | undefined;
  let vipPaymentId: number | undefined;
  let pendingDeposit: typeof pendingSpDepositsTable.$inferSelect | undefined;
  let vipPayment: typeof vipPaymentsTable.$inferSelect | undefined;
  let providerReferenceForAttempt = orderId;
  let providerRequestStarted = false;

  try {
    if (flow === "vip") {
      const [settings] = await db.select().from(appSettingsTable).limit(1);
      const vipPrice = settings ? Number(settings.vipPriceFcfa) : 5000;
      if (!Number.isSafeInteger(vipPrice) || vipPrice < MIN_AMOUNT || vipPrice > MAX_AMOUNT) {
        res.status(503).json({ error: "Le prix VIP n'est pas configuré correctement." });
        return;
      }
      if (input.amount !== vipPrice) {
        res.status(409).json({ error: "Le prix VIP a changé. Actualisez la page avant de réessayer." });
        return;
      }
    }

    if (flow === "international") {
      [pendingDeposit] = await db.select()
        .from(pendingSpDepositsTable)
        .where(and(
          eq(pendingSpDepositsTable.userId, userId),
          eq(pendingSpDepositsTable.paymentProvider, "ashtechpay"),
          eq(pendingSpDepositsTable.externalReference, orderId),
        ))
        .limit(1);

      if (pendingDeposit && (
        Number(pendingDeposit.amount) !== input.amount ||
        pendingDeposit.currency !== input.country.currency ||
        pendingDeposit.payerCountry !== input.country.code ||
        pendingDeposit.oneXbetAccountId !== input.oneXbetAccountId
      )) {
        res.status(409).json({ error: "Cette demande existe déjà avec d'autres informations." });
        return;
      }

      const [otherPending] = await db.select()
        .from(pendingSpDepositsTable)
        .where(and(
          eq(pendingSpDepositsTable.userId, userId),
          eq(pendingSpDepositsTable.paymentProvider, "ashtechpay"),
        ))
        .orderBy(desc(pendingSpDepositsTable.createdAt))
        .limit(1);

      if (!pendingDeposit && otherPending) {
        const existingResponse = getExistingPaymentResponse(
          otherPending.externalReference,
          userId,
          "dep",
          otherPending.providerReference,
          otherPending.providerTransactionId,
          otherPending.otpUssdCode,
        );
        if (existingResponse?.status === "confirmation_required" && input.confirmedNoCharge) {
          pendingDeposit = otherPending;
        } else if (existingResponse) {
          res.json(existingResponse);
          return;
        }
        if (!pendingDeposit && input.confirmedNoCharge) pendingDeposit = otherPending;
        if (pendingDeposit === otherPending && otherPending) {
          if (
            Number(otherPending.amount) !== input.amount ||
            otherPending.currency !== input.country.currency ||
            otherPending.payerCountry !== input.country.code ||
            otherPending.oneXbetAccountId !== input.oneXbetAccountId
          ) {
            res.status(409).json({ error: "Vérifiez d'abord l'ancienne demande avant d'en lancer une nouvelle." });
            return;
          }
          orderId = otherPending.externalReference;
          activeRequestId = responseRequestId(orderId, "dep", userId) ?? activeRequestId;
        }
        if (!pendingDeposit && !input.confirmedNoCharge) {
          res.json({ status: "confirmation_required", requiresNoChargeConfirmation: true });
          return;
        }
      }

      if (!pendingDeposit) {
        [pendingDeposit] = await db.insert(pendingSpDepositsTable).values({
          userId,
          paymentProvider: "ashtechpay",
          externalReference: orderId,
          amount: String(input.amount),
          currency: input.country.currency,
          payerCountry: input.country.code,
          oneXbetAccountId: input.oneXbetAccountId,
        }).returning();
      }
      if (!pendingDeposit) {
        res.status(409).json({ error: "Cette demande de paiement est déjà en cours." });
        return;
      }
      pendingDepositId = pendingDeposit.id;
    } else {
      [vipPayment] = await db.select()
        .from(vipPaymentsTable)
        .where(and(
          eq(vipPaymentsTable.userId, userId),
          eq(vipPaymentsTable.paymentProvider, "ashtechpay"),
          eq(vipPaymentsTable.externalReference, orderId),
        ))
        .limit(1);

      if (vipPayment && (
        Number(vipPayment.amount) !== input.amount ||
        vipPayment.currency !== input.country.currency
      )) {
        res.status(409).json({ error: "Cette demande VIP existe déjà avec d'autres informations." });
        return;
      }

      const [otherPending] = await db.select()
        .from(vipPaymentsTable)
        .where(and(
          eq(vipPaymentsTable.userId, userId),
          eq(vipPaymentsTable.paymentProvider, "ashtechpay"),
          eq(vipPaymentsTable.status, "pending"),
        ))
        .orderBy(desc(vipPaymentsTable.createdAt))
        .limit(1);

      if (!vipPayment && otherPending) {
        const existingResponse = getExistingPaymentResponse(
          otherPending.externalReference ?? "",
          userId,
          "vip",
          otherPending.providerReference,
          otherPending.providerTransactionId,
          otherPending.otpUssdCode,
        );
        if (existingResponse?.status === "confirmation_required" && input.confirmedNoCharge) {
          vipPayment = otherPending;
        } else if (existingResponse) {
          res.json(existingResponse);
          return;
        }
        if (!vipPayment && input.confirmedNoCharge) vipPayment = otherPending;
        if (vipPayment === otherPending && otherPending) {
          if (
            Number(otherPending.amount) !== input.amount ||
            otherPending.currency !== input.country.currency
          ) {
            res.status(409).json({ error: "Vérifiez d'abord l'ancienne demande VIP avant d'en lancer une nouvelle." });
            return;
          }
          orderId = otherPending.externalReference ?? orderId;
          activeRequestId = responseRequestId(orderId, "vip", userId) ?? activeRequestId;
        }
        if (!vipPayment && !input.confirmedNoCharge) {
          res.json({ status: "confirmation_required", requiresNoChargeConfirmation: true });
          return;
        }
      }

      if (!vipPayment) {
        [vipPayment] = await db.insert(vipPaymentsTable).values({
          userId,
          paymentProvider: "ashtechpay",
          externalReference: orderId,
          amount: String(input.amount),
          currency: input.country.currency,
          status: "pending",
        }).returning();
      }
      if (!vipPayment) {
        res.status(409).json({ error: "Cette demande VIP est déjà en cours." });
        return;
      }
      vipPaymentId = vipPayment.id;
      if (vipPayment.status === "completed") {
        res.json({ status: "success", transactionId: orderId });
        return;
      }
      if (vipPayment.status !== "pending") {
        res.status(409).json({ error: "Cette demande VIP n'est plus en attente. Recommencez le paiement." });
        return;
      }
    }

    const savedProviderReference = flow === "vip"
      ? vipPayment?.providerReference
      : pendingDeposit?.providerReference;
    const retryingUnknownOutcome = getUncertainReference(savedProviderReference) !== undefined;
    providerReferenceForAttempt = getUncertainReference(savedProviderReference)
      ?? savedProviderReference
      ?? orderId;
    const savedTransactionId = flow === "vip"
      ? vipPayment?.providerTransactionId
      : pendingDeposit?.providerTransactionId;
    const savedUssdCode = flow === "vip" ? vipPayment?.otpUssdCode : pendingDeposit?.otpUssdCode;

    if (savedTransactionId) {
      const response = getExistingPaymentResponse(
        orderId,
        userId,
        flow === "vip" ? "vip" : "dep",
        savedProviderReference ?? null,
        savedTransactionId,
        savedUssdCode ?? null,
      );
      res.json(response ?? { status: "pending", transactionId: orderId });
      return;
    }

    if (retryingUnknownOutcome && !input.confirmedNoCharge) {
      res.json({
        status: "confirmation_required",
        transactionId: orderId,
        requestId: activeRequestId,
        requiresNoChargeConfirmation: true,
      });
      return;
    }

    if (savedProviderReference && !retryingUnknownOutcome && !input.otp) {
      res.json({
        status: "otp_required",
        transactionId: orderId,
        requestId: activeRequestId,
        ussdCode: savedUssdCode ?? null,
        otpBySms: !savedUssdCode,
      });
      return;
    }

    const apiKey = getAshtechPayApiKey();
    const notifyUrl = getAshtechPayWebhookUrl();
    const inFlightReference = uncertainReference(IN_FLIGHT_PREFIX, providerReferenceForAttempt);
    if (flow === "vip" && vipPayment) {
      await db.update(vipPaymentsTable)
        .set({ providerReference: inFlightReference, updatedAt: new Date() })
        .where(eq(vipPaymentsTable.id, vipPayment.id));
    } else if (pendingDeposit) {
      await db.update(pendingSpDepositsTable)
        .set({ providerReference: inFlightReference })
        .where(eq(pendingSpDepositsTable.id, pendingDeposit.id));
    }
    const payload: Record<string, unknown> = {
      amount: input.amount,
      currency: input.country.currency,
      phone: input.phone,
      operator: input.operator,
      country_code: input.country.code,
      reference: providerReferenceForAttempt,
      ...(notifyUrl ? { notify_url: notifyUrl } : {}),
      ...(input.otp ? { otp: input.otp } : {}),
    };

    providerRequestStarted = true;
    const result = await ashtechPayRequest<AshtechPayTransaction>("/v1/collect", apiKey, {
      method: "POST",
      body: payload,
    });
    const response = result.data;

    if (result.status === 400 && response.error === "otp_required") {
      if (!response.reference) {
        throw new AshtechPayError("La réponse OTP est incomplète; aucun nouvel essai automatique n'a été lancé.", 502, true);
      }
      const ussdCode = typeof response.ussd_code === "string" ? response.ussd_code : null;
      if (flow === "vip" && vipPayment) {
        await db.update(vipPaymentsTable)
          .set({ providerReference: response.reference, otpUssdCode: ussdCode, updatedAt: new Date() })
          .where(eq(vipPaymentsTable.id, vipPayment.id));
      } else if (pendingDeposit) {
        await db.update(pendingSpDepositsTable)
          .set({ providerReference: response.reference, otpUssdCode: ussdCode })
          .where(eq(pendingSpDepositsTable.id, pendingDeposit.id));
      }
      res.json({
        status: "otp_required",
        transactionId: orderId,
        requestId: activeRequestId,
        ussdCode,
        otpBySms: !ussdCode,
      });
      return;
    }

    const normalizedStatus = normalizeAshtechStatus(response.status ?? "pending");
    const transactionId = typeof response.transaction_id === "string" ? response.transaction_id : "";
    const providerReference = typeof response.reference === "string"
      ? response.reference
      : providerReferenceForAttempt;

    if (!transactionId && normalizedStatus !== "success") {
      throw new AshtechPayError("Ashtechpay n'a pas renvoyé l'identifiant de transaction.", 502, true);
    }

    if (flow === "vip" && vipPayment) {
      await db.update(vipPaymentsTable)
        .set({
          providerReference,
          providerTransactionId: transactionId || null,
          otpUssdCode: null,
          updatedAt: new Date(),
        })
        .where(eq(vipPaymentsTable.id, vipPayment.id));
    } else if (pendingDeposit) {
      await db.update(pendingSpDepositsTable)
        .set({
          providerReference,
          providerTransactionId: transactionId || null,
          otpUssdCode: null,
        })
        .where(eq(pendingSpDepositsTable.id, pendingDeposit.id));
    }

    if (normalizedStatus === "success") {
      await settleAshtechPayPayment({
        ...response,
        reference: providerReference,
        transaction_id: transactionId,
        status: response.status,
        amount: response.total_amount ?? response.amount ?? input.amount,
        total_amount: response.total_amount,
        currency: response.currency ?? input.country.currency,
        country_code: response.country_code ?? input.country.code,
        operator: response.operator ?? input.operator,
      });
      res.json({ status: "success", transactionId: orderId });
      return;
    }

    const waveUrl = safeWavePaymentUrl(response.wave_url);
    res.json({
      status: "pending",
      transactionId: orderId,
      requestId: activeRequestId,
      type: waveUrl ? "wave" : "ussd_push",
      ...(waveUrl ? { paymentUrl: waveUrl } : {}),
    });
  } catch (error) {
    const outcomeUnknown = (error instanceof AshtechPayError && error.outcomeUnknown) ||
      (providerRequestStarted && !(error instanceof AshtechPayError));
    if (outcomeUnknown) {
      const uncertainRef = uncertainReference(UNKNOWN_OUTCOME_PREFIX, providerReferenceForAttempt);
      if (pendingDepositId) {
        await db.update(pendingSpDepositsTable)
          .set({ providerReference: uncertainRef })
          .where(eq(pendingSpDepositsTable.id, pendingDepositId))
          .catch(() => undefined);
      }
      if (vipPaymentId) {
        await db.update(vipPaymentsTable)
          .set({ providerReference: uncertainRef, updatedAt: new Date() })
          .where(eq(vipPaymentsTable.id, vipPaymentId))
          .catch(() => undefined);
      }
    } else if (pendingDepositId) {
      const unknownRef = uncertainReference(UNKNOWN_OUTCOME_PREFIX, providerReferenceForAttempt);
      const inFlightRef = uncertainReference(IN_FLIGHT_PREFIX, providerReferenceForAttempt);
      await db.update(pendingSpDepositsTable)
        .set({ providerReference: null })
        .where(and(
          eq(pendingSpDepositsTable.id, pendingDepositId),
          or(
            eq(pendingSpDepositsTable.providerReference, unknownRef),
            eq(pendingSpDepositsTable.providerReference, inFlightRef),
          ),
        ))
        .catch(() => undefined);
      await db.delete(pendingSpDepositsTable)
        .where(and(
          eq(pendingSpDepositsTable.id, pendingDepositId),
          isNull(pendingSpDepositsTable.providerReference),
          isNull(pendingSpDepositsTable.providerTransactionId),
        ))
        .catch(() => undefined);
    }
    if (!outcomeUnknown && vipPaymentId) {
      const unknownRef = uncertainReference(UNKNOWN_OUTCOME_PREFIX, providerReferenceForAttempt);
      const inFlightRef = uncertainReference(IN_FLIGHT_PREFIX, providerReferenceForAttempt);
      await db.update(vipPaymentsTable)
        .set({ providerReference: null })
        .where(and(
          eq(vipPaymentsTable.id, vipPaymentId),
          or(
            eq(vipPaymentsTable.providerReference, unknownRef),
            eq(vipPaymentsTable.providerReference, inFlightRef),
          ),
        ))
        .catch(() => undefined);
      await db.update(vipPaymentsTable)
        .set({ status: "failed", updatedAt: new Date() })
        .where(and(
          eq(vipPaymentsTable.id, vipPaymentId),
          eq(vipPaymentsTable.status, "pending"),
          isNull(vipPaymentsTable.providerReference),
          isNull(vipPaymentsTable.providerTransactionId),
        ))
        .catch(() => undefined);
    }
    if (outcomeUnknown) {
      const diagnosticId = randomUUID();
      logger.error(
        { diagnosticId, flow, ...safePaymentErrorMetadata(error) },
        "Ashtechpay payment outcome is unknown; waiting for user confirmation before retry",
      );
      res.json({
        status: "confirmation_required",
        requiresNoChargeConfirmation: true,
        transactionId: orderId,
        requestId: activeRequestId,
        diagnosticId,
      });
      return;
    }
    sendPaymentError(res, error, flow);
  }
}

router.get("/ashtechpay/countries", requireAuth, async (_req: AuthRequest, res): Promise<void> => {
  try {
    res.json(await getCountries());
  } catch (error) {
    sendPaymentError(res, error, "countries");
  }
});

router.post("/ashtechpay/collect", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  await collectPayment(req, res, "international");
});

router.post("/ashtechpay/collect-vip", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  await collectPayment(req, res, "vip");
});

async function resolveOrderStatus(
  userId: number,
  reference: string,
): Promise<{ status: string; transactionId: string; requestId?: string; ussdCode?: string | null } | null> {
  const [pendingDeposit] = await db.select()
    .from(pendingSpDepositsTable)
    .where(and(
      eq(pendingSpDepositsTable.userId, userId),
      eq(pendingSpDepositsTable.paymentProvider, "ashtechpay"),
      or(
        eq(pendingSpDepositsTable.externalReference, reference),
        eq(pendingSpDepositsTable.providerReference, reference),
        eq(pendingSpDepositsTable.providerTransactionId, reference),
      ),
    ))
    .limit(1);
  const [deposit] = await db.select()
    .from(depositsTable)
    .where(and(
      eq(depositsTable.userId, userId),
      eq(depositsTable.paymentProvider, "ashtechpay"),
      or(
        eq(depositsTable.providerReference, reference),
        eq(depositsTable.referenceId, reference),
      ),
    ))
    .limit(1);
  const [vipPayment] = await db.select()
    .from(vipPaymentsTable)
    .where(and(
      eq(vipPaymentsTable.userId, userId),
      eq(vipPaymentsTable.paymentProvider, "ashtechpay"),
      or(
        eq(vipPaymentsTable.externalReference, reference),
        eq(vipPaymentsTable.providerReference, reference),
        eq(vipPaymentsTable.providerTransactionId, reference),
      ),
    ))
    .limit(1);

  if (deposit && !pendingDeposit) {
    return {
      status: deposit.status === "validated" || deposit.status === "pending" ? "success" : "failed",
      transactionId: reference,
    };
  }
  if (vipPayment && vipPayment.status !== "pending") {
    return {
      status: vipPayment.status === "completed" ? "success" : "failed",
      transactionId: reference,
    };
  }

  const order = pendingDeposit ?? vipPayment;
  if (!order) return null;
  const transactionId = pendingDeposit?.providerTransactionId ?? vipPayment?.providerTransactionId;
  const providerReference = pendingDeposit?.providerReference ?? vipPayment?.providerReference;
  if (!transactionId) {
    const orderId = pendingDeposit?.externalReference ?? vipPayment?.externalReference ?? reference;
    const prefix = pendingDeposit ? "dep" : "vip";
    const uncertain = getUncertainReference(providerReference) !== undefined;
    return {
      status: uncertain ? "confirmation_required" : providerReference ? "otp_required" : "pending",
      transactionId: orderId,
      requestId: responseRequestId(orderId, prefix, userId),
      ...(uncertain ? { requiresNoChargeConfirmation: true } : {}),
      ussdCode: pendingDeposit?.otpUssdCode ?? vipPayment?.otpUssdCode ?? null,
    };
  }

  const response = await fetchVerifiedTransaction(transactionId);
  if (
    providerReference &&
    response.reference &&
    response.reference !== providerReference
  ) {
    throw new AshtechPayError("La référence de la transaction ne correspond pas à la demande.", 502);
  }
  await settleAshtechPayPayment({
    ...response,
    status: normalizeAshtechStatus(response.status ?? "pending"),
  });
  return {
    status: normalizeAshtechStatus(response.status ?? "pending"),
    transactionId: pendingDeposit?.externalReference ?? vipPayment?.externalReference ?? reference,
  };
}

router.get("/ashtechpay/status/:reference", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const reference = Array.isArray(req.params.reference) ? req.params.reference[0] : req.params.reference;
  if (!reference || reference.length > 128) {
    res.status(400).json({ error: "Référence de paiement invalide." });
    return;
  }
  try {
    const status = await resolveOrderStatus(req.userId!, reference);
    if (!status) {
      res.status(404).json({ error: "Paiement introuvable." });
      return;
    }
    res.json(status);
  } catch (error) {
    sendPaymentError(res, error, "status_check");
  }
});

type AshtechPayWebhookPayload = {
  event?: string;
  transaction_id?: string;
  reference?: string;
};

export async function reconcileAshtechPayWebhook(payload: AshtechPayWebhookPayload): Promise<void> {
  if (payload.event !== "payment.completed" && payload.event !== "payment.failed") return;
  if (!payload.transaction_id) throw new Error("Webhook is missing transaction_id");
  const transaction = await fetchVerifiedTransaction(payload.transaction_id);
  if (payload.reference && transaction.reference !== payload.reference) {
    throw new Error("Webhook reference does not match the provider status");
  }
  await settleAshtechPayPayment(transaction);
  logger.info(
    { event: payload.event, transactionId: payload.transaction_id },
    "Ashtechpay callback reconciled with the live transaction status",
  );
}

export default router;
