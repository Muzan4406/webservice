import { Router, type IRouter } from "express";
import { db, usersTable, depositsTable } from "@workspace/db";
import { eq, desc, and, inArray } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/referrals", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = req.user!;

  const referrals = await db
    .select({ id: usersTable.id, username: usersTable.username, createdAt: usersTable.createdAt })
    .from(usersTable)
    .where(eq(usersTable.referredById, user.id))
    .orderBy(desc(usersTable.createdAt));

  // Which referrals have at least one validated deposit (= actifs)
  let activeIds = new Set<number>();
  if (referrals.length > 0) {
    const rows = await db
      .selectDistinct({ userId: depositsTable.userId })
      .from(depositsTable)
      .where(
        and(
          eq(depositsTable.status, "validated"),
          inArray(depositsTable.userId, referrals.map((r) => r.id)),
        ),
      );
    activeIds = new Set(rows.map((r) => r.userId));
  }

  res.json({
    referralCode: user.referralCode,
    referralCount: referrals.length,
    activeReferralCount: activeIds.size,
    referrals: referrals.map((r) => ({
      username: r.username,
      createdAt: r.createdAt,
      isActive: activeIds.has(r.id),
    })),
  });
});

export default router;
