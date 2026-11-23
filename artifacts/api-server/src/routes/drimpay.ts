import { Router, type IRouter, type Response } from "express";
import { and, eq, or } from "drizzle-orm";
import {
  db,
  appSettingsTable,
  depositsTable,
  pendingSpDepositsTable,
  usersTable,
  vipPaymentsTable,
} from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { logger } from "../lib/logger.js";
import {
  DRIMPAY_COUNTRIES,
  DrimPayError,
  type DrimPayCountry,
  type DrimPayOperator,
  drimPayRequest,
  findDrimPayOperator,
  getDrimPayApiKey,
  getDrimPayWebhookUrl,
  normalizeDrimPayStatus,
} from "../lib/drimpay.js";
import { settleDrimPayPayment, type DrimPayPaymentEvent } from "../lib/drimpay-settlement.js";

const router: IRouter = Router();

const REQUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MIN_AMOUNT = 50;
const MAX_AMOUNT = 1_000_000;

type DrimPayTransactionResponse = DrimPayPaymentEvent & {
  payment_url?: string;
  expires_at?: string;
};

function getRequestId(value: unknown): string | null {
  return typeof value === "string" && REQUEST_ID_PATTERN.test(value) ? value : null;
}

function validatePaymentInput(body: Record<string, unknown>): {
  country: (typeof DRIMPAY_COUNTRIES)[number];
  operator: NonNullable<ReturnType<typeof findDrimPayOperator>>;
  phone: string;
  amount: number;
  operatorOtp?: string;
} | { error: string } {
  const countryCode = typeof body.countryCode === "string" ? body.countryCode.toUpperCase() : "";
  const country = DRIMPAY_COUNTRIES.find((item: DrimPayCountry) => item.code === countryCode);
  if (!country) return { error: "Pays non disponible avec DrimPay." };

  const operatorCode = typeof body.operator === "string" ? body.operator : "";
  const operator = findDrimPayOperator(country.code, operatorCode);
  if (!operator) return { error: "Opérateur non disponible pour ce pays." };

  const phone = typeof body.phone === "string" ? body.phone.replace(/[ .()-]/g, "") : "";
  if (!/^\+[1-9]\d{7,14}$/.test(phone) || !phone.startsWith(`+${country.callingCode}`)) {
    return { error: `Entrez un numéro au format international +${country.callingCode}…` };
  }

  const amount = Number(body.amount);
  if (!Number.isSafeInteger(amount) || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
    return { error: `Le montant doit être compris entre ${MIN_AMOUNT} et ${MAX_AMOUNT} FCFA.` };
  }

  const operatorOtp = typeof body.operatorOtp === "string" ? body.operatorOtp.trim() : "";
  if (operator.requiresOtp && !operatorOtp) {
    return { error: "Le code OTP Orange Money est requis pour cet opérateur." };
  }
  if (operatorOtp && !/^\d{4,8}$/.test(operatorOtp)) {
    return { error: "Le code OTP doit contenir entre 4 et 8 chiffres." };
  }

  return { country, operator, phone, amount, ...(operatorOtp ? { operatorOtp } : {}) };
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
    ...(error instanceof DrimPayError
      ? { upstreamStatus: error.statusCode, outcomeUnknown: error.outcomeUnknown }
      : {}),
  };
}

function logPaymentFailure(flow: string, error: unknown): void {
  const metadata = { flow, ...safePaymentErrorMetadata(error) };
  if (error instanceof DrimPayError && error.statusCode < 500) {
    logger.warn(metadata, "DrimPay payment request was rejected");
  } else {
    logger.error(metadata, "DrimPay payment request failed");
  }
}

function isPaymentOutcomeUnknown(error: unknown, providerRequestStarted: boolean): boolean {
  return error instanceof DrimPayError ? error.outcomeUnknown : providerRequestStarted;
}

function respondWithPendingPayment(res: Response, flow: string, orderId: string, error: unknown): void {
  logger.warn(
    { flow, ...safePaymentErrorMetadata(error) },
    "DrimPay outcome is uncertain; payment remains pending",
  );
  res.json({
    type: "ussd_push",
    transactionId: orderId,
    status: "pending",
    confirmationPending: true,
  });
}

