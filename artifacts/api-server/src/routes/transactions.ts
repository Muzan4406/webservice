import { Router, type IRouter } from "express";
import { db, depositsTable, withdrawalsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

/**
 * GET /transactions
 * Historique unifié des dépôts + retraits de l'utilisateur connecté,
 * triés par date décroissante.
 */
router.get("/transactions", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = 20;

  const [deposits, withdrawals] = await Promise.all([
    db
      .select()
      .from(depositsTable)
      .where(eq(depositsTable.userId, req.userId!))
      .orderBy(desc(depositsTable.createdAt)),
    db
      .select()
      .from(withdrawalsTable)
      .where(eq(withdrawalsTable.userId, req.userId!))
      .orderBy(desc(withdrawalsTable.createdAt)),
  ]);

  // Fusionner et trier par date décroissante
  const all = [
    ...deposits.map((d) => ({
      id: d.id,
      kind: "deposit" as const,
      amount: parseFloat(d.amount),
      status: d.status,
      operator: d.operator ?? null,
      createdAt: d.createdAt,
    })),
    ...withdrawals.map((w) => ({
      id: w.id,
      kind: "withdrawal" as const,
      amount: parseFloat(w.amount),
      status: w.status,
      operator: w.operator ?? null,
      createdAt: w.createdAt,
    })),
  ].sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());

  const total = all.length;
  const transactions = all.slice((page - 1) * limit, page * limit);

  res.json({ transactions, total, page, limit });
});

export default router;
