import { Router, type IRouter } from "express";
import { db, contestsTable, usersTable, depositsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { CreateContestBody, UpdateContestParams } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/contest/current", requireAuth, async (_req, res): Promise<void> => {
  const [contest] = await db
    .select()
    .from(contestsTable)
    .where(eq(contestsTable.isActive, true))
    .orderBy(desc(contestsTable.createdAt))
    .limit(1);

  res.json(contest ?? null);
});

router.get("/contest/leaderboard", requireAuth, async (_req, res): Promise<void> => {
  // Get top 10 referrers — only count referred users with at least one validated deposit
  const [allUsers, validatedDepositors] = await Promise.all([
    db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        userId: usersTable.userId,
        referredById: usersTable.referredById,
      })
      .from(usersTable),
    db
      .selectDistinct({ userId: depositsTable.userId })
      .from(depositsTable)
      .where(eq(depositsTable.status, "validated")),
  ]);

  const activeDepositorIds = new Set(validatedDepositors.map((d) => d.userId));

  // A filleul is "actif" only if they have made at least one validated deposit
  const referralCounts: Record<number, number> = {};
  for (const user of allUsers) {
    if (user.referredById != null && activeDepositorIds.has(user.id)) {
      referralCounts[user.referredById] = (referralCounts[user.referredById] ?? 0) + 1;
    }
  }

  const usersWithCounts = allUsers
    .filter((u) => (referralCounts[u.id] ?? 0) > 0)
    .map((u) => ({
      username: u.username,
      userId: u.userId,
      referralCount: referralCounts[u.id] ?? 0,
    }))
    .sort((a, b) => b.referralCount - a.referralCount)
    .slice(0, 10)
    .map((u, i) => ({ rank: i + 1, ...u }));

  const [activeContest] = await db
    .select()
    .from(contestsTable)
    .where(eq(contestsTable.isActive, true))
    .orderBy(desc(contestsTable.createdAt))
    .limit(1);

  res.json({
    entries: usersWithCounts,
    contestEndsAt: activeContest?.endDate ?? null,
  });
});

router.post("/contest", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const parsed = CreateContestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [contest] = await db.insert(contestsTable).values(parsed.data).returning();
  res.status(201).json(contest);
});

router.put("/contest/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const parsed = CreateContestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [contest] = await db
    .update(contestsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(contestsTable.id, id))
    .returning();

  if (!contest) {
    res.status(404).json({ error: "Contest not found" });
    return;
  }

  res.json(contest);
});

export default router;