function sendPaymentError(res: Response, error: unknown, flow: string): void {
  logPaymentFailure(flow, error);
  if (error instanceof DrimPayError) {
    const drimPayError = error as DrimPayError;
    const status = drimPayError.statusCode === 401 || drimPayError.statusCode === 403 ? 503 : drimPayError.statusCode;
    res.status(status).json({ error: status === 503 && drimPayError.statusCode !== 503
      ? "La clé DrimPay est refusée ou indisponible."
      : drimPayError.message });
    return;
  }
  res.status(500).json({ error: "Impossible de démarrer le paiement pour le moment. Réessayez plus tard." });
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

async function initiatePayment(
  payload: Record<string, unknown>,
  apiKey: string,
): Promise<DrimPayTransactionResponse> {
  return drimPayRequest<DrimPayTransactionResponse>("/payin/initiate", apiKey, {
    method: "POST",
    body: payload,
  });
}

router.get("/drimpay/countries", (_req, res): void => {
  res.json(DRIMPAY_COUNTRIES.map((country: DrimPayCountry) => ({
    ...country,
    operators: country.operators.map((operator: DrimPayOperator) => ({
      ...operator,
      ...(operator.requiresOtp ? {
        otpInstructions: country.code === "BF"
          ? "Composez *144*4*6*montant# pour recevoir votre code OTP."
          : country.code === "ML"
            ? "Composez #144#, choisissez Paiement marchand (option 2), puis validez."
            : "Composez #144*82# pour générer votre code OTP.",
      } : {}),
    })),
  })));
});

router.post("/drimpay/collect", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const requestId = getRequestId(body.requestId);
  if (!requestId) {
    res.status(400).json({ error: "Identifiant de demande invalide." });
    return;
  }

  const input = validatePaymentInput(body);
  if ("error" in input) {
    res.status(400).json({ error: input.error });
    return;
  }

  const oneXbetAccountId = typeof body.oneXbetAccountId === "string" ? body.oneXbetAccountId.trim() : "";
  if (!oneXbetAccountId || oneXbetAccountId.length > 100) {
    res.status(400).json({ error: "Entrez un identifiant de compte 1xBet valide." });
    return;
  }

  const orderId = `dep_${req.userId}_${requestId}`;
  let pendingId: number | undefined;
  let shouldInitiate = false;
  let providerRequestStarted = false;
  try {
    const [completedDeposit] = await db
      .select()
      .from(depositsTable)
      .where(and(eq(depositsTable.userId, req.userId!), eq(depositsTable.referenceId, orderId)))
      .limit(1);
    if (completedDeposit) {
      res.json({ type: "ussd_push", transactionId: completedDeposit.drimpayReference, status: "success" });
      return;
    }

    let [pending] = await db
      .select()
      .from(pendingSpDepositsTable)
      .where(and(
        eq(pendingSpDepositsTable.userId, req.userId!),
        eq(pendingSpDepositsTable.externalReference, orderId),
      ))
      .limit(1);

    if (pending && (
      Number(pending.amount) !== input.amount ||
      pending.currency !== input.country.currency ||
      pending.payerCountry !== input.country.code ||
      pending.oneXbetAccountId !== oneXbetAccountId
    )) {
      res.status(409).json({ error: "Cette demande de paiement existe déjà avec d'autres informations." });
      return;
    }

    if (!pending) {
      [pending] = await db.insert(pendingSpDepositsTable).values({
        userId: req.userId!,
        drimpayReference: orderId,
        externalReference: orderId,
        amount: String(input.amount),
        currency: input.country.currency,
        payerCountry: input.country.code,
        oneXbetAccountId,
      }).onConflictDoNothing().returning();
      if (pending) shouldInitiate = true;

      if (!pending) {
        [pending] = await db
          .select()
          .from(pendingSpDepositsTable)
          .where(eq(pendingSpDepositsTable.drimpayReference, orderId))
          .limit(1);
      }
    }

    if (!pending) {
      res.status(409).json({ error: "Cette demande de paiement est déjà en cours." });
      return;
    }
    pendingId = pending.id;

    if (!shouldInitiate) {
      res.json({
        type: "ussd_push",
        transactionId: pending.drimpayReference,
        status: "pending",
        confirmationPending: pending.drimpayReference === orderId,
      });
      return;
    }

    const apiKey = getDrimPayApiKey();
    const webhookUrl = getDrimPayWebhookUrl();
    providerRequestStarted = true;
    const response = await initiatePayment({
      amount: input.amount,
      currency: input.country.currency,
      country_code: input.country.code,
      operator: input.operator.code,
      phone: input.phone,
      order_id: orderId,
      webhook_url: webhookUrl,
      description: "Dépôt international Muzan",
      expires_in_minutes: 5,
      metadata: { flow: "international_deposit" },
      ...(input.operatorOtp ? { operator_otp: input.operatorOtp } : {}),
    }, apiKey);

    if (!response.reference || response.order_id !== orderId) {
      logger.error({ flow: "international_deposit", issue: "response_mismatch" }, "DrimPay returned an unmatchable payment response");
      respondWithPendingPayment(res, "international_deposit", orderId, new Error("DrimPay response mismatch"));
      return;
    }

    const paymentEvent: DrimPayPaymentEvent = {
      ...response,
      status: response.status,
      country_code: response.country_code ?? input.country.code,
      currency: response.currency ?? input.country.currency,
      amount: response.amount ?? input.amount,
      operator: response.operator ?? input.operator.code,
    };
    await db.update(pendingSpDepositsTable)
      .set({ drimpayReference: response.reference })
      .where(eq(pendingSpDepositsTable.id, pending.id));

    if (normalizeDrimPayStatus(response.status ?? "pending") === "success") {
      await settleDrimPayPayment(paymentEvent);
    }

    const paymentUrl = safeWavePaymentUrl(response.payment_url);
    res.json({
      type: paymentUrl ? "wave" : "ussd_push",
      transactionId: response.reference,
      status: normalizeDrimPayStatus(response.status ?? "pending"),
      ...(paymentUrl ? { paymentUrl } : {}),
      ...(response.expires_at ? { expiresAt: response.expires_at } : {}),
    });
  } catch (error) {
    const outcomeUnknown = isPaymentOutcomeUnknown(error, providerRequestStarted);
    if (pendingId && !providerRequestStarted) {
      await db.delete(pendingSpDepositsTable)
        .where(eq(pendingSpDepositsTable.id, pendingId))
        .catch(() => undefined);
    }
    if (pendingId && drimPayError && drimPayError.statusCode < 500) {
      await db.delete(pendingSpDepositsTable)
        .where(eq(pendingSpDepositsTable.id, pendingId))
        .catch(() => undefined);
    }
    if (outcomeUnknown) {
      respondWithPendingPayment(res, "international_deposit", orderId, error);
      return;
    }
    sendPaymentError(res, error, "international_deposit");
  }
});

