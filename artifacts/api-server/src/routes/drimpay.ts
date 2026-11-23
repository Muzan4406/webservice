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
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import {
  DRIMPAY_COUNTRIES,
  DrimPayError,
  drimPayRequest,
  findDrimPayOperator,
  getDrimPayApiKey,
  getDrimPayWebhookUrl,
  normalizeDrimPayStatus,
} from "../lib/drimpay";
import { settleDrimPayPayment, type DrimPayPaymentEvent } from "../lib/drimpay-settlement";

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
  const country = DRIMPAY_COUNTRIES.find((item) => item.code === countryCode);
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

function sendPaymentError(res: Response, error: unknown): void {
  if (error instanceof DrimPayError) {
    const status = error.statusCode === 401 || error.statusCode === 403 ? 503 : error.statusCode;
    res.status(status).json({ error: status === 503 && error.statusCode !== 503
      ? "La clé DrimPay est refusée ou indisponible."
      : error.message });
    return;
  }
  res.status(500).json({ error: "Impossible de traiter le paiement pour le moment." });
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

async function initiatePayment(payload: Record<string, unknown>): Promise<DrimPayTransactionResponse> {
  return drimPayRequest<DrimPayTransactionResponse>("/payin/initiate", getDrimPayApiKey(), {
    method: "POST",
    body: payload,
  });
}

router.get("/drimpay/countries", (_req, res): void => {
  res.json(DRIMPAY_COUNTRIES.map((country) => ({
    ...country,
    operators: country.operators.map((operator) => ({
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

    const response = await initiatePayment({
      amount: input.amount,
      currency: input.country.currency,
      country_code: input.country.code,
      operator: input.operator.code,
      phone: input.phone,
      order_id: orderId,
      webhook_url: getDrimPayWebhookUrl(),
      description: `Dépôt Muzan - compte ${oneXbetAccountId}`,
      expires_in_minutes: 5,
      metadata: { user_id: req.userId, flow: "international_deposit" },
      ...(input.operatorOtp ? { operator_otp: input.operatorOtp } : {}),
    });

    if (!response.reference || response.order_id !== orderId) {
      res.status(502).json({ error: "La réponse DrimPay ne correspond pas à cette demande." });
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
    if (pendingId && error instanceof DrimPayError && error.statusCode < 500) {
      await db.delete(pendingSpDepositsTable)
        .where(eq(pendingSpDepositsTable.id, pendingId))
        .catch(() => undefined);
    }
    sendPaymentError(res, error);
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

    const response = await initiatePayment({
      amount: vipPrice,
      currency: input.country.currency,
      country_code: input.country.code,
      operator: input.operator.code,
      phone: input.phone,
      order_id: orderId,
      webhook_url: getDrimPayWebhookUrl(),
      description: "Paiement de l'accès VIP Muzan",
      expires_in_minutes: 5,
      metadata: { user_id: req.userId, flow: "vip" },
      ...(input.operatorOtp ? { operator_otp: input.operatorOtp } : {}),
    });

    if (!response.reference || response.order_id !== orderId) {
      res.status(502).json({ error: "La réponse DrimPay ne correspond pas à cette demande." });
      return;
    }

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
    if (vipPaymentId && error instanceof DrimPayError && error.statusCode < 500) {
      await db.update(vipPaymentsTable)
        .set({ status: "failed", updatedAt: new Date() })
        .where(and(eq(vipPaymentsTable.id, vipPaymentId), eq(vipPaymentsTable.status, "pending")))
        .catch(() => undefined);
    }
    sendPaymentError(res, error);
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
        eq(pendingSpDepositsTable.drimpayReference, reference),
      ))
      .limit(1);
    const [deposit] = await db.select()
      .from(depositsTable)
      .where(and(
        eq(depositsTable.userId, req.userId!),
        eq(depositsTable.drimpayReference, reference),
      ))
      .limit(1);
    const [vipPayment] = await db.select()
      .from(vipPaymentsTable)
      .where(and(
        eq(vipPaymentsTable.userId, req.userId!),
        eq(vipPaymentsTable.drimpayReference, reference),
      ))
      .limit(1);

    if (!pendingDeposit && !deposit && !vipPayment) {
      res.status(404).json({ error: "Paiement introuvable." });
      return;
    }

    if (deposit && !pendingDeposit) {
      res.json({ status: "success", transactionId: reference });
      return;
    }
    if (vipPayment && vipPayment.status !== "pending") {
      res.json({
        status: vipPayment.status === "completed" ? "success" : vipPayment.status === "reversed" ? "reversed" : "failed",
        transactionId: reference,
      });
      return;
    }

    const response = await drimPayRequest<DrimPayTransactionResponse>(
      `/payin/${encodeURIComponent(reference)}`,
      getDrimPayApiKey(),
    );
    if (response.reference !== reference) {
      res.status(502).json({ error: "La réponse DrimPay ne correspond pas à cette demande." });
      return;
    }

    const storedOrderId = pendingDeposit?.externalReference ?? vipPayment?.drimpayOrderId;
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
      transactionId: reference,
    });
  } catch (error) {
    sendPaymentError(res, error);
  }
});

export default router;
