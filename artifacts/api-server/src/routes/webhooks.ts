import { Router, type IRouter, type Request, type Response } from "express";
import crypto from "node:crypto";
import { db, depositsTable, vipPaymentsTable, usersTable, paymentConfigTable, pendingSpDepositsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { tg } from "../lib/telegram";

const router: IRouter = Router();

router.post("/", async (req: Request, res: Response): Promise<void> => {
  const rawBody = req.body as Buffer;

  try {
    // Prefer env var (Replit Secret), fall back to DB
    const [config] = await db.select().from(paymentConfigTable).limit(1);
    const secret = process.env["SENDAVAPAY_WEBHOOK_SECRET"] ?? config?.sendavapayWebhookSecret;

    if (secret) {
      const sig = req.headers["x-sendavapay-signature"] as string | undefined;
      const expected = "sha256=" + crypto
        .createHmac("sha256", secret)
        .update(rawBody)
        .digest("hex");

      if (!sig || sig !== expected) {
        logger.warn("SendavaPay webhook: signature invalide");
        res.status(401).json({ error: "Invalid signature" });
        return;
      }
    }

    const payload = JSON.parse(rawBody.toString()) as any;
    const { event, reference } = payload;

    logger.info({ event, reference }, "SendavaPay webhook reçu");

    // ── Payment completed ──────────────────────────────────────────────
    if (event === "payment.completed") {

      // Deposit flow: create deposit record NOW (admin sees it only on success)
      const [pendingDep] = await db
        .select()
        .from(pendingSpDepositsTable)
        .where(eq(pendingSpDepositsTable.sendavapayReference, reference));

      if (pendingDep) {
        await db.insert(depositsTable).values({
          userId: pendingDep.userId,
          type: "international",
          operator: "other",
          oneXbetAccountId: pendingDep.oneXbetAccountId,
          amount: pendingDep.amount,
          referenceId: pendingDep.externalReference,
          sendavapayReference: reference,
          country: pendingDep.payerCountry,
          status: "pending", // admin still needs to credit 1xBet account
        });

        await db
          .delete(pendingSpDepositsTable)
          .where(eq(pendingSpDepositsTable.id, pendingDep.id));

        logger.info({ userId: pendingDep.userId, reference }, "Dépôt SP créé pour l'admin après confirmation");

        const [depUser] = await db.select({ username: usersTable.username, userId: usersTable.userId }).from(usersTable).where(eq(usersTable.id, pendingDep.userId));
        tg.depositSendavapay({
          username: depUser?.username ?? String(pendingDep.userId),
          userId: depUser?.userId ?? String(pendingDep.userId),
          amount: parseFloat(pendingDep.amount),
          reference,
          country: pendingDep.payerCountry,
        });
      }

      // VIP flow: activate VIP
      const [vipPayment] = await db
        .select()
        .from(vipPaymentsTable)
        .where(eq(vipPaymentsTable.sendavapayReference, reference));

      if (vipPayment && vipPayment.status === "pending") {
        await db
          .update(vipPaymentsTable)
          .set({ status: "completed", updatedAt: new Date() })
          .where(eq(vipPaymentsTable.id, vipPayment.id));

        await db
          .update(usersTable)
          .set({ isVip: true, updatedAt: new Date() })
          .where(eq(usersTable.id, vipPayment.userId));

        logger.info({ userId: vipPayment.userId }, "VIP activé via SendavaPay");

        const [vipUser] = await db.select({ username: usersTable.username, userId: usersTable.userId }).from(usersTable).where(eq(usersTable.id, vipPayment.userId));
        tg.vipActivated({
          username: vipUser?.username ?? String(vipPayment.userId),
          userId: vipUser?.userId ?? String(vipPayment.userId),
          amount: parseFloat(vipPayment.amount),
        });
      }
    }

    // ── Payment failed / expired ───────────────────────────────────────
    if (event === "payment.failed" || event === "payment.expired") {

      // Deposit: delete pending record — admin sees NOTHING (no deposit created)
      const [pendingDep] = await db
        .select()
        .from(pendingSpDepositsTable)
        .where(eq(pendingSpDepositsTable.sendavapayReference, reference));

      if (pendingDep) {
        await db
          .delete(pendingSpDepositsTable)
          .where(eq(pendingSpDepositsTable.id, pendingDep.id));
        logger.info({ reference }, "Paiement SP échoué — aucun dépôt créé");
      }

      // VIP: mark as failed
      const [vipPayment] = await db
        .select()
        .from(vipPaymentsTable)
        .where(eq(vipPaymentsTable.sendavapayReference, reference));

      if (vipPayment && vipPayment.status === "pending") {
        await db
          .update(vipPaymentsTable)
          .set({ status: "failed", updatedAt: new Date() })
          .where(eq(vipPaymentsTable.id, vipPayment.id));
      }
    }

    res.json({ received: true });
  } catch (err: any) {
    logger.error({ err }, "Erreur webhook SendavaPay");
    res.status(500).json({ error: "Internal error" });
  }
});

export default router;
