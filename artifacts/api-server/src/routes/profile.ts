import { Router, type IRouter } from "express";
import { db, usersTable, depositsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { UpdateProfileBody } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

async function getReferralCount(userId: number): Promise<number> {
  return db.$count(usersTable, eq(usersTable.referredById, userId));
}

/** Count referrals who have made at least one validated deposit (= filleuls actifs) */
async function getActiveReferralCount(userId: number): Promise<number> {
  const rows = await db
    .selectDistinct({ uid: usersTable.id })
    .from(usersTable)
    .innerJoin(
      depositsTable,
      and(eq(depositsTable.userId, usersTable.id), eq(depositsTable.status, "validated")),
    )
    .where(eq(usersTable.referredById, userId));
  return rows.length;
}

router.get("/profile", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = req.user!;
  const [referralCount, activeReferralCount] = await Promise.all([
    getReferralCount(user.id),
    getActiveReferralCount(user.id),
  ]);

  res.json({
    id: user.id,
    username: user.username,
    phone: user.phone,
    userId: user.userId,
    referralCode: user.referralCode,
    referralCount,
    activeReferralCount,
    isVip: user.isVip,
    isAdmin: user.isAdmin,
    photoUrl: user.photoUrl,
    createdAt: user.createdAt,
  });
});

router.put("/profile", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({ photoUrl: parsed.data.photoUrl, updatedAt: new Date() })
    .where(eq(usersTable.id, req.userId!))
    .returning();

  const [referralCount, activeReferralCount] = await Promise.all([
    getReferralCount(updated.id),
    getActiveReferralCount(updated.id),
  ]);

  res.json({
    id: updated.id,
    username: updated.username,
    phone: updated.phone,
    userId: updated.userId,
    referralCode: updated.referralCode,
    referralCount,
    activeReferralCount,
    isVip: updated.isVip,
    isAdmin: updated.isAdmin,
    photoUrl: updated.photoUrl,
    createdAt: updated.createdAt,
  });
});

export default router;
