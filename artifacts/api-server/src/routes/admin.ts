import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, depositsTable, withdrawalsTable, paymentConfigTable, appSettingsTable } from "@workspace/db";
import { eq, ilike, desc, or, isNotNull } from "drizzle-orm";
import {
  GetAdminUsersQueryParams,
  GetAdminDepositsQueryParams,
  GetAdminWithdrawalsQueryParams,
  UpdateAdminUserBody,
  UpdateAdminUserParams,
  UpdateAppSettingsBody,
} from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

// Stats
router.get("/admin/stats", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const [totalUsers, vipUsers] = await Promise.all([
    db.$count(usersTable),
    db.$count(usersTable, eq(usersTable.isVip, true)),
  ]);

  const allDeposits = await db.select({ status: depositsTable.status, amount: depositsTable.amount }).from(depositsTable);
  const allWithdrawals = await db.select({ status: withdrawalsTable.status, amount: withdrawalsTable.amount }).from(withdrawalsTable);

  const totalDeposits = allDeposits.length;
  const pendingDeposits = allDeposits.filter((d) => d.status === "pending").length;
  const totalDepositAmount = allDeposits
    .filter((d) => d.status === "validated")
    .reduce((sum, d) => sum + parseFloat(d.amount), 0);

  const totalWithdrawals = allWithdrawals.length;
  const pendingWithdrawals = allWithdrawals.filter((w) => w.status === "pending").length;
  const totalWithdrawalAmount = allWithdrawals
    .filter((w) => w.status === "processed")
    .reduce((sum, w) => sum + parseFloat(w.amount), 0);

  const totalReferrals = await db.$count(usersTable, isNotNull(usersTable.referredById));

  res.json({
    totalUsers,
    vipUsers,
    totalDeposits,
    pendingDeposits,
    totalDepositAmount,
    totalWithdrawals,
    pendingWithdrawals,
    totalWithdrawalAmount,
    totalReferrals,
  });
});

// Users
router.get("/admin/users", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const params = GetAdminUsersQueryParams.safeParse(req.query);
  const page = params.success ? (params.data.page ?? 1) : 1;
  const limit = params.success ? (params.data.limit ?? 20) : 20;
  const search = params.success ? params.data.search : undefined;
  const offset = (page - 1) * limit;

  let users;
  let total: number;

  if (search) {
    users = await db
      .select()
      .from(usersTable)
      .where(or(ilike(usersTable.username, `%${search}%`), ilike(usersTable.phone, `%${search}%`)))
      .orderBy(desc(usersTable.createdAt))
      .limit(limit)
      .offset(offset);
    total = users.length;
  } else {
    users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt)).limit(limit).offset(offset);
    total = await db.$count(usersTable);
  }

  // Compute referral counts for all returned users
  const allReferred = await db
    .select({ referredById: usersTable.referredById })
    .from(usersTable);

  const referralCounts: Record<number, number> = {};
  for (const u of allReferred) {
    if (u.referredById != null) {
      referralCounts[u.referredById] = (referralCounts[u.referredById] ?? 0) + 1;
    }
  }

  res.json({
    users: users.map((u) => ({
      id: u.id,
      username: u.username,
      phone: u.phone,
      userId: u.userId,
      referralCode: u.referralCode,
      referralCount: referralCounts[u.id] ?? 0,
      isVip: u.isVip,
      isAdmin: u.isAdmin,
      isBanned: u.isBanned,
      createdAt: u.createdAt,
    })),
    total,
    page,
    limit,
  });
});

router.put("/admin/users/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const parsed = UpdateAdminUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (parsed.data.isAdmin === false && id === req.userId) {
    res.status(400).json({ error: "Vous ne pouvez pas retirer vos propres droits admin." });
    return;
  }

  const updateData: Partial<{ isVip: boolean; isBanned: boolean; isAdmin: boolean; updatedAt: Date }> = {
    updatedAt: new Date(),
  };
  if (parsed.data.isVip !== undefined) updateData.isVip = parsed.data.isVip;
  if (parsed.data.isBanned !== undefined) updateData.isBanned = parsed.data.isBanned;
  if (parsed.data.isAdmin !== undefined) updateData.isAdmin = parsed.data.isAdmin;

  const [user] = await db.update(usersTable).set(updateData).where(eq(usersTable.id, id)).returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const allReferred = await db
    .select({ referredById: usersTable.referredById })
    .from(usersTable);

  const referralCounts: Record<number, number> = {};
  for (const u of allReferred) {
    if (u.referredById != null) {
      referralCounts[u.referredById] = (referralCounts[u.referredById] ?? 0) + 1;
    }
  }

  res.json({
    id: user.id,
    username: user.username,
    phone: user.phone,
    userId: user.userId,
    referralCode: user.referralCode,
    referralCount: referralCounts[user.id] ?? 0,
    isVip: user.isVip,
    isAdmin: user.isAdmin,
    isBanned: user.isBanned,
    createdAt: user.createdAt,
  });
});

