import { Router, type IRouter } from "express";
import { db, usersTable, appSettingsTable, notificationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ConfirmVipPurchaseBody } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { sendPushNotification, notifyAdmins } from "../lib/pushNotifications";
import { nextVipExpiration } from "../lib/vip-entitlement.js";

const router: IRouter = Router();

router.post("/vip/purchase", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = req.user!;
  let [settings] = await db.select().from(appSettingsTable).limit(1);
  const vipPrice = settings ? parseFloat(settings.vipPriceFcfa) : 5000;

  // Notify admins of VIP purchase request
  notifyAdmins({
    title: "⭐ Demande VIP",
    body: `${user.username} souhaite activer ou renouveler le VIP 30 jours (${vipPrice.toLocaleString("fr-FR")} FCFA)`,
    data: { type: "vip_request", userId: String(user.id) },
  });

  // Payment integration placeholder — admin confirms manually for now.
  res.json({
    message: `L'accès VIP coûte ${vipPrice.toLocaleString("fr-FR")} FCFA pour 30 jours. Effectuez le paiement via le moyen configuré puis attendez la confirmation de l'administrateur.`,
    paymentUrl: null,
  });
});

router.post("/vip/confirm", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const parsed = ConfirmVipPurchaseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const now = new Date();
  const user = await db.transaction(async (tx) => {
    const [current] = await tx
      .select({ vipExpiresAt: usersTable.vipExpiresAt })
      .from(usersTable)
      .where(eq(usersTable.id, parsed.data.userId))
      .for("update");
    if (!current) return null;

    const [updated] = await tx
      .update(usersTable)
      .set({
        isVip: true,
        vipExpiresAt: nextVipExpiration(current.vipExpiresAt, now),
        updatedAt: now,
      })
      .where(eq(usersTable.id, parsed.data.userId))
      .returning();
    return updated ?? null;
  });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Notify user their VIP is now active
  sendPushNotification([user.pushToken], {
    title: "⭐ Accès VIP activé !",
    body: "Félicitations ! Votre accès VIP est actif pour 30 jours. Profitez des coupons exclusifs.",
    data: { type: "vip_confirmed", vipExpiresAt: user.vipExpiresAt?.toISOString() },
  });
  db.insert(notificationsTable).values({
    userId: user.id,
    title: "⭐ Accès VIP activé !",
    message: "Félicitations ! Votre accès VIP est actif pour 30 jours. Profitez des coupons exclusifs.",
    isRead: false,
  }).catch(() => {});

  res.json({ success: true, message: `VIP activated for ${user.username}`, vipExpiresAt: user.vipExpiresAt });
});

export default router;
