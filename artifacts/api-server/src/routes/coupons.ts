import { Router, type IRouter } from "express";
import { db, couponsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { CreateCouponBody, GetAllCouponsQueryParams, UpdateCouponParams, DeleteCouponParams } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { broadcastPushNotification } from "../lib/pushNotifications";

const router: IRouter = Router();

function formatCoupon(c: typeof couponsTable.$inferSelect) {
  return {
    ...c,
    odds: c.odds != null ? parseFloat(c.odds) : null,
    imageUrl: c.imageUrl ?? null,
  };
}

router.get("/coupons/daily", requireAuth, async (_req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];
  const coupons = await db
    .select()
    .from(couponsTable)
    .where(eq(couponsTable.type, "daily"))
    .orderBy(desc(couponsTable.createdAt));

  // Filter today's + recent
  const todayCoupons = coupons.filter((c) => c.date === today);
  const result = todayCoupons.length > 0 ? todayCoupons : coupons.slice(0, 5);
  res.json({ coupons: result.map(formatCoupon) });
});

router.get("/coupons/vip", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user?.isVip) {
    res.status(403).json({ error: "VIP access required" });
    return;
  }

  const today = new Date().toISOString().split("T")[0];
  const coupons = await db
    .select()
    .from(couponsTable)
    .where(eq(couponsTable.type, "vip"))
    .orderBy(desc(couponsTable.createdAt));

  const todayCoupons = coupons.filter((c) => c.date === today);
  const result = todayCoupons.length > 0 ? todayCoupons : coupons.slice(0, 5);
  res.json({ coupons: result.map(formatCoupon) });
});

router.get("/coupons", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = GetAllCouponsQueryParams.safeParse(req.query);
  let coupons;

  if (params.success && params.data.type) {
    coupons = await db
      .select()
      .from(couponsTable)
      .where(eq(couponsTable.type, params.data.type))
      .orderBy(desc(couponsTable.createdAt));
  } else {
    coupons = await db.select().from(couponsTable).orderBy(desc(couponsTable.createdAt));
  }

  res.json({ coupons: coupons.map(formatCoupon) });
});

router.post("/coupons", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const parsed = CreateCouponBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { type, title, content, imageUrl, date, odds } = parsed.data;
  const today = new Date().toISOString().split("T")[0];
  const dateStr = date instanceof Date ? date.toISOString().split("T")[0] : (date ? String(date) : today);

  const [coupon] = await db
    .insert(couponsTable)
    .values({ type, title, content: content ?? '', imageUrl, date: dateStr, odds: odds != null ? String(odds) : null })
    .returning();

  // Push notification to all users (VIP only for vip coupons)
  const usersWithTokens = await db
    .select({ pushToken: usersTable.pushToken, isVip: usersTable.isVip })
    .from(usersTable)
    .where(eq(usersTable.isBanned, false));
  const eligibleTokens = type === 'vip'
    ? usersWithTokens.filter((u) => u.isVip).map((u) => u.pushToken)
    : usersWithTokens.map((u) => u.pushToken);
  const label = type === 'vip' ? '⭐ Nouveau coupon VIP disponible !' : '🎯 Nouveau coupon du jour disponible !';
  broadcastPushNotification(eligibleTokens, { title: label, body: title, data: { type: 'new_coupon', couponType: type } });

  res.status(201).json(formatCoupon(coupon));
});

router.put("/coupons/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const parsed = CreateCouponBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { type, title, content, imageUrl, date, odds } = parsed.data;
  const today = new Date().toISOString().split("T")[0];
  const dateStr = date instanceof Date ? date.toISOString().split("T")[0] : (date ? String(date) : today);

  const [coupon] = await db
    .update(couponsTable)
    .set({ type, title, content: content ?? '', imageUrl, date: dateStr, odds: odds != null ? String(odds) : null, updatedAt: new Date() })
    .where(eq(couponsTable.id, id))
    .returning();

  if (!coupon) {
    res.status(404).json({ error: "Coupon not found" });
    return;
  }

  res.json(formatCoupon(coupon));
});

router.delete("/coupons/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [deleted] = await db.delete(couponsTable).where(eq(couponsTable.id, id)).returning();

  if (!deleted) {
    res.status(404).json({ error: "Coupon not found" });
    return;
  }

  res.json({ success: true });
});

export default router;
