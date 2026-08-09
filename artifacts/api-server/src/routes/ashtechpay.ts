import { Router, type IRouter } from "express";
import { db, paymentConfigTable, depositsTable, vipPaymentsTable, appSettingsTable, pendingSpDepositsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { logger } from "../lib/logger";
import { tg } from "../lib/telegram";

const ASHTECHPAY_BASE = "https://ashtechpay.top";

const router: IRouter = Router();

async function getApiKey(): Promise<string> {
  if (process.env["ASHTECHPAY_API_KEY"]) return process.env["ASHTECHPAY_API_KEY"]!;
  const [config] = await db.select().from(paymentConfigTable).limit(1);
  if (!config?.ashtechpayApiKey) {
    const err = new Error("AshtechPay non configuré. Veuillez contacter l'administrateur.") as any;
    err.status = 503;
    throw err;
  }
  return config.ashtechpayApiKey;
}

function authHeaders(apiKey: string): Record<string, string> {
  return { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" };
}

function webhookBase(): string {
  if (process.env["WEBHOOK_BASE_URL"]) return process.env["WEBHOOK_BASE_URL"]!;
  if (process.env["REPLIT_DEV_DOMAIN"]) return `https://${process.env["REPLIT_DEV_DOMAIN"]}`;
  return "";
}

// GET /ashtechpay/countries — liste des pays et opérateurs
router.get("/ashtechpay/countries", async (_req, res): Promise<void> => {
  try {
    const apiKey = await getApiKey();
    const r = await fetch(`${ASHTECHPAY_BASE}/v1/countries`, {
      headers: { "Authorization": `Bearer ${apiKey}` },
    });
    const data = await r.json() as any;
    res.json(data); // array of { code, name, currency, operators: string[] }
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

// POST /ashtechpay/collect — initier un paiement (dépôt international)
router.post("/ashtechpay/collect", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const apiKey = await getApiKey();
    const { amount, currency, phone, operator, countryCode, oneXbetAccountId } = req.body;

    if (!amount || !currency || !phone || !operator || !countryCode || !oneXbetAccountId) {
      res.status(400).json({ error: "amount, currency, phone, operator, countryCode et oneXbetAccountId sont requis" });
      return;
    }

    const externalRef = `dep_${req.userId}_${Date.now()}`;
    const base = webhookBase();

    const payload: Record<string, any> = {
      amount: Number(amount),
      currency,
      phone,
      operator,
      country_code: countryCode,
      reference: externalRef,
      ...(base ? { notify_url: `${base}/webhooks/ashtechpay` } : {}),
    };

    const r = await fetch(`${ASHTECHPAY_BASE}/v1/collect`, {
      method: "POST",
      headers: authHeaders(apiKey),
      body: JSON.stringify(payload),
    });

    const data = await r.json() as any;

    // OTP requis — renvoyer les infos sans créer le dépôt
    if (r.status === 400 && data.error === "otp_required") {
      res.json({
        type: "otp",
        reference: data.reference,
        ussdCode: data.ussd_code ?? null,
        externalRef,
        // renvoyer les paramètres originaux pour le retry OTP
        collectParams: { amount: Number(amount), currency, phone, operator, countryCode, oneXbetAccountId },
      });
      return;
    }

    if (!r.ok) {
      res.status(400).json({ error: data.message ?? data.error ?? "Erreur AshtechPay" });
      return;
    }

    // Succès — USSD Push ou Wave
    const transactionId: string = data.transaction_id;

    await db.insert(pendingSpDepositsTable).values({
      userId: req.userId!,
      ashtechpayReference: transactionId,
      externalReference: externalRef,
      amount: String(amount),
      currency,
      payerCountry: countryCode,
      oneXbetAccountId,
    });

    if (data.flow === "wave") {
      res.json({ type: "wave", transactionId, waveUrl: data.wave_url });
    } else {
      res.json({ type: "ussd_push", transactionId });
    }
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

// POST /ashtechpay/submit-otp — retry OTP pour dépôt
router.post("/ashtechpay/submit-otp", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const apiKey = await getApiKey();
    const { reference, otp, collectParams, externalRef } = req.body;

    if (!reference || !otp || !collectParams) {
      res.status(400).json({ error: "reference, otp et collectParams sont requis" });
      return;
    }

    const { amount, currency, phone, operator, countryCode, oneXbetAccountId } = collectParams;
    const base = webhookBase();
    const actualExternalRef: string = externalRef ?? `dep_${req.userId}_${Date.now()}`;

    const payload: Record<string, any> = {
      amount: Number(amount),
      currency,
      phone,
      operator,
      country_code: countryCode,
      otp,
      reference,
      ...(base ? { notify_url: `${base}/webhooks/ashtechpay` } : {}),
    };

    const r = await fetch(`${ASHTECHPAY_BASE}/v1/collect`, {
      method: "POST",
      headers: authHeaders(apiKey),
      body: JSON.stringify(payload),
    });

    const data = await r.json() as any;

    if (!r.ok) {
      res.status(400).json({ error: data.message ?? data.error ?? "OTP invalide ou expiré" });
      return;
    }

    const transactionId: string = data.transaction_id;

    // Créer le dépôt en attente maintenant que l'OTP est validé
    await db.insert(pendingSpDepositsTable).values({
      userId: req.userId!,
      ashtechpayReference: transactionId,
      externalReference: actualExternalRef,
      amount: String(amount),
      currency,
      payerCountry: countryCode,
      oneXbetAccountId: oneXbetAccountId ?? "",
    }).onConflictDoNothing();

    res.json({ transactionId });
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

// POST /ashtechpay/collect-vip — paiement VIP
router.post("/ashtechpay/collect-vip", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const apiKey = await getApiKey();
    const { phone, operator, countryCode, currency } = req.body;

    if (!phone || !operator || !countryCode || !currency) {
      res.status(400).json({ error: "phone, operator, countryCode et currency sont requis" });
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

    const payload: Record<string, any> = {
      amount: vipPrice,
      currency,
      phone,
      operator,
      country_code: countryCode,
      reference: externalRef,
      ...(base ? { notify_url: `${base}/webhooks/ashtechpay` } : {}),
    };

    const r = await fetch(`${ASHTECHPAY_BASE}/v1/collect`, {
      method: "POST",
      headers: authHeaders(apiKey),
      body: JSON.stringify(payload),
    });

    const data = await r.json() as any;

    // OTP requis
    if (r.status === 400 && data.error === "otp_required") {
      res.json({
        type: "otp",
        reference: data.reference,
        ussdCode: data.ussd_code ?? null,
        externalRef,
        collectParams: { amount: vipPrice, currency, phone, operator, countryCode },
      });
      return;
    }

    if (!r.ok) {
      res.status(400).json({ error: data.message ?? data.error ?? "Erreur AshtechPay" });
      return;
    }

    const transactionId: string = data.transaction_id;

    await db.insert(vipPaymentsTable).values({
      userId: req.userId!,
      ashtechpayReference: transactionId,
      amount: String(vipPrice),
      currency,
      status: "pending",
    });

    if (data.flow === "wave") {
      res.json({ type: "wave", transactionId, waveUrl: data.wave_url });
    } else {
      res.json({ type: "ussd_push", transactionId });
    }
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

// POST /ashtechpay/submit-otp-vip — retry OTP pour VIP
router.post("/ashtechpay/submit-otp-vip", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const apiKey = await getApiKey();
    const { reference, otp, collectParams, externalRef } = req.body;

    if (!reference || !otp || !collectParams) {
      res.status(400).json({ error: "reference, otp et collectParams sont requis" });
      return;
    }

    const { amount, currency, phone, operator, countryCode } = collectParams;
    const base = webhookBase();

    const payload: Record<string, any> = {
      amount: Number(amount),
      currency,
      phone,
      operator,
      country_code: countryCode,
      otp,
      reference,
      ...(base ? { notify_url: `${base}/webhooks/ashtechpay` } : {}),
    };

    const r = await fetch(`${ASHTECHPAY_BASE}/v1/collect`, {
      method: "POST",
      headers: authHeaders(apiKey),
      body: JSON.stringify(payload),
    });

    const data = await r.json() as any;

    if (!r.ok) {
      res.status(400).json({ error: data.message ?? data.error ?? "OTP invalide ou expiré" });
      return;
    }

    const transactionId: string = data.transaction_id;
    const actualExternalRef: string = externalRef ?? `vip_${req.userId}_${Date.now()}`;

    await db.insert(vipPaymentsTable).values({
      userId: req.userId!,
      ashtechpayReference: transactionId,
      amount: String(amount),
      currency,
      status: "pending",
    }).onConflictDoNothing();

    res.json({ transactionId });
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

// GET /ashtechpay/status/:transactionId — statut d'une transaction
router.get("/ashtechpay/status/:transactionId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const apiKey = await getApiKey();
    const txId = Array.isArray(req.params.transactionId) ? req.params.transactionId[0] : req.params.transactionId;

    const r = await fetch(`${ASHTECHPAY_BASE}/v1/transaction/${txId}`, {
      headers: { "Authorization": `Bearer ${apiKey}` },
    });

    const data = await r.json() as any;

    if (!r.ok) {
      // Nettoyage du dépôt en attente
      const [pendingDep] = await db.select().from(pendingSpDepositsTable).where(eq(pendingSpDepositsTable.ashtechpayReference, txId));
      if (pendingDep) {
        await db.delete(pendingSpDepositsTable).where(eq(pendingSpDepositsTable.id, pendingDep.id));
      }
      res.json({ status: "failed" });
      return;
    }

    const status: string = data.status; // 'pending' | 'success' | 'failed'

    // Nettoyage si échoué
    if (status === "failed") {
      const [pendingDep] = await db.select().from(pendingSpDepositsTable).where(eq(pendingSpDepositsTable.ashtechpayReference, txId));
      if (pendingDep) {
        await db.delete(pendingSpDepositsTable).where(eq(pendingSpDepositsTable.id, pendingDep.id));
      }
    }

    // Succès — créer dépôt/VIP si le webhook n'a pas encore tiré
    if (status === "success") {
      // Flux dépôt
      const [pendingDep] = await db.select().from(pendingSpDepositsTable).where(eq(pendingSpDepositsTable.ashtechpayReference, txId));
      if (pendingDep) {
        const existing = await db.select().from(depositsTable).where(eq(depositsTable.ashtechpayReference, txId));
        if (existing.length === 0) {
          await db.insert(depositsTable).values({
            userId: pendingDep.userId,
            type: "international",
            operator: "other",
            oneXbetAccountId: pendingDep.oneXbetAccountId,
            amount: pendingDep.amount,
            referenceId: pendingDep.externalReference,
            ashtechpayReference: txId,
            country: pendingDep.payerCountry,
            status: "pending",
          });
          await db.delete(pendingSpDepositsTable).where(eq(pendingSpDepositsTable.id, pendingDep.id));
          logger.info({ userId: pendingDep.userId, txId }, "Dépôt AshtechPay créé via polling (webhook manqué)");

          const [depUser] = await db.select({ username: usersTable.username, userId: usersTable.userId }).from(usersTable).where(eq(usersTable.id, pendingDep.userId));
          tg.depositAshtechpay({
            username: depUser?.username ?? String(pendingDep.userId),
            userId: depUser?.userId ?? String(pendingDep.userId),
            amount: parseFloat(pendingDep.amount),
            transactionId: txId,
            country: pendingDep.payerCountry,
          });
        }
      }

      // Flux VIP
      const [vipPayment] = await db.select().from(vipPaymentsTable).where(eq(vipPaymentsTable.ashtechpayReference, txId));
      if (vipPayment && vipPayment.status === "pending") {
        await db.update(vipPaymentsTable).set({ status: "completed", updatedAt: new Date() }).where(eq(vipPaymentsTable.id, vipPayment.id));
        await db.update(usersTable).set({ isVip: true, updatedAt: new Date() }).where(eq(usersTable.id, vipPayment.userId));
        logger.info({ userId: vipPayment.userId }, "VIP activé via polling AshtechPay (webhook manqué)");

        const [vipUser] = await db.select({ username: usersTable.username, userId: usersTable.userId }).from(usersTable).where(eq(usersTable.id, vipPayment.userId));
        tg.vipActivated({
          username: vipUser?.username ?? String(vipPayment.userId),
          userId: vipUser?.userId ?? String(vipPayment.userId),
          amount: parseFloat(vipPayment.amount),
        });
      }
    }

    res.json({ status, transactionId: data.transaction_id ?? txId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
