import { Router, type IRouter } from "express";
import { db, depositsTable, usersTable, notificationsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { CreateDepositBody, GetDepositsQueryParams, RejectDepositBody, ValidateDepositParams, RejectDepositParams } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { tg } from "../lib/telegram";
import { sendPushNotification, notifyAdmins } from "../lib/pushNotifications";

const router: IRouter = Router();

router.get("/deposits", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = GetDepositsQueryParams.safeParse(req.query);
  const page = params.success ? (params.data.page ?? 1) : 1;
  const limit = params.success ? (params.data.limit ?? 20) : 20;
  const offset = (page - 1) * limit;

  const deposits = await db
    .select()
    .from(depositsTable)
    .where(eq(depositsTable.userId, req.userId!))
    .orderBy(desc(depositsTable.createdAt))
    .limit(limit)
    .offset(offset);

  const total = await db.$count(depositsTable, eq(depositsTable.userId, req.userId!));

  res.json({
    deposits: deposits.map((d) => ({
      ...d,
      amount: parseFloat(d.amount),
      rejectionReason: d.rejectionReason ?? null,
      referenceId: d.referenceId ?? null,
      screenshotUrl: d.screenshotUrl ?? null,
      country: d.country ?? null,
      internationalOperator: d.internationalOperator ?? null,
    })),
    total,
    page,
    limit,
  });
});

router.post("/deposits", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = CreateDepositBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { type, operator, oneXbetAccountId, internationalOperator, amount, referenceId, screenshotUrl, country } = parsed.data;

  if (type === "international" && !internationalOperator) {
    res.status(400).json({ error: "internationalOperator is required for international deposits" });
    return;
  }

  // Check unique referenceId (also enforced at the DB level as a safety net against races)
  if (referenceId) {
    const existing = await db
      .select()
      .from(depositsTable)
      .where(eq(depositsTable.referenceId, referenceId));
    if (existing.length > 0) {
      res.status(400).json({ error: "Reference ID already used" });
      return;
    }
  }

  let deposit;
  try {
    [deposit] = await db
      .insert(depositsTable)
      .values({
        userId: req.userId!,
        type,
        operator,
        oneXbetAccountId,
        internationalOperator: type === "international" ? internationalOperator : undefined,
        amount: String(amount),
        referenceId,
        screenshotUrl,
        country,
        status: "pending",
      })
      .returning();
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(400).json({ error: "Reference ID already used" });
      return;
    }
    throw err;
  }

  const [user] = await db.select({ username: usersTable.username, userId: usersTable.userId }).from(usersTable).where(eq(usersTable.id, deposit.userId));
  tg.depositCreated({
    username: user?.username ?? deposit.userId,
    userId: user?.userId ?? String(deposit.userId),
    amount: parseFloat(deposit.amount),
    type: deposit.type,
    operator: deposit.operator,
    oneXbetAccountId: deposit.oneXbetAccountId,
    country: deposit.country,
  });

  // Notify admins of new deposit
  notifyAdmins({
    title: "💰 Nouveau dépôt",
    body: `${user?.username ?? "Utilisateur"} a soumis un dépôt de ${parseFloat(deposit.amount).toLocaleString()} XOF`,
    data: { type: "new_deposit", depositId: deposit.id },
  });

  res.status(201).json({
    ...deposit,
    amount: parseFloat(deposit.amount),
    rejectionReason: null,
    referenceId: deposit.referenceId ?? null,
    screenshotUrl: deposit.screenshotUrl ?? null,
    country: deposit.country ?? null,
    internationalOperator: deposit.internationalOperator ?? null,
  });
});

router.put("/deposits/:id/validate", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [deposit] = await db
    .update(depositsTable)
    .set({ status: "validated", updatedAt: new Date() })
    .where(eq(depositsTable.id, id))
    .returning();

  if (!deposit) {
    res.status(404).json({ error: "Deposit not found" });
    return;
  }

  const [user] = await db.select({ username: usersTable.username, userId: usersTable.userId, pushToken: usersTable.pushToken }).from(usersTable).where(eq(usersTable.id, deposit.userId));

  tg.depositValidated({
    username: user?.username ?? String(deposit.userId),
    userId: user?.userId ?? String(deposit.userId),
    amount: parseFloat(deposit.amount),
    depositId: deposit.id,
  });

  // Push notification
  sendPushNotification([user?.pushToken], {
    title: "✅ Dépôt validé",
    body: `Votre dépôt de ${parseFloat(deposit.amount).toLocaleString()} XOF a été validé.`,
    data: { type: "deposit_validated", depositId: deposit.id },
  });
  // In-app notification
  db.insert(notificationsTable).values({ userId: deposit.userId, title: "✅ Dépôt validé", message: `Votre dépôt de ${parseFloat(deposit.amount).toLocaleString()} XOF a été validé.`, isRead: false }).catch(() => {});

  res.json({ ...deposit, amount: parseFloat(deposit.amount), username: user?.username, rejectionReason: null, referenceId: deposit.referenceId ?? null, screenshotUrl: deposit.screenshotUrl ?? null, country: deposit.country ?? null, internationalOperator: deposit.internationalOperator ?? null });
});

router.put("/deposits/:id/reject", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const parsed = RejectDepositBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [deposit] = await db
    .update(depositsTable)
    .set({ status: "rejected", rejectionReason: parsed.data.reason, updatedAt: new Date() })
    .where(eq(depositsTable.id, id))
    .returning();

  if (!deposit) {
    res.status(404).json({ error: "Deposit not found" });
    return;
  }

  const [user] = await db.select({ username: usersTable.username, userId: usersTable.userId, pushToken: usersTable.pushToken }).from(usersTable).where(eq(usersTable.id, deposit.userId));

  tg.depositRejected({
    username: user?.username ?? String(deposit.userId),
    userId: user?.userId ?? String(deposit.userId),
    amount: parseFloat(deposit.amount),
    depositId: deposit.id,
    reason: deposit.rejectionReason,
  });

  // Push notification
  sendPushNotification([user?.pushToken], {
    title: "❌ Dépôt rejeté",
    body: `Votre dépôt de ${parseFloat(deposit.amount).toLocaleString()} XOF a été rejeté. Motif : ${parsed.data.reason}`,
    data: { type: "deposit_rejected", depositId: deposit.id },
  });
  // In-app notification
  db.insert(notificationsTable).values({ userId: deposit.userId, title: "❌ Dépôt rejeté", message: `Votre dépôt de ${parseFloat(deposit.amount).toLocaleString()} XOF a été rejeté. Motif : ${parsed.data.reason}`, isRead: false }).catch(() => {});

  res.json({ ...deposit, amount: parseFloat(deposit.amount), username: user?.username, referenceId: deposit.referenceId ?? null, screenshotUrl: deposit.screenshotUrl ?? null, country: deposit.country ?? null, internationalOperator: deposit.internationalOperator ?? null });
});

router.delete("/deposits/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [existing] = await db.select().from(depositsTable).where(eq(depositsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Deposit not found" }); return; }

  if (!req.isAdmin) {
    res.status(403).json({ error: "Réservé aux administrateurs" }); return;
  }

  await db.delete(depositsTable).where(eq(depositsTable.id, id));
  res.json({ success: true });
});

export default router;