router.post("/drimpay/collect-vip", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const requestId = getRequestId(body.requestId);
  if (!requestId) {
    res.status(400).json({ error: "Identifiant de demande invalide." });
    return;
  }

  const input = validatePaymentInput(body);
  if ("error" in input) {
    res.status(400).json({ error: input.error });
    return;
  }

  const user = req.user!;
  if (user.isVip) {
    res.status(400).json({ error: "Vous êtes déjà VIP." });
    return;
  }

  const [settings] = await db.select().from(appSettingsTable).limit(1);
  const vipPrice = settings ? Number(settings.vipPriceFcfa) : 5000;
  if (!Number.isSafeInteger(vipPrice) || vipPrice < MIN_AMOUNT || vipPrice > MAX_AMOUNT) {
    res.status(503).json({ error: "Le prix VIP n'est pas configuré correctement pour DrimPay." });
    return;
  }
  if (input.amount !== vipPrice) {
    res.status(409).json({ error: "Le prix VIP a changé. Actualisez la page avant de réessayer." });
    return;
  }

  const orderId = `vip_${req.userId}_${requestId}`;
  let vipPaymentId: number | undefined;
  let shouldInitiate = false;
  let providerRequestStarted = false;
  let pendingReference = orderId;
  try {
    let [vipPayment] = await db
      .select()
      .from(vipPaymentsTable)
      .where(eq(vipPaymentsTable.drimpayOrderId, orderId))
      .limit(1);

    if (vipPayment && (
      Number(vipPayment.amount) !== vipPrice ||
      vipPayment.currency !== input.country.currency ||
      vipPayment.userId !== req.userId
    )) {
      res.status(409).json({ error: "Cette demande de paiement VIP existe déjà avec d'autres informations." });
      return;
    }

    if (!vipPayment) {
      [vipPayment] = await db.insert(vipPaymentsTable).values({
        userId: req.userId!,
        drimpayReference: orderId,
        drimpayOrderId: orderId,
        amount: String(vipPrice),
        currency: input.country.currency,
        status: "pending",
      }).onConflictDoNothing().returning();
      if (vipPayment) shouldInitiate = true;

      if (!vipPayment) {
        [vipPayment] = await db.select()
          .from(vipPaymentsTable)
          .where(eq(vipPaymentsTable.drimpayOrderId, orderId))
          .limit(1);
      }
    }

    if (!vipPayment) {
      res.status(409).json({ error: "Cette demande de paiement VIP est déjà en cours." });
      return;
    }
    vipPaymentId = vipPayment.id;

    if (vipPayment.status === "completed") {
      res.json({ type: "ussd_push", transactionId: vipPayment.drimpayReference, status: "success" });
      return;
    }
    if (vipPayment.status !== "pending") {
      res.status(409).json({ error: "Cette demande VIP n'est plus en attente. Recommencez le paiement." });
      return;
    }
    if (!shouldInitiate) {
      res.json({
        type: "ussd_push",
        transactionId: vipPayment.drimpayReference ?? orderId,
        status: "pending",
        confirmationPending: vipPayment.drimpayReference === orderId,
      });
      return;
    }

    const apiKey = getDrimPayApiKey();
    const webhookUrl = getDrimPayWebhookUrl();
    providerRequestStarted = true;
    const response = await initiatePayment({
      amount: vipPrice,
      currency: input.country.currency,
      country_code: input.country.code,
      operator: input.operator.code,
      phone: input.phone,
      order_id: orderId,
      webhook_url: webhookUrl,
      description: "Paiement de l'accès VIP Muzan",
      expires_in_minutes: 5,
      metadata: { flow: "vip" },
      ...(input.operatorOtp ? { operator_otp: input.operatorOtp } : {}),
    }, apiKey);

    if (!response.reference || response.order_id !== orderId) {
      logger.error({ flow: "vip", issue: "response_mismatch" }, "DrimPay returned an unmatchable payment response");
      respondWithPendingPayment(res, "vip", orderId, new Error("DrimPay response mismatch"));
      return;
    }

    pendingReference = response.reference;
    await db.update(vipPaymentsTable)
      .set({ drimpayReference: response.reference, updatedAt: new Date() })
      .where(eq(vipPaymentsTable.id, vipPayment.id));

    const paymentEvent: DrimPayPaymentEvent = {
      ...response,
      status: response.status,
      country_code: response.country_code ?? input.country.code,
      currency: response.currency ?? input.country.currency,
      amount: response.amount ?? vipPrice,
      operator: response.operator ?? input.operator.code,
    };
    if (normalizeDrimPayStatus(response.status ?? "pending") === "success") {
      await settleDrimPayPayment(paymentEvent);
    }

    const paymentUrl = safeWavePaymentUrl(response.payment_url);
    res.json({
      type: paymentUrl ? "wave" : "ussd_push",
      transactionId: response.reference,
      status: normalizeDrimPayStatus(response.status ?? "pending"),
      ...(paymentUrl ? { paymentUrl } : {}),
      ...(response.expires_at ? { expiresAt: response.expires_at } : {}),
    });
  } catch (error) {
    const drimPayError = error instanceof DrimPayError ? error as DrimPayError : null;
    const outcomeUnknown = isPaymentOutcomeUnknown(error, providerRequestStarted);
    if (vipPaymentId && !outcomeUnknown) {
      await db.update(vipPaymentsTable)
        .set({ status: "failed", updatedAt: new Date() })
        .where(and(eq(vipPaymentsTable.id, vipPaymentId), eq(vipPaymentsTable.status, "pending")))
        .catch(() => undefined);
    }
    if (outcomeUnknown) {
      if (vipPaymentId && pendingReference !== orderId) {
        await db.update(vipPaymentsTable)
          .set({ drimpayReference: pendingReference, updatedAt: new Date() })
          .where(eq(vipPaymentsTable.id, vipPaymentId))
          .catch(() => undefined);
      }
      respondWithPendingPayment(res, "vip", orderId, error);
      return;
    }
    sendPaymentError(res, error, "vip");
  }
});

