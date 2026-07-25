import { Router, type IRouter } from "express";
import { db, withdrawalsTable, usersTable, notificationsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { CreateWithdrawalBody, GetWithdrawalsQueryParams } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { tg } from "../lib/telegram";
import { sendPushNotification } from "../lib/pushNotifications";

const router: IRouter = Router();

router.get("/withdrawals", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = GetWithdrawalsQueryParams.safeParse(req.query);
  const page = params.success ? (params.data.page ?? 1) : 1;
  const limit = params.success ? (params.data.limit ?? 20) : 20;
  const offset = (page - 1) * limit;

  const withdrawals = await db
    .select()
    .from(withdrawalsTable)
    .where(eq(withdrawalsTable.userId, req.userId!))
    .orderBy(desc(withdrawalsTable.createdAt))
    .limit(limit)
    .offset(offset);

  const total = await db.$count(withdrawalsTable, eq(withdrawalsTable.userId, req.userId!));

  res.json({
    withdrawals: withdrawals.map((w) => ({
      ...w,
      amount: parseFloat(w.amount),
      code: w.code ?? null,
    })),
    total,
    page,
    limit,
  });
});

router.post("/withdrawals", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = CreateWithdrawalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { amount, phone, country, operator, code } = parsed.data;

  const [withdrawal] = await db
    .insert(withdrawalsTable)
    .values({
      userId: req.userId!,
      amount: String(amount),
      phone,
      country,
      operator,
      code,
      status: "pending",
    })
    .returning();

  const [wUser] = await db.select({ username: usersTable.username, userId: usersTable.userId }).from(usersTable).where(eq(usersTable.id, req.userId!));
  tg.withdrawalCreated({
    username: wUser?.username ?? String(req.userId),
    userId: wUser?.userId ?? String(req.userId),
    amount: parseFloat(withdrawal.amount),
    operator: withdrawal.operator,
    phone: withdrawal.phone,
    country: withdrawal.country,
  });

  res.status(201).json({ ...withdrawal, amount: parseFloat(withdrawal.amount), code: withdrawal.code ?? null });
});

router.put("/withdrawals/:id/process", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [withdrawal] = await db
    .update(withdrawalsTable)
    .set({ status: "processed", updatedAt: new Date() })
    .where(eq(withdrawalsTable.id, id))
    .returning();

  if (!withdrawal) {
    res.status(404).json({ error: "Withdrawal not found" });
    return;
  }

  const [user] = await db.select({ username: usersTable.username, userId: usersTable.userId, pushToken: usersTable.pushToken }).from(usersTable).where(eq(usersTable.id, withdrawal.userId));

  tg.withdrawalProcessed({
    username: user?.username ?? String(withdrawal.userId),
    userId: user?.userId ?? String(withdrawal.userId),
    amount: parseFloat(withdrawal.amount),
    withdrawalId: withdrawal.id,
  });

  // Push notification
  sendPushNotification([user?.pushToken], {
    title: "✅ Retrait approuvé",
    body: `Votre retrait de ${parseFloat(withdrawal.amount).toLocaleString()} XOF a été approuvé et est en cours de traitement.`,
    data: { type: "withdrawal_processed", withdrawalId: withdrawal.id },
  });
  // In-app notification
  db.insert(notificationsTable).values({ userId: withdrawal.userId, title: "✅ Retrait approuvé", message: `Votre retrait de ${parseFloat(withdrawal.amount).toLocaleString()} XOF a été approuvé et est en cours de traitement.`, isRead: false }).catch(() => {});

  res.json({ ...withdrawal, amount: parseFloat(withdrawal.amount), username: user?.username, code: withdrawal.code ?? null });
});

router.put("/withdrawals/:id/reject", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const reason: string = req.body?.reason ?? "Retrait rejeté par l'administrateur";

  const [withdrawal] = await db
    .update(withdrawalsTable)
    .set({ status: "rejected", updatedAt: new Date() })
    .where(eq(withdrawalsTable.id, id))
    .returning();

  if (!withdrawal) {
    res.status(404).json({ error: "Withdrawal not found" });
    return;
  }

  const [user] = await db
    .select({ username: usersTable.username, userId: usersTable.userId, pushToken: usersTable.pushToken })
    .from(usersTable)
    .where(eq(usersTable.id, withdrawal.userId));

  tg.withdrawalProcessed({
    username: user?.username ?? String(withdrawal.userId),
    userId: user?.userId ?? String(withdrawal.userId),
    amount: parseFloat(withdrawal.amount),
    withdrawalId: withdrawal.id,
  });

  sendPushNotification([user?.pushToken], {
    title: "❌ Retrait rejeté",
    body: `Votre retrait de ${parseFloat(withdrawal.amount).toLocaleString()} XOF a été rejeté. Motif : ${reason}`,
    data: { type: "withdrawal_rejected", withdrawalId: withdrawal.id },
  });
  db.insert(notificationsTable).values({
    userId: withdrawal.userId,
    title: "❌ Retrait rejeté",
    message: `Votre retrait de ${parseFloat(withdrawal.amount).toLocaleString()} XOF a été rejeté. Motif : ${reason}`,
    isRead: false,
  }).catch(() => {});

  res.json({ ...withdrawal, amount: parseFloat(withdrawal.amount), username: user?.username, code: withdrawal.code ?? null });
});

router.delete("/withdrawals/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [existing] = await db.select().from(withdrawalsTable).where(eq(withdrawalsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Withdrawal not found" }); return; }

  if (!req.isAdmin) {
    res.status(403).json({ error: "Réservé aux administrateurs" }); return;
  }

  await db.delete(withdrawalsTable).where(eq(withdrawalsTable.id, id));
  res.json({ success: true });
});

export default router;
