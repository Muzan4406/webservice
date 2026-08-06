import { Router, type IRouter } from "express";
import { db, paymentConfigTable, depositsTable, vipPaymentsTable, appSettingsTable, pendingSpDepositsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { logger } from "../lib/logger";
import { tg } from "../lib/telegram";

const SENDAVAPAY_BASE = "https://sendavapay.com/api/sdk/v1";

const router: IRouter = Router();

async function getApiKey(): Promise<string> {
  // Prefer env var (Replit Secret), fall back to DB
  if (process.env["SENDAVAPAY_API_KEY"]) return process.env["SENDAVAPAY_API_KEY"]!;
  const [config] = await db.select().from(paymentConfigTable).limit(1);
  if (!config?.sendavapayApiKey) {
    const err = new Error("SendavaPay non configuré. Veuillez contacter l'administrateur.") as any;
    err.status = 503;
    throw err;
  }
  return config.sendavapayApiKey;
}

function authHeaders(apiKey: string): Record<string, string> {
  return { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" };
}

function webhookBase(): string {
  if (process.env["WEBHOOK_BASE_URL"]) return process.env["WEBHOOK_BASE_URL"]!;
  if (process.env["REPLIT_DEV_DOMAIN"]) return `https://${process.env["REPLIT_DEV_DOMAIN"]}`;
  return "";
}

// GET /sendavapay/countries
router.get("/sendavapay/countries", async (_req, res): Promise<void> => {
  try {
    const apiKey = await getApiKey();
    const r = await fetch(`${SENDAVAPAY_BASE}/countries`, { headers: { "Authorization": `Bearer ${apiKey}` } });
    const data = await r.json() as any;
    if (!data.success) { res.status(400).json({ error: data.error ?? "Erreur SendavaPay" }); return; }
    res.json({ countries: data.data });
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

// GET /sendavapay/operators/:countryCode
router.get("/sendavapay/operators/:countryCode", async (req, res): Promise<void> => {
  try {
    const apiKey = await getApiKey();
    const code = Array.isArray(req.params.countryCode) ? req.params.countryCode[0] : req.params.countryCode;
    const r = await fetch(`${SENDAVAPAY_BASE}/operators/${code}`, { headers: { "Authorization": `Bearer ${apiKey}` } });
    const data = await r.json() as any;
    if (!data.success) { res.status(400).json({ error: data.error ?? "Erreur SendavaPay" }); return; }
    res.json({ operators: data.data });
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

// POST /sendavapay/create-deposit-payment
// Stores in pending_sp_deposits ONLY — actual deposit record is created by webhook on payment.completed
router.post("/sendavapay/create-deposit-payment", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const apiKey = await getApiKey();
    const { amount, currency, payerCountry, oneXbetAccountId } = req.body;

    if (!amount || !currency || !payerCountry || !oneXbetAccountId) {
      res.status(400).json({ error: "amount, currency, payerCountry et oneXbetAccountId sont requis" });
      return;
    }

    const externalRef = `dep_${req.userId}_${Date.now()}`;
    const base = webhookBase();

    const spRes = await fetch(`${SENDAVAPAY_BASE}/create-payment`, {
      method: "POST",
      headers: authHeaders(apiKey),
      body: JSON.stringify({
        amount,
        currency,
        description: "Dépôt international",
        payerCountry,
        externalReference: externalRef,
        ...(base ? { webhookUrl: `${base}/webhooks/sendavapay` } : {}),
      }),
    });

    const spData = await spRes.json() as any;
    if (!spData.success) {
      res.status(400).json({ error: spData.error ?? "Erreur SendavaPay" });
      return;
    }

    // Store in pending table — NO deposit created yet, admin sees nothing until payment.completed webhook
    await db.insert(pendingSpDepositsTable).values({
      userId: req.userId!,
      sendavapayReference: spData.data.reference,
      externalReference: externalRef,
      amount: String(amount),
      currency,
      payerCountry,
      oneXbetAccountId,
    });

    res.json({
      paymentToken: spData.data.paymentToken,
      reference: spData.data.reference,
      depositId: null,
      amount: spData.data.amount,
      currency: spData.data.currency,
      expiresAt: spData.data.expiresAt,
    });
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

// POST /sendavapay/create-vip-payment
router.post("/sendavapay/create-vip-payment", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const apiKey = await getApiKey();
    const { currency, payerCountry } = req.body;

    if (!currency || !payerCountry) {
      res.status(400).json({ error: "currency et payerCountry sont requis" });
      return;
    }

    const user = req.user!;
    if (user.isVip) {
      res.status(400).json({ error: "Vous êtes déjà VIP" });
      return;
    }

    const [settings] = await db.select().from(appSettingsTable).limit(1);
    const vipPrice = settings ? parseFloat(settings.vipPriceFcfa) : 5000;

    const externalRef = `vip_${req.userId}_${Date.now()}`;
    const base = webhookBase();

    const spRes = await fetch(`${SENDAVAPAY_BASE}/create-payment`, {
      method: "POST",
      headers: authHeaders(apiKey),
      body: JSON.stringify({
        amount: vipPrice,
        currency,
        description: "Accès VIP",
        payerCountry,
        externalReference: externalRef,
        ...(base ? { webhookUrl: `${base}/webhooks/sendavapay` } : {}),
      }),
    });

    const spData = await spRes.json() as any;
    if (!spData.success) {
      res.status(400).json({ error: spData.error ?? "Erreur SendavaPay" });
      return;
    }

    await db.insert(vipPaymentsTable).values({
      userId: req.userId!,
      sendavapayReference: spData.data.reference,
      amount: String(vipPrice),
      currency,
      status: "pending",
    });

    res.json({
      paymentToken: spData.data.paymentToken,
      reference: spData.data.reference,
      depositId: null,
      amount: spData.data.amount,
      currency: spData.data.currency,
      expiresAt: spData.data.expiresAt,
    });
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

// POST /sendavapay/initiate
router.post("/sendavapay/initiate", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { paymentToken, payerName, payerPhone, payerEmail, payerCountry, operatorId } = req.body;

  if (!paymentToken || !payerName || !payerPhone || !payerCountry || !operatorId) {
    res.status(400).json({ error: "Paramètres manquants" });
    return;
  }

  // The SendavaPay initiate endpoint must receive the merchant authorization
  // too. Without it, providers can reject the push flow or fall back to a
  // hosted checkout/redirect response.
  const apiKey = await getApiKey();
  const r = await fetch(`${SENDAVAPAY_BASE}/initiate-payment`, {
    method: "POST",
    headers: authHeaders(apiKey),
    body: JSON.stringify({ paymentToken, payerName, payerPhone, payerEmail, payerCountry, operatorId }),
  });

  const data = await r.json() as any;
  if (!data.success) {
    res.status(400).json({ error: data.error ?? "Erreur d'initiation" });
    return;
  }

  // Keep the payment decision observable without logging credentials,
  // payment tokens, or the payer's phone number. A redirect is decided by
  // SendavaPay; the domain/SSL only affect the later webhook callback.
  let redirectHost: string | null = null;
  if (data.redirectUrl) {
    try {
      redirectHost = new URL(data.redirectUrl).host;
    } catch {
      redirectHost = "invalid-url";
    }
  }
  logger.info({
    operatorId,
    payerCountry,
    reference: data.reference ?? null,
    requiresRedirect: data.requiresRedirect ?? false,
    redirectHost,
    requiresOtp: data.requiresOtp ?? false,
    message: data.message ?? null,
  }, "SendavaPay payment initiation result");

  res.json({
    success: true,
    reference: data.reference,
    requiresOtp: data.requiresOtp ?? false,
    otpToken: data.otpToken ?? null,
    requiresRedirect: data.requiresRedirect ?? false,
    redirectUrl: data.redirectUrl ?? null,
    message: data.message ?? null,
  });
});

// POST /sendavapay/submit-otp
router.post("/sendavapay/submit-otp", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { otpToken, otp } = req.body;
  if (!otpToken || !otp) { res.status(400).json({ error: "otpToken et otp sont requis" }); return; }

  const apiKey = await getApiKey();
  const r = await fetch(`${SENDAVAPAY_BASE}/submit-otp`, {
    method: "POST",
    headers: authHeaders(apiKey),
    body: JSON.stringify({ otpToken, otp }),
  });

  const data = await r.json() as any;
  if (!data.success) { res.status(400).json({ error: data.error ?? "OTP invalide" }); return; }

  res.json({ success: true, message: data.message ?? null });
});

// GET /sendavapay/status/:reference
router.get("/sendavapay/status/:reference", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const apiKey = await getApiKey();
    const ref = Array.isArray(req.params.reference) ? req.params.reference[0] : req.params.reference;

    const r = await fetch(`${SENDAVAPAY_BASE}/payment-status/${ref}`, {
      headers: { "Authorization": `Bearer ${apiKey}` },
    });

    const data = await r.json() as any;

    // If SendavaPay returns failure (expired/not found), treat it as a failed payment
    // so the mobile can transition out of "waiting" instead of staying stuck forever
    if (!data.success) {
      // Clean up pending deposit if it exists (webhook may not have fired)
      const [pendingDepFail] = await db
        .select()
        .from(pendingSpDepositsTable)
        .where(eq(pendingSpDepositsTable.sendavapayReference, ref));
      if (pendingDepFail) {
        await db.delete(pendingSpDepositsTable).where(eq(pendingSpDepositsTable.id, pendingDepFail.id));
        logger.info({ ref }, "Dépôt SP en attente supprimé après échec (polling)");
      }
      res.json({ reference: ref, status: "failed", amount: null, currency: null, completedAt: null });
      return;
    }

    const status = data.data.status;

    // Also clean up pending record when status is failed/expired via polling
    if (status === "failed" || status === "expired") {
      const [pendingDepFail] = await db
        .select()
        .from(pendingSpDepositsTable)
        .where(eq(pendingSpDepositsTable.sendavapayReference, ref));
      if (pendingDepFail) {
        await db.delete(pendingSpDepositsTable).where(eq(pendingSpDepositsTable.id, pendingDepFail.id));
        logger.info({ ref, status }, "Dépôt SP en attente supprimé après échec/expiration (polling)");
      }
    }

    // ── On completed: ensure deposit/VIP records exist even if webhook was missed ──
    if (status === "completed") {
      // Deposit flow: move pending → deposits table
      const [pendingDep] = await db
        .select()
        .from(pendingSpDepositsTable)
        .where(eq(pendingSpDepositsTable.sendavapayReference, ref));

      if (pendingDep) {
        // Check not already created (webhook may have fired first)
        const existing = await db
          .select()
          .from(depositsTable)
          .where(eq(depositsTable.sendavapayReference, ref));

        if (existing.length === 0) {
          await db.insert(depositsTable).values({
            userId: pendingDep.userId,
            type: "international",
            operator: "other",
            oneXbetAccountId: pendingDep.oneXbetAccountId,
            amount: pendingDep.amount,
            referenceId: pendingDep.externalReference,
            sendavapayReference: ref,
            country: pendingDep.payerCountry,
            status: "pending",
          });
          await db.delete(pendingSpDepositsTable).where(eq(pendingSpDepositsTable.id, pendingDep.id));
          logger.info({ userId: pendingDep.userId, ref }, "Dépôt SP créé via polling (webhook manqué)");

          const [depUser] = await db.select({ username: usersTable.username, userId: usersTable.userId }).from(usersTable).where(eq(usersTable.id, pendingDep.userId));
          tg.depositSendavapay({
            username: depUser?.username ?? String(pendingDep.userId),
            userId: depUser?.userId ?? String(pendingDep.userId),
            amount: parseFloat(pendingDep.amount),
            reference: ref,
            country: pendingDep.payerCountry,
          });
        }
      }

      // VIP flow: activate VIP if pending
      const [vipPayment] = await db
        .select()
        .from(vipPaymentsTable)
        .where(eq(vipPaymentsTable.sendavapayReference, ref));

      if (vipPayment && vipPayment.status === "pending") {
        await db.update(vipPaymentsTable)
          .set({ status: "completed", updatedAt: new Date() })
          .where(eq(vipPaymentsTable.id, vipPayment.id));
        await db.update(usersTable)
          .set({ isVip: true, updatedAt: new Date() })
          .where(eq(usersTable.id, vipPayment.userId));
        logger.info({ userId: vipPayment.userId }, "VIP activé via polling (webhook manqué)");

        const [vipUser] = await db.select({ username: usersTable.username, userId: usersTable.userId }).from(usersTable).where(eq(usersTable.id, vipPayment.userId));
        tg.vipActivated({
          username: vipUser?.username ?? String(vipPayment.userId),
          userId: vipUser?.userId ?? String(vipPayment.userId),
          amount: parseFloat(vipPayment.amount),
        });
      }
    }

    res.json({
      reference: data.data.reference,
      status,
      amount: data.data.amount,
      currency: data.data.currency,
      completedAt: data.data.completedAt ?? null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
