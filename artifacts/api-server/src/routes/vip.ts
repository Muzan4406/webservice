import { Router, type IRouter } from "express";
import { db, usersTable, appSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ConfirmVipPurchaseBody } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/vip/purchase", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = req.user!;
  if (user.isVip) {
    res.json({ message: "You are already VIP" });
    return;
  }

  let [settings] = await db.select().from(appSettingsTable).limit(1);
  const vipPrice = settings ? parseFloat(settings.vipPriceFcfa) : 5000;

  // Payment integration placeholder — admin confirms manually for now.
  // The international deposit API/SDK will later drive this automatically.
  res.json({
    message: `L'accès VIP coûte ${vipPrice.toLocaleString("fr-FR")} FCFA. Effectuez le paiement via le moyen configuré puis attendez la confirmation de l'administrateur.`,
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

  const [user] = await db
    .update(usersTable)
    .set({ isVip: true, updatedAt: new Date() })
    .where(eq(usersTable.id, parsed.data.userId))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ success: true, message: `VIP activated for ${user.username}` });
});

export default router;
