import { Router, type IRouter, type Request, type Response } from "express";
import { db, depositsTable, vipPaymentsTable, usersTable, pendingSpDepositsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { tg } from "../lib/telegram";

const router: IRouter = Router();

// POST /webhooks/ashtechpay
router.post("/", async (req: Request, res: Response): Promise<void> => {
  const rawBody = req.body as Buffer;

  try {
    const payload = JSON.parse(rawBody.toString()) as any;
    const { event, transaction_id } = payload;

    logger.info({ event, transaction_id }, "AshtechPay webhook reçu");

    // Répondre immédiatement
    res.json({ received: true });

    // ── Paiement confirmé ──────────────────────────────────────────────────
    if (event === "payment.completed") {
      // Flux dépôt : créer l'enregistrement dépôt (l'admin voit la demande)
      const [pendingDep] = await db
        .select()
        .from(pendingSpDepositsTable)
        .where(eq(pendingSpDepositsTable.ashtechpayReference, transaction_id));

      if (pendingDep) {
        const existing = await db.select().from(depositsTable).where(eq(depositsTable.ashtechpayReference, transaction_id));
        if (existing.length === 0) {
          await db.insert(depositsTable).values({
            userId: pendingDep.userId,
            type: "international",
            operator: "other",
            oneXbetAccountId: pendingDep.oneXbetAccountId,
            amount: pendingDep.amount,
            referenceId: pendingDep.externalReference,
            ashtechpayReference: transaction_id,
            country: pendingDep.payerCountry,
            status: "pending", // l'admin doit encore créditer le compte 1xBet
          });
        }

        await db.delete(pendingSpDepositsTable).where(eq(pendingSpDepositsTable.id, pendingDep.id));
        logger.info({ userId: pendingDep.userId, transaction_id }, "Dépôt AshtechPay créé pour l'admin");

        const [depUser] = await db
          .select({ username: usersTable.username, userId: usersTable.userId })
          .from(usersTable)
          .where(eq(usersTable.id, pendingDep.userId));

        tg.depositAshtechpay({
          username: depUser?.username ?? String(pendingDep.userId),
          userId: depUser?.userId ?? String(pendingDep.userId),
          amount: parseFloat(pendingDep.amount),
          transactionId: transaction_id,
          country: pendingDep.payerCountry,
        });
      }

      // Flux VIP : activer le VIP
      const [vipPayment] = await db
        .select()
        .from(vipPaymentsTable)
        .where(eq(vipPaymentsTable.ashtechpayReference, transaction_id));

      if (vipPayment && vipPayment.status === "pending") {
        await db
          .update(vipPaymentsTable)
          .set({ status: "completed", updatedAt: new Date() })
          .where(eq(vipPaymentsTable.id, vipPayment.id));

        await db
          .update(usersTable)
          .set({ isVip: true, updatedAt: new Date() })
          .where(eq(usersTable.id, vipPayment.userId));

        logger.info({ userId: vipPayment.userId }, "VIP activé via AshtechPay");

        const [vipUser] = await db
          .select({ username: usersTable.username, userId: usersTable.userId })
          .from(usersTable)
          .where(eq(usersTable.id, vipPayment.userId));

        tg.vipActivated({
          username: vipUser?.username ?? String(vipPayment.userId),
          userId: vipUser?.userId ?? String(vipPayment.userId),
          amount: parseFloat(vipPayment.amount),
        });
      }
    }

    // ── Paiement échoué ───────────────────────────────────────────────────
    if (event === "payment.failed") {
      // Dépôt : supprimer le pending (aucun dépôt créé)
      const [pendingDep] = await db
        .select()
        .from(pendingSpDepositsTable)
        .where(eq(pendingSpDepositsTable.ashtechpayReference, transaction_id));

      if (pendingDep) {
        await db.delete(pendingSpDepositsTable).where(eq(pendingSpDepositsTable.id, pendingDep.id));
        logger.info({ transaction_id }, "Paiement AshtechPay échoué — aucun dépôt créé");
      }

      // VIP : marquer comme échoué
      const [vipPayment] = await db
        .select()
        .from(vipPaymentsTable)
        .where(eq(vipPaymentsTable.ashtechpayReference, transaction_id));

      if (vipPayment && vipPayment.status === "pending") {
        await db
          .update(vipPaymentsTable)
          .set({ status: "failed", updatedAt: new Date() })
          .where(eq(vipPaymentsTable.id, vipPayment.id));
      }
    }
  } catch (err: any) {
    logger.error({ err }, "Erreur webhook AshtechPay");
  }
});

export default router;