// Delete user
router.delete("/admin/users/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  if (id === req.userId) {
    res.status(400).json({ error: "Vous ne pouvez pas supprimer votre propre compte." });
    return;
  }
  const [deleted] = await db.delete(usersTable).where(eq(usersTable.id, id)).returning();
  if (!deleted) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ success: true });
});

// Deposits
router.get("/admin/deposits", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const params = GetAdminDepositsQueryParams.safeParse(req.query);
  const page = params.success ? (params.data.page ?? 1) : 1;
  const status = params.success ? params.data.status : undefined;
  const limit = 20;
  const offset = (page - 1) * limit;

  let deposits;
  if (status) {
    deposits = await db
      .select({ d: depositsTable, username: usersTable.username })
      .from(depositsTable)
      .leftJoin(usersTable, eq(depositsTable.userId, usersTable.id))
      .where(eq(depositsTable.status, status))
      .orderBy(desc(depositsTable.createdAt))
      .limit(limit)
      .offset(offset);
  } else {
    deposits = await db
      .select({ d: depositsTable, username: usersTable.username })
      .from(depositsTable)
      .leftJoin(usersTable, eq(depositsTable.userId, usersTable.id))
      .orderBy(desc(depositsTable.createdAt))
      .limit(limit)
      .offset(offset);
  }

  const total = status
    ? await db.$count(depositsTable, eq(depositsTable.status, status))
    : await db.$count(depositsTable);

  res.json({
    deposits: deposits.map(({ d, username }) => ({
      ...d,
      username: username ?? undefined,
      amount: parseFloat(d.amount),
      referenceId: d.referenceId ?? null,
      screenshotUrl: d.screenshotUrl ?? null,
      country: d.country ?? null,
      rejectionReason: d.rejectionReason ?? null,
    })),
    total,
    page,
    limit,
  });
});

// Withdrawals
router.get("/admin/withdrawals", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const params = GetAdminWithdrawalsQueryParams.safeParse(req.query);
  const page = params.success ? (params.data.page ?? 1) : 1;
  const status = params.success ? params.data.status : undefined;
  const limit = 20;
  const offset = (page - 1) * limit;

  let withdrawals;
  if (status) {
    withdrawals = await db
      .select({ w: withdrawalsTable, username: usersTable.username })
      .from(withdrawalsTable)
      .leftJoin(usersTable, eq(withdrawalsTable.userId, usersTable.id))
      .where(eq(withdrawalsTable.status, status))
      .orderBy(desc(withdrawalsTable.createdAt))
      .limit(limit)
      .offset(offset);
  } else {
    withdrawals = await db
      .select({ w: withdrawalsTable, username: usersTable.username })
      .from(withdrawalsTable)
      .leftJoin(usersTable, eq(withdrawalsTable.userId, usersTable.id))
      .orderBy(desc(withdrawalsTable.createdAt))
      .limit(limit)
      .offset(offset);
  }

  const total = status
    ? await db.$count(withdrawalsTable, eq(withdrawalsTable.status, status))
    : await db.$count(withdrawalsTable);

  res.json({
    withdrawals: withdrawals.map(({ w, username }) => ({
      ...w,
      username: username ?? undefined,
      amount: parseFloat(w.amount),
      code: w.code ?? null,
    })),
    total,
    page,
    limit,
  });
});

// Payment Config
router.get("/admin/payment-config", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  let [config] = await db.select().from(paymentConfigTable).limit(1);

  if (!config) {
    // Initialize default config
    [config] = await db
      .insert(paymentConfigTable)
      .values({ tmoneyEnabled: true, moovMoneyEnabled: false })
      .returning();
  }

  res.json({
    tmoneyEnabled: config.tmoneyEnabled,
    moovMoneyEnabled: config.moovMoneyEnabled,
    moovMoneyNumber: config.moovMoneyNumber ?? null,
    moovMoneyUssdCode: config.moovMoneyUssdCode ?? null,
    internationalPaymentApiUrl: config.internationalPaymentApiUrl ?? null,
    internationalPaymentApiKey: config.internationalPaymentApiKey ?? null,
    ashtechpayApiKey: config.ashtechpayApiKey ?? null,
  });
});

