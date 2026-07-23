import { Router, type IRouter } from "express";
import { db, promotionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { CreatePromotionBody, UpdatePromotionParams, DeletePromotionParams } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

function formatPromotion(p: typeof promotionsTable.$inferSelect) {
  return { ...p, imageUrl: p.imageUrl ?? null };
}

router.get("/promotions", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    // Admins see all promotions; regular users only see active ones
    const promotions = await db
      .select()
      .from(promotionsTable)
      .where(req.isAdmin ? undefined : eq(promotionsTable.isActive, true))
      .orderBy(desc(promotionsTable.createdAt));

    res.json({ promotions: promotions.map(formatPromotion) });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch promotions" });
  }
});

router.post("/promotions", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const parsed = CreatePromotionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [promotion] = await db.insert(promotionsTable).values(parsed.data).returning();
  res.status(201).json(formatPromotion(promotion));
});

router.put("/promotions/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const parsed = CreatePromotionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [promotion] = await db
    .update(promotionsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(promotionsTable.id, id))
    .returning();

  if (!promotion) {
    res.status(404).json({ error: "Promotion not found" });
    return;
  }

  res.json(formatPromotion(promotion));
});

router.delete("/promotions/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [deleted] = await db.delete(promotionsTable).where(eq(promotionsTable.id, id)).returning();

  if (!deleted) {
    res.status(404).json({ error: "Promotion not found" });
    return;
  }

  res.json({ success: true });
});

export default router;