router.get("/drimpay/status/:reference", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const reference = Array.isArray(req.params.reference) ? req.params.reference[0] : req.params.reference;
  if (!reference || reference.length > 128) {
    res.status(400).json({ error: "Référence DrimPay invalide." });
    return;
  }

  try {
    const [pendingDeposit] = await db.select()
      .from(pendingSpDepositsTable)
      .where(and(
        eq(pendingSpDepositsTable.userId, req.userId!),
        or(
          eq(pendingSpDepositsTable.drimpayReference, reference),
          eq(pendingSpDepositsTable.externalReference, reference),
        ),
      ))
      .limit(1);
    const [deposit] = await db.select()
      .from(depositsTable)
      .where(and(
        eq(depositsTable.userId, req.userId!),
        or(
          eq(depositsTable.drimpayReference, reference),
          eq(depositsTable.referenceId, reference),
        ),
      ))
      .limit(1);
    const [vipPayment] = await db.select()
      .from(vipPaymentsTable)
      .where(and(
        eq(vipPaymentsTable.userId, req.userId!),
        or(
          eq(vipPaymentsTable.drimpayReference, reference),
          eq(vipPaymentsTable.drimpayOrderId, reference),
        ),
      ))
      .limit(1);

    if (!pendingDeposit && !deposit && !vipPayment) {
      res.status(404).json({ error: "Paiement introuvable." });
      return;
    }

    if (deposit && !pendingDeposit) {
      res.json({
        status: deposit.status === "rejected" && deposit.rejectionReason?.includes("DrimPay")
          ? "reversed"
          : deposit.status === "validated" || deposit.status === "pending"
            ? "success"
            : "failed",
        transactionId: reference,
      });
      return;
    }
    if (vipPayment && vipPayment.status !== "pending") {
      res.json({
        status: vipPayment.status === "completed" ? "success" : vipPayment.status === "reversed" ? "reversed" : "failed",
        transactionId: reference,
      });
      return;
    }

    const storedOrderId = pendingDeposit?.externalReference ?? vipPayment?.drimpayOrderId;
    const isOrderId = storedOrderId === reference;
    const providerReference = pendingDeposit?.drimpayReference ?? vipPayment?.drimpayReference ?? reference;
    if (isOrderId && providerReference === reference) {
      res.json({ status: "pending", transactionId: reference });
      return;
    }

    const response = await drimPayRequest<DrimPayTransactionResponse>(
      `/payin/${encodeURIComponent(providerReference)}`,
      getDrimPayApiKey(),
    );
    if (response.reference !== providerReference) {
      res.status(502).json({ error: "La réponse DrimPay ne correspond pas à cette demande." });
      return;
    }

    if (storedOrderId && response.order_id !== storedOrderId) {
      res.status(502).json({ error: "La réponse DrimPay ne correspond pas à cette demande." });
      return;
    }

    const paymentEvent: DrimPayPaymentEvent = {
      ...response,
      event: response.status ? `payin.${response.status}` : undefined,
    };
    await settleDrimPayPayment(paymentEvent);
    res.json({
      status: normalizeDrimPayStatus(response.status ?? "pending"),
      transactionId: providerReference,
    });
  } catch (error) {
    if (isPaymentOutcomeUnknown(error, true)) {
      logger.debug(
        { flow: "status_check", ...safePaymentErrorMetadata(error) },
        "DrimPay status is temporarily unavailable; keeping payment pending",
      );
      res.json({ status: "pending", transactionId: reference });
      return;
    }
    sendPaymentError(res, error, "status_check");
  }
});

export default router;