router.put("/admin/payment-config", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const { tmoneyEnabled, moovMoneyEnabled, moovMoneyNumber, moovMoneyUssdCode, internationalPaymentApiUrl, internationalPaymentApiKey, ashtechpayApiKey } = req.body;

  let [existing] = await db.select().from(paymentConfigTable).limit(1);

  if (!existing) {
    [existing] = await db
      .insert(paymentConfigTable)
      .values({ tmoneyEnabled, moovMoneyEnabled, moovMoneyNumber, moovMoneyUssdCode, internationalPaymentApiUrl, internationalPaymentApiKey, ashtechpayApiKey })
      .returning();
  } else {
    [existing] = await db
      .update(paymentConfigTable)
      .set({ tmoneyEnabled, moovMoneyEnabled, moovMoneyNumber, moovMoneyUssdCode, internationalPaymentApiUrl, internationalPaymentApiKey, ashtechpayApiKey, updatedAt: new Date() })
      .where(eq(paymentConfigTable.id, existing.id))
      .returning();
  }

  res.json({
    tmoneyEnabled: existing.tmoneyEnabled,
    moovMoneyEnabled: existing.moovMoneyEnabled,
    moovMoneyNumber: existing.moovMoneyNumber ?? null,
    moovMoneyUssdCode: existing.moovMoneyUssdCode ?? null,
    internationalPaymentApiUrl: existing.internationalPaymentApiUrl ?? null,
    internationalPaymentApiKey: existing.internationalPaymentApiKey ?? null,
    ashtechpayApiKey: existing.ashtechpayApiKey ?? null,
  });
});

// App settings (maintenance mode, VIP price)
router.put("/admin/app-settings", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const parsed = UpdateAppSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const {
    maintenanceMode, maintenanceMessage, vipPriceFcfa,
    whatsappChannelUrl, whatsappSupport1Url, whatsappSupport2Url, telegramSupportUrl,
  } = parsed.data;

  const patch = {
    maintenanceMode,
    maintenanceMessage,
    vipPriceFcfa: String(vipPriceFcfa),
    whatsappChannelUrl: whatsappChannelUrl ?? null,
    whatsappSupport1Url: whatsappSupport1Url ?? null,
    whatsappSupport2Url: whatsappSupport2Url ?? null,
    telegramSupportUrl: telegramSupportUrl ?? null,
  };

  let [existing] = await db.select().from(appSettingsTable).limit(1);

  if (!existing) {
    [existing] = await db.insert(appSettingsTable).values(patch).returning();
  } else {
    [existing] = await db
      .update(appSettingsTable)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(appSettingsTable.id, existing.id))
      .returning();
  }

  res.json({
    maintenanceMode: existing.maintenanceMode,
    maintenanceMessage: existing.maintenanceMessage ?? null,
    vipPriceFcfa: parseFloat(existing.vipPriceFcfa),
    whatsappChannelUrl: existing.whatsappChannelUrl ?? null,
    whatsappSupport1Url: existing.whatsappSupport1Url ?? null,
    whatsappSupport2Url: existing.whatsappSupport2Url ?? null,
    telegramSupportUrl: existing.telegramSupportUrl ?? null,
  });
});

// Reset user password
router.post("/admin/users/:id/reset-password", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.isAdmin) { res.status(403).json({ error: "Admin access required" }); return; }

  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { newPassword } = req.body as { newPassword?: string };
  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({ error: "Le mot de passe doit faire au moins 6 caractères." });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  const [user] = await db
    .update(usersTable)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(usersTable.id, id))
    .returning({ id: usersTable.id });

  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  res.json({ success: true });
});

// Reset counters — supprime tous les dépôts et retraits (admin seulement)
router.post("/admin/reset-counters", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.isAdmin) { res.status(403).json({ error: "Admin access required" }); return; }

  const [deletedDeposits, deletedWithdrawals] = await Promise.all([
    db.delete(depositsTable).returning({ id: depositsTable.id }),
    db.delete(withdrawalsTable).returning({ id: withdrawalsTable.id }),
  ]);

  res.json({
    success: true,
    deletedDeposits: deletedDeposits.length,
    deletedWithdrawals: deletedWithdrawals.length,
  });
});

export default router;
