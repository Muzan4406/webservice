// src/app.ts
import express from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { join as join3, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// src/routes/index.ts
import { Router as Router18 } from "express";

// src/routes/health.ts
import { Router } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
var router = Router();
router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});
var health_default = router;

// src/routes/auth.ts
import { Router as Router2 } from "express";
import bcrypt from "bcryptjs";
import { db as db2, usersTable as usersTable2, sessionsTable as sessionsTable2 } from "@workspace/db";
import { eq as eq2, or } from "drizzle-orm";
import { RegisterBody, LoginBody } from "@workspace/api-zod";

// src/lib/auth.ts
import crypto from "crypto";
function generateToken() {
  return crypto.randomBytes(48).toString("hex");
}
function generateUserId(id) {
  return `MS-${String(id).padStart(5, "0")}`;
}
function generateReferralCode(username) {
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${username.slice(0, 4).toUpperCase()}${rand}`;
}

// src/middlewares/auth.ts
import { db, sessionsTable, usersTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  const now = /* @__PURE__ */ new Date();
  const [session] = await db.select().from(sessionsTable).where(and(eq(sessionsTable.token, token), gt(sessionsTable.expiresAt, now)));
  if (!session) {
    res.status(401).json({ error: "Session expired or invalid" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId));
  if (!user || user.isBanned) {
    res.status(401).json({ error: "Account not found or banned" });
    return;
  }
  req.userId = user.id;
  req.user = user;
  req.isAdmin = user.isAdmin;
  next();
}
async function requireAdmin(req, res, next) {
  await requireAuth(req, res, async () => {
    if (!req.isAdmin) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    next();
  });
}

// src/lib/logger.ts
import pino from "pino";
var isProduction = process.env.NODE_ENV === "production";
var logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "res.headers['set-cookie']"
  ],
  ...isProduction ? {} : {
    transport: {
      target: "pino-pretty",
      options: { colorize: true }
    }
  }
});

// src/lib/telegram.ts
var TELEGRAM_API = "https://api.telegram.org";
function getBotConfig() {
  const token = process.env["TELEGRAM_BOT_TOKEN"];
  const chatId = process.env["TELEGRAM_CHAT_ID"];
  if (!token || !chatId) return null;
  return { token, chatId };
}
async function sendAlert(message) {
  const config = getBotConfig();
  if (!config) return;
  try {
    const res = await fetch(
      `${TELEGRAM_API}/bot${config.token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: config.chatId,
          text: message,
          parse_mode: "HTML"
        })
      }
    );
    if (!res.ok) {
      const body = await res.text();
      logger.warn({ status: res.status, body }, "Telegram alert failed");
    }
  } catch (err) {
    logger.warn({ err }, "Telegram alert error");
  }
}
var tg = {
  depositCreated(opts) {
    const flag = countryFlag(opts.country);
    return sendAlert(
      `\u{1F4B0} <b>Nouveau d\xE9p\xF4t</b>
\u{1F464} ${opts.username} (${opts.userId})
\u{1F4B5} ${fmt(opts.amount)} FCFA
\u{1F4F1} ${opts.operator} \u2022 ${opts.type}${flag ? ` \u2022 ${flag}` : ""}
\u{1F3E6} Compte 1xBet : <code>${opts.oneXbetAccountId}</code>`
    );
  },
  depositSendavapay(opts) {
    const flag = countryFlag(opts.country);
    return sendAlert(
      `\u{1F4B0} <b>D\xE9p\xF4t SendavaPay confirm\xE9</b>
\u{1F464} ${opts.username} (${opts.userId})
\u{1F4B5} ${fmt(opts.amount)} FCFA${flag ? ` \u2022 ${flag}` : ""}
\u{1F516} R\xE9f : <code>${opts.reference}</code>`
    );
  },
  depositValidated(opts) {
    return sendAlert(
      `\u2705 <b>D\xE9p\xF4t valid\xE9</b>
\u{1F464} ${opts.username} (${opts.userId})
\u{1F4B5} ${fmt(opts.amount)} FCFA
\u{1F194} D\xE9p\xF4t #${opts.depositId}`
    );
  },
  depositRejected(opts) {
    return sendAlert(
      `\u274C <b>D\xE9p\xF4t rejet\xE9</b>
\u{1F464} ${opts.username} (${opts.userId})
\u{1F4B5} ${fmt(opts.amount)} FCFA
\u{1F194} D\xE9p\xF4t #${opts.depositId}` + (opts.reason ? `
\u{1F4DD} Motif : ${opts.reason}` : "")
    );
  },
  withdrawalCreated(opts) {
    const flag = countryFlag(opts.country);
    return sendAlert(
      `\u{1F4E4} <b>Nouvelle demande de retrait</b>
\u{1F464} ${opts.username} (${opts.userId})
\u{1F4B5} ${fmt(opts.amount)} FCFA
\u{1F4F1} ${opts.operator} \u2022 <code>${opts.phone}</code>${flag ? ` \u2022 ${flag}` : ""}`
    );
  },
  withdrawalProcessed(opts) {
    return sendAlert(
      `\u2705 <b>Retrait trait\xE9</b>
\u{1F464} ${opts.username} (${opts.userId})
\u{1F4B5} ${fmt(opts.amount)} FCFA
\u{1F194} Retrait #${opts.withdrawalId}`
    );
  },
  vipActivated(opts) {
    return sendAlert(
      `\u2B50 <b>VIP activ\xE9</b>
\u{1F464} ${opts.username} (${opts.userId})` + (opts.amount ? `
\u{1F4B5} ${fmt(opts.amount)} FCFA` : "")
    );
  },
  newUser(opts) {
    const flag = countryFlag(opts.country);
    return sendAlert(
      `\u{1F195} <b>Nouvel utilisateur</b>
\u{1F464} ${opts.username} (${opts.userId})${flag ? ` ${flag}` : ""}` + (opts.referredBy ? `
\u{1F517} Parrain\xE9 par : ${opts.referredBy}` : "")
    );
  }
};
function fmt(amount) {
  return amount.toLocaleString("fr-FR");
}
function countryFlag(country) {
  if (!country || country.length !== 2) return "";
  return country.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

// src/routes/auth.ts
var router2 = Router2();
async function createSession(userId) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3);
  await db2.insert(sessionsTable2).values({ userId, token, expiresAt });
  return { token, expiresAt };
}
function buildUserResponse(user, referralCount = 0) {
  return {
    id: user.id,
    username: user.username,
    phone: user.phone ?? null,
    userId: user.userId,
    referralCode: user.referralCode,
    referralCount,
    activeReferralCount: 0,
    isVip: user.isVip,
    isAdmin: user.isAdmin,
    photoUrl: user.photoUrl,
    createdAt: user.createdAt
  };
}
router2.post("/auth/register", async (req, res) => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { username, phone, password, confirmPassword, country, referralCode, deviceId } = parsed.data;
  if (password !== confirmPassword) {
    res.status(400).json({ error: "Passwords do not match" });
    return;
  }
  const existing = await db2.select().from(usersTable2).where(or(eq2(usersTable2.username, username), eq2(usersTable2.phone, phone)));
  if (existing.length > 0) {
    res.status(400).json({ error: "Username or phone already in use" });
    return;
  }
  if (deviceId) {
    const [deviceUser] = await db2.select({ id: usersTable2.id }).from(usersTable2).where(eq2(usersTable2.deviceId, deviceId));
    if (deviceUser) {
      res.status(400).json({ error: "Un compte existe d\xE9j\xE0 sur cet appareil." });
      return;
    }
  }
  let referredById = null;
  if (referralCode) {
    const [referrer] = await db2.select().from(usersTable2).where(eq2(usersTable2.referralCode, referralCode));
    if (referrer) referredById = referrer.id;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const tempCode = generateReferralCode(username);
  const [newUser] = await db2.insert(usersTable2).values({
    username,
    phone,
    passwordHash,
    userId: "MS-TEMP",
    referralCode: tempCode,
    referredById,
    country: country ?? null,
    deviceId: deviceId ?? null
  }).returning();
  const realUserId = generateUserId(newUser.id);
  const [user] = await db2.update(usersTable2).set({ userId: realUserId }).where(eq2(usersTable2.id, newUser.id)).returning();
  const { token } = await createSession(user.id);
  let referredByUsername = null;
  if (referredById) {
    const [referrer] = await db2.select({ username: usersTable2.username }).from(usersTable2).where(eq2(usersTable2.id, referredById));
    referredByUsername = referrer?.username ?? null;
  }
  tg.newUser({ username: user.username, userId: user.userId, country: user.country, referredBy: referredByUsername });
  res.status(201).json({ user: buildUserResponse(user, 0), token });
});
router2.post("/auth/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { identifier, password } = parsed.data;
  const [user] = await db2.select().from(usersTable2).where(or(eq2(usersTable2.phone, identifier), eq2(usersTable2.username, identifier)));
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  if (user.isBanned) {
    res.status(401).json({ error: "Account is banned" });
    return;
  }
  if (!user.passwordHash) {
    res.status(401).json({ error: "Ce compte utilise la connexion Google. Veuillez vous connecter avec Google." });
    return;
  }
  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const { token } = await createSession(user.id);
  const referralCount = await db2.$count(usersTable2, eq2(usersTable2.referredById, user.id));
  res.json({ user: buildUserResponse(user, referralCount), token });
});
router2.post("/auth/google", async (req, res) => {
  const { accessToken, deviceId, country, referralCode } = req.body;
  if (!accessToken) {
    res.status(400).json({ error: "accessToken is required" });
    return;
  }
  let googleUser;
  try {
    const googleRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!googleRes.ok) {
      res.status(401).json({ error: "Invalid Google access token" });
      return;
    }
    googleUser = await googleRes.json();
  } catch {
    res.status(500).json({ error: "Failed to verify Google token" });
    return;
  }
  const { sub: googleId, email, name, picture } = googleUser;
  let existingUser = (await db2.select().from(usersTable2).where(eq2(usersTable2.googleId, googleId)))[0];
  if (!existingUser && deviceId) {
    const [deviceUser] = await db2.select({ id: usersTable2.id }).from(usersTable2).where(eq2(usersTable2.deviceId, deviceId));
    if (deviceUser) {
      res.status(400).json({ error: "Un compte existe d\xE9j\xE0 sur cet appareil." });
      return;
    }
  }
  if (existingUser) {
    if (existingUser.isBanned) {
      res.status(401).json({ error: "Account is banned" });
      return;
    }
    const { token: token2 } = await createSession(existingUser.id);
    const referralCount = await db2.$count(usersTable2, eq2(usersTable2.referredById, existingUser.id));
    res.json({ user: buildUserResponse(existingUser, referralCount), token: token2 });
    return;
  }
  const baseUsername = (name ?? email.split("@")[0]).toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 20);
  let username = baseUsername;
  let suffix = 1;
  while (true) {
    const [taken] = await db2.select({ id: usersTable2.id }).from(usersTable2).where(eq2(usersTable2.username, username));
    if (!taken) break;
    username = `${baseUsername}${suffix++}`;
  }
  let referredById = null;
  if (referralCode) {
    const [referrer] = await db2.select().from(usersTable2).where(eq2(usersTable2.referralCode, referralCode));
    if (referrer) referredById = referrer.id;
  }
  const tempCode = generateReferralCode(username);
  const [newUser] = await db2.insert(usersTable2).values({
    username,
    phone: null,
    passwordHash: null,
    userId: "MS-TEMP",
    referralCode: tempCode,
    referredById,
    country: country ?? null,
    googleId,
    deviceId: deviceId ?? null,
    photoUrl: picture ?? null
  }).returning();
  const realUserId = generateUserId(newUser.id);
  const [user] = await db2.update(usersTable2).set({ userId: realUserId }).where(eq2(usersTable2.id, newUser.id)).returning();
  let referredByUsername = null;
  if (referredById) {
    const [referrer] = await db2.select({ username: usersTable2.username }).from(usersTable2).where(eq2(usersTable2.id, referredById));
    referredByUsername = referrer?.username ?? null;
  }
  tg.newUser({ username: user.username, userId: user.userId, country: user.country, referredBy: referredByUsername });
  const { token } = await createSession(user.id);
  res.status(201).json({ user: buildUserResponse(user, 0), token });
});
router2.post("/auth/logout", requireAuth, async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.slice(7);
  if (token) {
    await db2.delete(sessionsTable2).where(eq2(sessionsTable2.token, token));
  }
  res.json({ success: true });
});
var auth_default = router2;

// src/routes/profile.ts
import { Router as Router3 } from "express";
import { db as db3, usersTable as usersTable3, depositsTable } from "@workspace/db";
import { eq as eq3, and as and2 } from "drizzle-orm";
import { UpdateProfileBody } from "@workspace/api-zod";
var router3 = Router3();
async function getReferralCount(userId) {
  return db3.$count(usersTable3, eq3(usersTable3.referredById, userId));
}
async function getActiveReferralCount(userId) {
  const rows = await db3.selectDistinct({ uid: usersTable3.id }).from(usersTable3).innerJoin(
    depositsTable,
    and2(eq3(depositsTable.userId, usersTable3.id), eq3(depositsTable.status, "validated"))
  ).where(eq3(usersTable3.referredById, userId));
  return rows.length;
}
router3.get("/profile", requireAuth, async (req, res) => {
  const user = req.user;
  const [referralCount, activeReferralCount] = await Promise.all([
    getReferralCount(user.id),
    getActiveReferralCount(user.id)
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
    createdAt: user.createdAt
  });
});
router3.put("/profile", requireAuth, async (req, res) => {
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [updated] = await db3.update(usersTable3).set({ photoUrl: parsed.data.photoUrl, updatedAt: /* @__PURE__ */ new Date() }).where(eq3(usersTable3.id, req.userId)).returning();
  const [referralCount, activeReferralCount] = await Promise.all([
    getReferralCount(updated.id),
    getActiveReferralCount(updated.id)
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
    createdAt: updated.createdAt
  });
});
var profile_default = router3;

// src/routes/deposits.ts
import { Router as Router4 } from "express";
import { db as db4, depositsTable as depositsTable2, usersTable as usersTable4, notificationsTable } from "@workspace/db";
import { eq as eq4, desc } from "drizzle-orm";
import { CreateDepositBody, GetDepositsQueryParams, RejectDepositBody } from "@workspace/api-zod";

// src/lib/pushNotifications.ts
async function sendPushNotification(_tokens, _message) {
}
async function notifyAdmins(_message) {
}
async function broadcastPushNotification(_allTokens, _message) {
}

// src/routes/deposits.ts
var router4 = Router4();
router4.get("/deposits", requireAuth, async (req, res) => {
  const params = GetDepositsQueryParams.safeParse(req.query);
  const page = params.success ? params.data.page ?? 1 : 1;
  const limit = params.success ? params.data.limit ?? 20 : 20;
  const offset = (page - 1) * limit;
  const deposits = await db4.select().from(depositsTable2).where(eq4(depositsTable2.userId, req.userId)).orderBy(desc(depositsTable2.createdAt)).limit(limit).offset(offset);
  const total = await db4.$count(depositsTable2, eq4(depositsTable2.userId, req.userId));
  res.json({
    deposits: deposits.map((d) => ({
      ...d,
      amount: parseFloat(d.amount),
      rejectionReason: d.rejectionReason ?? null,
      referenceId: d.referenceId ?? null,
      screenshotUrl: d.screenshotUrl ?? null,
      country: d.country ?? null,
      internationalOperator: d.internationalOperator ?? null
    })),
    total,
    page,
    limit
  });
});
router4.post("/deposits", requireAuth, async (req, res) => {
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
  if (referenceId) {
    const existing = await db4.select().from(depositsTable2).where(eq4(depositsTable2.referenceId, referenceId));
    if (existing.length > 0) {
      res.status(400).json({ error: "Reference ID already used" });
      return;
    }
  }
  let deposit;
  try {
    [deposit] = await db4.insert(depositsTable2).values({
      userId: req.userId,
      type,
      operator,
      oneXbetAccountId,
      internationalOperator: type === "international" ? internationalOperator : void 0,
      amount: String(amount),
      referenceId,
      screenshotUrl,
      country,
      status: "pending"
    }).returning();
  } catch (err) {
    if (err?.code === "23505") {
      res.status(400).json({ error: "Reference ID already used" });
      return;
    }
    throw err;
  }
  const [user] = await db4.select({ username: usersTable4.username, userId: usersTable4.userId }).from(usersTable4).where(eq4(usersTable4.id, deposit.userId));
  tg.depositCreated({
    username: user?.username ?? deposit.userId,
    userId: user?.userId ?? String(deposit.userId),
    amount: parseFloat(deposit.amount),
    type: deposit.type,
    operator: deposit.operator,
    oneXbetAccountId: deposit.oneXbetAccountId,
    country: deposit.country
  });
  notifyAdmins({
    title: "\u{1F4B0} Nouveau d\xE9p\xF4t",
    body: `${user?.username ?? "Utilisateur"} a soumis un d\xE9p\xF4t de ${parseFloat(deposit.amount).toLocaleString()} XOF`,
    data: { type: "new_deposit", depositId: deposit.id }
  });
  res.status(201).json({
    ...deposit,
    amount: parseFloat(deposit.amount),
    rejectionReason: null,
    referenceId: deposit.referenceId ?? null,
    screenshotUrl: deposit.screenshotUrl ?? null,
    country: deposit.country ?? null,
    internationalOperator: deposit.internationalOperator ?? null
  });
});
router4.put("/deposits/:id/validate", requireAuth, async (req, res) => {
  if (!req.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  const [deposit] = await db4.update(depositsTable2).set({ status: "validated", updatedAt: /* @__PURE__ */ new Date() }).where(eq4(depositsTable2.id, id)).returning();
  if (!deposit) {
    res.status(404).json({ error: "Deposit not found" });
    return;
  }
  const [user] = await db4.select({ username: usersTable4.username, userId: usersTable4.userId, pushToken: usersTable4.pushToken }).from(usersTable4).where(eq4(usersTable4.id, deposit.userId));
  tg.depositValidated({
    username: user?.username ?? String(deposit.userId),
    userId: user?.userId ?? String(deposit.userId),
    amount: parseFloat(deposit.amount),
    depositId: deposit.id
  });
  sendPushNotification([user?.pushToken], {
    title: "\u2705 D\xE9p\xF4t valid\xE9",
    body: `Votre d\xE9p\xF4t de ${parseFloat(deposit.amount).toLocaleString()} XOF a \xE9t\xE9 valid\xE9.`,
    data: { type: "deposit_validated", depositId: deposit.id }
  });
  db4.insert(notificationsTable).values({ userId: deposit.userId, title: "\u2705 D\xE9p\xF4t valid\xE9", message: `Votre d\xE9p\xF4t de ${parseFloat(deposit.amount).toLocaleString()} XOF a \xE9t\xE9 valid\xE9.`, isRead: false }).catch(() => {
  });
  res.json({ ...deposit, amount: parseFloat(deposit.amount), username: user?.username, rejectionReason: null, referenceId: deposit.referenceId ?? null, screenshotUrl: deposit.screenshotUrl ?? null, country: deposit.country ?? null, internationalOperator: deposit.internationalOperator ?? null });
});
router4.put("/deposits/:id/reject", requireAuth, async (req, res) => {
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
  const [deposit] = await db4.update(depositsTable2).set({ status: "rejected", rejectionReason: parsed.data.reason, updatedAt: /* @__PURE__ */ new Date() }).where(eq4(depositsTable2.id, id)).returning();
  if (!deposit) {
    res.status(404).json({ error: "Deposit not found" });
    return;
  }
  const [user] = await db4.select({ username: usersTable4.username, userId: usersTable4.userId, pushToken: usersTable4.pushToken }).from(usersTable4).where(eq4(usersTable4.id, deposit.userId));
  tg.depositRejected({
    username: user?.username ?? String(deposit.userId),
    userId: user?.userId ?? String(deposit.userId),
    amount: parseFloat(deposit.amount),
    depositId: deposit.id,
    reason: deposit.rejectionReason
  });
  sendPushNotification([user?.pushToken], {
    title: "\u274C D\xE9p\xF4t rejet\xE9",
    body: `Votre d\xE9p\xF4t de ${parseFloat(deposit.amount).toLocaleString()} XOF a \xE9t\xE9 rejet\xE9. Motif : ${parsed.data.reason}`,
    data: { type: "deposit_rejected", depositId: deposit.id }
  });
  db4.insert(notificationsTable).values({ userId: deposit.userId, title: "\u274C D\xE9p\xF4t rejet\xE9", message: `Votre d\xE9p\xF4t de ${parseFloat(deposit.amount).toLocaleString()} XOF a \xE9t\xE9 rejet\xE9. Motif : ${parsed.data.reason}`, isRead: false }).catch(() => {
  });
  res.json({ ...deposit, amount: parseFloat(deposit.amount), username: user?.username, referenceId: deposit.referenceId ?? null, screenshotUrl: deposit.screenshotUrl ?? null, country: deposit.country ?? null, internationalOperator: deposit.internationalOperator ?? null });
});
router4.delete("/deposits/:id", requireAuth, async (req, res) => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  const [existing] = await db4.select().from(depositsTable2).where(eq4(depositsTable2.id, id));
  if (!existing) {
    res.status(404).json({ error: "Deposit not found" });
    return;
  }
  if (!req.isAdmin) {
    res.status(403).json({ error: "R\xE9serv\xE9 aux administrateurs" });
    return;
  }
  await db4.delete(depositsTable2).where(eq4(depositsTable2.id, id));
  res.json({ success: true });
});
var deposits_default = router4;

// src/routes/withdrawals.ts
import { Router as Router5 } from "express";
import { db as db5, withdrawalsTable, usersTable as usersTable5, notificationsTable as notificationsTable2 } from "@workspace/db";
import { eq as eq5, desc as desc2 } from "drizzle-orm";
import { CreateWithdrawalBody, GetWithdrawalsQueryParams } from "@workspace/api-zod";
var router5 = Router5();
router5.get("/withdrawals", requireAuth, async (req, res) => {
  const params = GetWithdrawalsQueryParams.safeParse(req.query);
  const page = params.success ? params.data.page ?? 1 : 1;
  const limit = params.success ? params.data.limit ?? 20 : 20;
  const offset = (page - 1) * limit;
  const withdrawals = await db5.select().from(withdrawalsTable).where(eq5(withdrawalsTable.userId, req.userId)).orderBy(desc2(withdrawalsTable.createdAt)).limit(limit).offset(offset);
  const total = await db5.$count(withdrawalsTable, eq5(withdrawalsTable.userId, req.userId));
  res.json({
    withdrawals: withdrawals.map((w) => ({
      ...w,
      amount: parseFloat(w.amount),
      code: w.code ?? null
    })),
    total,
    page,
    limit
  });
});
router5.post("/withdrawals", requireAuth, async (req, res) => {
  const parsed = CreateWithdrawalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { amount, phone, country, operator, code } = parsed.data;
  const [withdrawal] = await db5.insert(withdrawalsTable).values({
    userId: req.userId,
    amount: String(amount),
    phone,
    country,
    operator,
    code,
    status: "pending"
  }).returning();
  const [wUser] = await db5.select({ username: usersTable5.username, userId: usersTable5.userId }).from(usersTable5).where(eq5(usersTable5.id, req.userId));
  tg.withdrawalCreated({
    username: wUser?.username ?? String(req.userId),
    userId: wUser?.userId ?? String(req.userId),
    amount: parseFloat(withdrawal.amount),
    operator: withdrawal.operator,
    phone: withdrawal.phone,
    country: withdrawal.country
  });
  notifyAdmins({
    title: "\u{1F4B8} Nouveau retrait",
    body: `${wUser?.username ?? "Utilisateur"} demande un retrait de ${parseFloat(withdrawal.amount).toLocaleString()} XOF`,
    data: { type: "new_withdrawal", withdrawalId: withdrawal.id }
  });
  res.status(201).json({ ...withdrawal, amount: parseFloat(withdrawal.amount), code: withdrawal.code ?? null });
});
router5.put("/withdrawals/:id/process", requireAuth, async (req, res) => {
  if (!req.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  const [withdrawal] = await db5.update(withdrawalsTable).set({ status: "processed", updatedAt: /* @__PURE__ */ new Date() }).where(eq5(withdrawalsTable.id, id)).returning();
  if (!withdrawal) {
    res.status(404).json({ error: "Withdrawal not found" });
    return;
  }
  const [user] = await db5.select({ username: usersTable5.username, userId: usersTable5.userId, pushToken: usersTable5.pushToken }).from(usersTable5).where(eq5(usersTable5.id, withdrawal.userId));
  tg.withdrawalProcessed({
    username: user?.username ?? String(withdrawal.userId),
    userId: user?.userId ?? String(withdrawal.userId),
    amount: parseFloat(withdrawal.amount),
    withdrawalId: withdrawal.id
  });
  sendPushNotification([user?.pushToken], {
    title: "\u2705 Retrait approuv\xE9",
    body: `Votre retrait de ${parseFloat(withdrawal.amount).toLocaleString()} XOF a \xE9t\xE9 approuv\xE9 et est en cours de traitement.`,
    data: { type: "withdrawal_processed", withdrawalId: withdrawal.id }
  });
  db5.insert(notificationsTable2).values({ userId: withdrawal.userId, title: "\u2705 Retrait approuv\xE9", message: `Votre retrait de ${parseFloat(withdrawal.amount).toLocaleString()} XOF a \xE9t\xE9 approuv\xE9 et est en cours de traitement.`, isRead: false }).catch(() => {
  });
  res.json({ ...withdrawal, amount: parseFloat(withdrawal.amount), username: user?.username, code: withdrawal.code ?? null });
});
router5.put("/withdrawals/:id/reject", requireAuth, async (req, res) => {
  if (!req.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  const reason = req.body?.reason ?? "Retrait rejet\xE9 par l'administrateur";
  const [withdrawal] = await db5.update(withdrawalsTable).set({ status: "rejected", updatedAt: /* @__PURE__ */ new Date() }).where(eq5(withdrawalsTable.id, id)).returning();
  if (!withdrawal) {
    res.status(404).json({ error: "Withdrawal not found" });
    return;
  }
  const [user] = await db5.select({ username: usersTable5.username, userId: usersTable5.userId, pushToken: usersTable5.pushToken }).from(usersTable5).where(eq5(usersTable5.id, withdrawal.userId));
  tg.withdrawalProcessed({
    username: user?.username ?? String(withdrawal.userId),
    userId: user?.userId ?? String(withdrawal.userId),
    amount: parseFloat(withdrawal.amount),
    withdrawalId: withdrawal.id
  });
  sendPushNotification([user?.pushToken], {
    title: "\u274C Retrait rejet\xE9",
    body: `Votre retrait de ${parseFloat(withdrawal.amount).toLocaleString()} XOF a \xE9t\xE9 rejet\xE9. Motif : ${reason}`,
    data: { type: "withdrawal_rejected", withdrawalId: withdrawal.id }
  });
  db5.insert(notificationsTable2).values({
    userId: withdrawal.userId,
    title: "\u274C Retrait rejet\xE9",
    message: `Votre retrait de ${parseFloat(withdrawal.amount).toLocaleString()} XOF a \xE9t\xE9 rejet\xE9. Motif : ${reason}`,
    isRead: false
  }).catch(() => {
  });
  res.json({ ...withdrawal, amount: parseFloat(withdrawal.amount), username: user?.username, code: withdrawal.code ?? null });
});
router5.delete("/withdrawals/:id", requireAuth, async (req, res) => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  const [existing] = await db5.select().from(withdrawalsTable).where(eq5(withdrawalsTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Withdrawal not found" });
    return;
  }
  if (!req.isAdmin) {
    res.status(403).json({ error: "R\xE9serv\xE9 aux administrateurs" });
    return;
  }
  await db5.delete(withdrawalsTable).where(eq5(withdrawalsTable.id, id));
  res.json({ success: true });
});
var withdrawals_default = router5;

// src/routes/coupons.ts
import { Router as Router6 } from "express";
import { db as db6, couponsTable, usersTable as usersTable6 } from "@workspace/db";
import { eq as eq6, desc as desc3 } from "drizzle-orm";
import { CreateCouponBody, GetAllCouponsQueryParams } from "@workspace/api-zod";
var router6 = Router6();
function formatCoupon(c) {
  return {
    ...c,
    odds: c.odds != null ? parseFloat(c.odds) : null,
    imageUrl: c.imageUrl ?? null
  };
}
router6.get("/coupons/daily", requireAuth, async (_req, res) => {
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const coupons = await db6.select().from(couponsTable).where(eq6(couponsTable.type, "daily")).orderBy(desc3(couponsTable.createdAt));
  const todayCoupons = coupons.filter((c) => c.date === today);
  const result = todayCoupons.length > 0 ? todayCoupons : coupons.slice(0, 5);
  res.json({ coupons: result.map(formatCoupon) });
});
router6.get("/coupons/vip", requireAuth, async (req, res) => {
  if (!req.user?.isVip) {
    res.status(403).json({ error: "VIP access required" });
    return;
  }
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const coupons = await db6.select().from(couponsTable).where(eq6(couponsTable.type, "vip")).orderBy(desc3(couponsTable.createdAt));
  const todayCoupons = coupons.filter((c) => c.date === today);
  const result = todayCoupons.length > 0 ? todayCoupons : coupons.slice(0, 5);
  res.json({ coupons: result.map(formatCoupon) });
});
router6.get("/coupons/validated", requireAuth, async (_req, res) => {
  const coupons = await db6.select().from(couponsTable).where(eq6(couponsTable.type, "validated")).orderBy(desc3(couponsTable.createdAt));
  res.json({ coupons: coupons.map(formatCoupon) });
});
router6.get("/coupons/montante", requireAuth, async (req, res) => {
  if (!req.user?.isVip) {
    res.status(403).json({ error: "VIP access required" });
    return;
  }
  const coupons = await db6.select().from(couponsTable).where(eq6(couponsTable.type, "montante")).orderBy(desc3(couponsTable.createdAt));
  res.json({ coupons: coupons.map(formatCoupon) });
});
router6.get("/coupons", requireAuth, async (req, res) => {
  const params = GetAllCouponsQueryParams.safeParse(req.query);
  let coupons;
  if (params.success && params.data.type) {
    coupons = await db6.select().from(couponsTable).where(eq6(couponsTable.type, params.data.type)).orderBy(desc3(couponsTable.createdAt));
  } else {
    coupons = await db6.select().from(couponsTable).orderBy(desc3(couponsTable.createdAt));
  }
  res.json({ coupons: coupons.map(formatCoupon) });
});
router6.post("/coupons", requireAuth, async (req, res) => {
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
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const dateStr = date instanceof Date ? date.toISOString().split("T")[0] : date ? String(date) : today;
  const [coupon] = await db6.insert(couponsTable).values({ type, title, content: content ?? "", imageUrl, date: dateStr, odds: odds != null ? String(odds) : null }).returning();
  const usersWithTokens = await db6.select({ pushToken: usersTable6.pushToken, isVip: usersTable6.isVip }).from(usersTable6).where(eq6(usersTable6.isBanned, false));
  const eligibleTokens = type === "vip" ? usersWithTokens.filter((u) => u.isVip).map((u) => u.pushToken) : usersWithTokens.map((u) => u.pushToken);
  const label = type === "vip" ? "\u2B50 Nouveau coupon VIP disponible !" : "\u{1F3AF} Nouveau coupon du jour disponible !";
  broadcastPushNotification(eligibleTokens, { title: label, body: title, data: { type: "new_coupon", couponType: type } });
  res.status(201).json(formatCoupon(coupon));
});
router6.put("/coupons/:id", requireAuth, async (req, res) => {
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
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const dateStr = date instanceof Date ? date.toISOString().split("T")[0] : date ? String(date) : today;
  const [coupon] = await db6.update(couponsTable).set({ type, title, content: content ?? "", imageUrl, date: dateStr, odds: odds != null ? String(odds) : null, updatedAt: /* @__PURE__ */ new Date() }).where(eq6(couponsTable.id, id)).returning();
  if (!coupon) {
    res.status(404).json({ error: "Coupon not found" });
    return;
  }
  res.json(formatCoupon(coupon));
});
router6.delete("/coupons/:id", requireAuth, async (req, res) => {
  if (!req.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  const [deleted] = await db6.delete(couponsTable).where(eq6(couponsTable.id, id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Coupon not found" });
    return;
  }
  res.json({ success: true });
});
var coupons_default = router6;

// src/routes/vip.ts
import { Router as Router7 } from "express";
import { db as db7, usersTable as usersTable7, appSettingsTable, notificationsTable as notificationsTable3 } from "@workspace/db";
import { eq as eq7 } from "drizzle-orm";
import { ConfirmVipPurchaseBody } from "@workspace/api-zod";
var router7 = Router7();
router7.post("/vip/purchase", requireAuth, async (req, res) => {
  const user = req.user;
  if (user.isVip) {
    res.json({ message: "You are already VIP" });
    return;
  }
  let [settings] = await db7.select().from(appSettingsTable).limit(1);
  const vipPrice = settings ? parseFloat(settings.vipPriceFcfa) : 5e3;
  notifyAdmins({
    title: "\u2B50 Demande VIP",
    body: `${user.username} souhaite activer le VIP (${vipPrice.toLocaleString("fr-FR")} FCFA)`,
    data: { type: "vip_request", userId: String(user.id) }
  });
  res.json({
    message: `L'acc\xE8s VIP co\xFBte ${vipPrice.toLocaleString("fr-FR")} FCFA. Effectuez le paiement via le moyen configur\xE9 puis attendez la confirmation de l'administrateur.`,
    paymentUrl: null
  });
});
router7.post("/vip/confirm", requireAuth, async (req, res) => {
  if (!req.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  const parsed = ConfirmVipPurchaseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [user] = await db7.update(usersTable7).set({ isVip: true, updatedAt: /* @__PURE__ */ new Date() }).where(eq7(usersTable7.id, parsed.data.userId)).returning();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  sendPushNotification([user.pushToken], {
    title: "\u2B50 Acc\xE8s VIP activ\xE9 !",
    body: "F\xE9licitations ! Votre acc\xE8s VIP est maintenant actif. Profitez des coupons exclusifs.",
    data: { type: "vip_confirmed" }
  });
  db7.insert(notificationsTable3).values({
    userId: user.id,
    title: "\u2B50 Acc\xE8s VIP activ\xE9 !",
    message: "F\xE9licitations ! Votre acc\xE8s VIP est maintenant actif. Profitez des coupons exclusifs.",
    isRead: false
  }).catch(() => {
  });
  res.json({ success: true, message: `VIP activated for ${user.username}` });
});
var vip_default = router7;

// src/routes/promotions.ts
import { Router as Router8 } from "express";
import { db as db8, promotionsTable } from "@workspace/db";
import { eq as eq8, desc as desc4 } from "drizzle-orm";
import { CreatePromotionBody } from "@workspace/api-zod";
var router8 = Router8();
function formatPromotion(p) {
  return { ...p, imageUrl: p.imageUrl ?? null };
}
router8.get("/promotions", requireAuth, async (req, res) => {
  try {
    const promotions = await db8.select().from(promotionsTable).where(req.isAdmin ? void 0 : eq8(promotionsTable.isActive, true)).orderBy(desc4(promotionsTable.createdAt));
    res.json({ promotions: promotions.map(formatPromotion) });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch promotions" });
  }
});
router8.post("/promotions", requireAuth, async (req, res) => {
  if (!req.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  const parsed = CreatePromotionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [promotion] = await db8.insert(promotionsTable).values(parsed.data).returning();
  res.status(201).json(formatPromotion(promotion));
});
router8.put("/promotions/:id", requireAuth, async (req, res) => {
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
  const [promotion] = await db8.update(promotionsTable).set({ ...parsed.data, updatedAt: /* @__PURE__ */ new Date() }).where(eq8(promotionsTable.id, id)).returning();
  if (!promotion) {
    res.status(404).json({ error: "Promotion not found" });
    return;
  }
  res.json(formatPromotion(promotion));
});
router8.delete("/promotions/:id", requireAuth, async (req, res) => {
  if (!req.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  const [deleted] = await db8.delete(promotionsTable).where(eq8(promotionsTable.id, id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Promotion not found" });
    return;
  }
  res.json({ success: true });
});
var promotions_default = router8;

// src/routes/referrals.ts
import { Router as Router9 } from "express";
import { db as db9, usersTable as usersTable8, depositsTable as depositsTable3 } from "@workspace/db";
import { eq as eq9, desc as desc5, and as and3, inArray } from "drizzle-orm";
var router9 = Router9();
router9.get("/referrals", requireAuth, async (req, res) => {
  const user = req.user;
  const referrals = await db9.select({ id: usersTable8.id, username: usersTable8.username, createdAt: usersTable8.createdAt }).from(usersTable8).where(eq9(usersTable8.referredById, user.id)).orderBy(desc5(usersTable8.createdAt));
  let activeIds = /* @__PURE__ */ new Set();
  if (referrals.length > 0) {
    const rows = await db9.selectDistinct({ userId: depositsTable3.userId }).from(depositsTable3).where(
      and3(
        eq9(depositsTable3.status, "validated"),
        inArray(depositsTable3.userId, referrals.map((r) => r.id))
      )
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
      isActive: activeIds.has(r.id)
    }))
  });
});
var referrals_default = router9;

// src/routes/contest.ts
import { Router as Router10 } from "express";
import { db as db10, contestsTable, usersTable as usersTable9, depositsTable as depositsTable4 } from "@workspace/db";
import { eq as eq10, desc as desc6 } from "drizzle-orm";
import { CreateContestBody } from "@workspace/api-zod";
var router10 = Router10();
router10.get("/contest/current", requireAuth, async (_req, res) => {
  const [contest] = await db10.select().from(contestsTable).where(eq10(contestsTable.isActive, true)).orderBy(desc6(contestsTable.createdAt)).limit(1);
  res.json(contest ?? null);
});
router10.get("/contest/leaderboard", requireAuth, async (_req, res) => {
  const [allUsers, validatedDepositors] = await Promise.all([
    db10.select({
      id: usersTable9.id,
      username: usersTable9.username,
      userId: usersTable9.userId,
      referredById: usersTable9.referredById
    }).from(usersTable9),
    db10.selectDistinct({ userId: depositsTable4.userId }).from(depositsTable4).where(eq10(depositsTable4.status, "validated"))
  ]);
  const activeDepositorIds = new Set(validatedDepositors.map((d) => d.userId));
  const referralCounts = {};
  for (const user of allUsers) {
    if (user.referredById != null && activeDepositorIds.has(user.id)) {
      referralCounts[user.referredById] = (referralCounts[user.referredById] ?? 0) + 1;
    }
  }
  const usersWithCounts = allUsers.filter((u) => (referralCounts[u.id] ?? 0) > 0).map((u) => ({
    username: u.username,
    userId: u.userId,
    referralCount: referralCounts[u.id] ?? 0
  })).sort((a, b) => b.referralCount - a.referralCount).slice(0, 10).map((u, i) => ({ rank: i + 1, ...u }));
  const [activeContest] = await db10.select().from(contestsTable).where(eq10(contestsTable.isActive, true)).orderBy(desc6(contestsTable.createdAt)).limit(1);
  res.json({
    entries: usersWithCounts,
    contestEndsAt: activeContest?.endDate ?? null
  });
});
router10.post("/contest", requireAuth, async (req, res) => {
  if (!req.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  const parsed = CreateContestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [contest] = await db10.insert(contestsTable).values(parsed.data).returning();
  res.status(201).json(contest);
});
router10.put("/contest/:id", requireAuth, async (req, res) => {
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
  const [contest] = await db10.update(contestsTable).set({ ...parsed.data, updatedAt: /* @__PURE__ */ new Date() }).where(eq10(contestsTable.id, id)).returning();
  if (!contest) {
    res.status(404).json({ error: "Contest not found" });
    return;
  }
  res.json(contest);
});
var contest_default = router10;

// src/routes/notifications.ts
import { Router as Router11 } from "express";
import { db as db11, notificationsTable as notificationsTable4, usersTable as usersTable10, notificationReadsTable } from "@workspace/db";
import { eq as eq11, or as or2, desc as desc7, and as and4, inArray as inArray2 } from "drizzle-orm";
import { BroadcastNotificationBody } from "@workspace/api-zod";
var router11 = Router11();
router11.get("/notifications", requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const rows = await db11.select().from(notificationsTable4).where(or2(eq11(notificationsTable4.userId, userId), eq11(notificationsTable4.userId, -1))).orderBy(desc7(notificationsTable4.createdAt)).limit(50);
    const broadcastIds = rows.filter((n) => n.userId === -1).map((n) => n.id);
    let readBroadcastIds = /* @__PURE__ */ new Set();
    if (broadcastIds.length > 0) {
      const reads = await db11.select({ notificationId: notificationReadsTable.notificationId }).from(notificationReadsTable).where(
        and4(
          eq11(notificationReadsTable.userId, userId),
          inArray2(notificationReadsTable.notificationId, broadcastIds)
        )
      );
      readBroadcastIds = new Set(reads.map((r) => r.notificationId));
    }
    const notifications = rows.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      createdAt: n.createdAt,
      // For personal notifications use the isRead flag; for broadcasts check junction table
      isRead: n.userId === -1 ? readBroadcastIds.has(n.id) : n.isRead
    }));
    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});
router11.patch("/notifications/:id/read", requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const notifId = parseInt(req.params.id, 10);
    if (isNaN(notifId)) {
      res.status(400).json({ error: "Invalid notification id" });
      return;
    }
    const [notif] = await db11.select().from(notificationsTable4).where(eq11(notificationsTable4.id, notifId));
    if (!notif) {
      res.status(404).json({ error: "Notification not found" });
      return;
    }
    if (notif.userId === -1) {
      await db11.insert(notificationReadsTable).values({ userId, notificationId: notifId }).onConflictDoNothing();
    } else if (notif.userId === userId) {
      await db11.update(notificationsTable4).set({ isRead: true }).where(eq11(notificationsTable4.id, notifId));
    } else {
      res.status(403).json({ error: "Not your notification" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
});
router11.patch("/notifications/read-all", requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    await db11.update(notificationsTable4).set({ isRead: true }).where(and4(eq11(notificationsTable4.userId, userId), eq11(notificationsTable4.isRead, false)));
    const broadcasts = await db11.select().from(notificationsTable4).where(eq11(notificationsTable4.userId, -1));
    if (broadcasts.length > 0) {
      const broadcastIds = broadcasts.map((b) => b.id);
      const alreadyRead = await db11.select({ notificationId: notificationReadsTable.notificationId }).from(notificationReadsTable).where(
        and4(
          eq11(notificationReadsTable.userId, userId),
          inArray2(notificationReadsTable.notificationId, broadcastIds)
        )
      );
      const alreadyReadIds = new Set(alreadyRead.map((r) => r.notificationId));
      const unreadBroadcasts = broadcastIds.filter((id) => !alreadyReadIds.has(id));
      if (unreadBroadcasts.length > 0) {
        await db11.insert(notificationReadsTable).values(
          unreadBroadcasts.map((nid) => ({ userId, notificationId: nid }))
        ).onConflictDoNothing();
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to mark all as read" });
  }
});
router11.delete("/notifications/:id", requireAuth, async (req, res) => {
  try {
    if (!req.isAdmin) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    const notifId = parseInt(req.params.id, 10);
    if (isNaN(notifId)) {
      res.status(400).json({ error: "Invalid notification id" });
      return;
    }
    await db11.delete(notificationReadsTable).where(eq11(notificationReadsTable.notificationId, notifId));
    const [deleted] = await db11.delete(notificationsTable4).where(eq11(notificationsTable4.id, notifId)).returning();
    if (!deleted) {
      res.status(404).json({ error: "Notification not found" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete notification" });
  }
});
router11.post("/push-token", requireAuth, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== "string") {
      res.status(400).json({ error: "token is required" });
      return;
    }
    await db11.update(usersTable10).set({ pushToken: token }).where(eq11(usersTable10.id, req.userId));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to save push token" });
  }
});
router11.post("/notifications/broadcast", requireAuth, async (req, res) => {
  try {
    if (!req.isAdmin) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    const parsed = BroadcastNotificationBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const { title, message } = parsed.data;
    await db11.insert(notificationsTable4).values({ userId: -1, title, message, isRead: false });
    const usersWithTokens = await db11.select({ pushToken: usersTable10.pushToken }).from(usersTable10).where(eq11(usersTable10.isBanned, false));
    broadcastPushNotification(
      usersWithTokens.map((u) => u.pushToken),
      { title, body: message }
    );
    res.json({ success: true, message: "Notification broadcast sent" });
  } catch (err) {
    res.status(500).json({ error: "Failed to broadcast notification" });
  }
});
var notifications_default = router11;

// src/routes/admin.ts
import { Router as Router12 } from "express";
import bcrypt2 from "bcryptjs";
import { db as db12, usersTable as usersTable11, depositsTable as depositsTable5, withdrawalsTable as withdrawalsTable2, paymentConfigTable, appSettingsTable as appSettingsTable2 } from "@workspace/db";
import { eq as eq12, ilike, desc as desc8, or as or3, isNotNull } from "drizzle-orm";
import {
  GetAdminUsersQueryParams,
  GetAdminDepositsQueryParams,
  GetAdminWithdrawalsQueryParams,
  UpdateAdminUserBody,
  UpdateAppSettingsBody
} from "@workspace/api-zod";
var router12 = Router12();
router12.get("/admin/stats", requireAuth, async (req, res) => {
  if (!req.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  const [totalUsers, vipUsers] = await Promise.all([
    db12.$count(usersTable11),
    db12.$count(usersTable11, eq12(usersTable11.isVip, true))
  ]);
  const allDeposits = await db12.select({ status: depositsTable5.status, amount: depositsTable5.amount }).from(depositsTable5);
  const allWithdrawals = await db12.select({ status: withdrawalsTable2.status, amount: withdrawalsTable2.amount }).from(withdrawalsTable2);
  const totalDeposits = allDeposits.length;
  const pendingDeposits = allDeposits.filter((d) => d.status === "pending").length;
  const totalDepositAmount = allDeposits.filter((d) => d.status === "validated").reduce((sum, d) => sum + parseFloat(d.amount), 0);
  const totalWithdrawals = allWithdrawals.length;
  const pendingWithdrawals = allWithdrawals.filter((w) => w.status === "pending").length;
  const totalWithdrawalAmount = allWithdrawals.filter((w) => w.status === "processed").reduce((sum, w) => sum + parseFloat(w.amount), 0);
  const totalReferrals = await db12.$count(usersTable11, isNotNull(usersTable11.referredById));
  res.json({
    totalUsers,
    vipUsers,
    totalDeposits,
    pendingDeposits,
    totalDepositAmount,
    totalWithdrawals,
    pendingWithdrawals,
    totalWithdrawalAmount,
    totalReferrals
  });
});
router12.get("/admin/users", requireAuth, async (req, res) => {
  if (!req.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  const params = GetAdminUsersQueryParams.safeParse(req.query);
  const page = params.success ? params.data.page ?? 1 : 1;
  const limit = params.success ? params.data.limit ?? 20 : 20;
  const search = params.success ? params.data.search : void 0;
  const offset = (page - 1) * limit;
  let users;
  let total;
  if (search) {
    users = await db12.select().from(usersTable11).where(or3(ilike(usersTable11.username, `%${search}%`), ilike(usersTable11.phone, `%${search}%`))).orderBy(desc8(usersTable11.createdAt)).limit(limit).offset(offset);
    total = users.length;
  } else {
    users = await db12.select().from(usersTable11).orderBy(desc8(usersTable11.createdAt)).limit(limit).offset(offset);
    total = await db12.$count(usersTable11);
  }
  const allReferred = await db12.select({ referredById: usersTable11.referredById }).from(usersTable11);
  const referralCounts = {};
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
      createdAt: u.createdAt
    })),
    total,
    page,
    limit
  });
});
router12.put("/admin/users/:id", requireAuth, async (req, res) => {
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
  const updateData = {
    updatedAt: /* @__PURE__ */ new Date()
  };
  if (parsed.data.isVip !== void 0) updateData.isVip = parsed.data.isVip;
  if (parsed.data.isBanned !== void 0) updateData.isBanned = parsed.data.isBanned;
  if (parsed.data.isAdmin !== void 0) updateData.isAdmin = parsed.data.isAdmin;
  const [user] = await db12.update(usersTable11).set(updateData).where(eq12(usersTable11.id, id)).returning();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const allReferred = await db12.select({ referredById: usersTable11.referredById }).from(usersTable11);
  const referralCounts = {};
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
    createdAt: user.createdAt
  });
});
router12.delete("/admin/users/:id", requireAuth, async (req, res) => {
  if (!req.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  if (id === req.userId) {
    res.status(400).json({ error: "Vous ne pouvez pas supprimer votre propre compte." });
    return;
  }
  const [deleted] = await db12.delete(usersTable11).where(eq12(usersTable11.id, id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ success: true });
});
router12.get("/admin/deposits", requireAuth, async (req, res) => {
  if (!req.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  const params = GetAdminDepositsQueryParams.safeParse(req.query);
  const page = params.success ? params.data.page ?? 1 : 1;
  const status = params.success ? params.data.status : void 0;
  const limit = 20;
  const offset = (page - 1) * limit;
  let deposits;
  if (status) {
    deposits = await db12.select({ d: depositsTable5, username: usersTable11.username }).from(depositsTable5).leftJoin(usersTable11, eq12(depositsTable5.userId, usersTable11.id)).where(eq12(depositsTable5.status, status)).orderBy(desc8(depositsTable5.createdAt)).limit(limit).offset(offset);
  } else {
    deposits = await db12.select({ d: depositsTable5, username: usersTable11.username }).from(depositsTable5).leftJoin(usersTable11, eq12(depositsTable5.userId, usersTable11.id)).orderBy(desc8(depositsTable5.createdAt)).limit(limit).offset(offset);
  }
  const total = status ? await db12.$count(depositsTable5, eq12(depositsTable5.status, status)) : await db12.$count(depositsTable5);
  res.json({
    deposits: deposits.map(({ d, username }) => ({
      ...d,
      username: username ?? void 0,
      amount: parseFloat(d.amount),
      referenceId: d.referenceId ?? null,
      screenshotUrl: d.screenshotUrl ?? null,
      country: d.country ?? null,
      rejectionReason: d.rejectionReason ?? null
    })),
    total,
    page,
    limit
  });
});
router12.get("/admin/withdrawals", requireAuth, async (req, res) => {
  if (!req.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  const params = GetAdminWithdrawalsQueryParams.safeParse(req.query);
  const page = params.success ? params.data.page ?? 1 : 1;
  const status = params.success ? params.data.status : void 0;
  const limit = 20;
  const offset = (page - 1) * limit;
  let withdrawals;
  if (status) {
    withdrawals = await db12.select({ w: withdrawalsTable2, username: usersTable11.username }).from(withdrawalsTable2).leftJoin(usersTable11, eq12(withdrawalsTable2.userId, usersTable11.id)).where(eq12(withdrawalsTable2.status, status)).orderBy(desc8(withdrawalsTable2.createdAt)).limit(limit).offset(offset);
  } else {
    withdrawals = await db12.select({ w: withdrawalsTable2, username: usersTable11.username }).from(withdrawalsTable2).leftJoin(usersTable11, eq12(withdrawalsTable2.userId, usersTable11.id)).orderBy(desc8(withdrawalsTable2.createdAt)).limit(limit).offset(offset);
  }
  const total = status ? await db12.$count(withdrawalsTable2, eq12(withdrawalsTable2.status, status)) : await db12.$count(withdrawalsTable2);
  res.json({
    withdrawals: withdrawals.map(({ w, username }) => ({
      ...w,
      username: username ?? void 0,
      amount: parseFloat(w.amount),
      code: w.code ?? null
    })),
    total,
    page,
    limit
  });
});
router12.get("/admin/payment-config", requireAuth, async (req, res) => {
  if (!req.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  let [config] = await db12.select().from(paymentConfigTable).limit(1);
  if (!config) {
    [config] = await db12.insert(paymentConfigTable).values({ tmoneyEnabled: true, moovMoneyEnabled: false }).returning();
  }
  res.json({
    tmoneyEnabled: config.tmoneyEnabled,
    moovMoneyEnabled: config.moovMoneyEnabled,
    moovMoneyNumber: config.moovMoneyNumber ?? null,
    moovMoneyUssdCode: config.moovMoneyUssdCode ?? null,
    internationalPaymentApiUrl: config.internationalPaymentApiUrl ?? null,
    internationalPaymentApiKey: config.internationalPaymentApiKey ?? null,
    sendavapayApiKey: config.sendavapayApiKey ?? null,
    sendavapayWebhookSecret: config.sendavapayWebhookSecret ?? null
  });
});
router12.put("/admin/payment-config", requireAuth, async (req, res) => {
  if (!req.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  const { tmoneyEnabled, moovMoneyEnabled, moovMoneyNumber, moovMoneyUssdCode, internationalPaymentApiUrl, internationalPaymentApiKey, sendavapayApiKey, sendavapayWebhookSecret } = req.body;
  let [existing] = await db12.select().from(paymentConfigTable).limit(1);
  if (!existing) {
    [existing] = await db12.insert(paymentConfigTable).values({ tmoneyEnabled, moovMoneyEnabled, moovMoneyNumber, moovMoneyUssdCode, internationalPaymentApiUrl, internationalPaymentApiKey, sendavapayApiKey, sendavapayWebhookSecret }).returning();
  } else {
    [existing] = await db12.update(paymentConfigTable).set({ tmoneyEnabled, moovMoneyEnabled, moovMoneyNumber, moovMoneyUssdCode, internationalPaymentApiUrl, internationalPaymentApiKey, sendavapayApiKey, sendavapayWebhookSecret, updatedAt: /* @__PURE__ */ new Date() }).where(eq12(paymentConfigTable.id, existing.id)).returning();
  }
  res.json({
    tmoneyEnabled: existing.tmoneyEnabled,
    moovMoneyEnabled: existing.moovMoneyEnabled,
    moovMoneyNumber: existing.moovMoneyNumber ?? null,
    moovMoneyUssdCode: existing.moovMoneyUssdCode ?? null,
    internationalPaymentApiUrl: existing.internationalPaymentApiUrl ?? null,
    internationalPaymentApiKey: existing.internationalPaymentApiKey ?? null,
    sendavapayApiKey: existing.sendavapayApiKey ?? null,
    sendavapayWebhookSecret: existing.sendavapayWebhookSecret ?? null
  });
});
router12.put("/admin/app-settings", requireAuth, async (req, res) => {
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
    maintenanceMode,
    maintenanceMessage,
    vipPriceFcfa,
    whatsappChannelUrl,
    whatsappSupport1Url,
    whatsappSupport2Url,
    telegramSupportUrl
  } = parsed.data;
  const patch = {
    maintenanceMode,
    maintenanceMessage,
    vipPriceFcfa: String(vipPriceFcfa),
    whatsappChannelUrl: whatsappChannelUrl ?? null,
    whatsappSupport1Url: whatsappSupport1Url ?? null,
    whatsappSupport2Url: whatsappSupport2Url ?? null,
    telegramSupportUrl: telegramSupportUrl ?? null
  };
  let [existing] = await db12.select().from(appSettingsTable2).limit(1);
  if (!existing) {
    [existing] = await db12.insert(appSettingsTable2).values(patch).returning();
  } else {
    [existing] = await db12.update(appSettingsTable2).set({ ...patch, updatedAt: /* @__PURE__ */ new Date() }).where(eq12(appSettingsTable2.id, existing.id)).returning();
  }
  res.json({
    maintenanceMode: existing.maintenanceMode,
    maintenanceMessage: existing.maintenanceMessage ?? null,
    vipPriceFcfa: parseFloat(existing.vipPriceFcfa),
    whatsappChannelUrl: existing.whatsappChannelUrl ?? null,
    whatsappSupport1Url: existing.whatsappSupport1Url ?? null,
    whatsappSupport2Url: existing.whatsappSupport2Url ?? null,
    telegramSupportUrl: existing.telegramSupportUrl ?? null
  });
});
router12.post("/admin/users/:id/reset-password", requireAuth, async (req, res) => {
  if (!req.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({ error: "Le mot de passe doit faire au moins 6 caract\xE8res." });
    return;
  }
  const passwordHash = await bcrypt2.hash(newPassword, 10);
  const [user] = await db12.update(usersTable11).set({ passwordHash, updatedAt: /* @__PURE__ */ new Date() }).where(eq12(usersTable11.id, id)).returning({ id: usersTable11.id });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ success: true });
});
router12.post("/admin/reset-counters", requireAuth, async (req, res) => {
  if (!req.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  const [deletedDeposits, deletedWithdrawals] = await Promise.all([
    db12.delete(depositsTable5).returning({ id: depositsTable5.id }),
    db12.delete(withdrawalsTable2).returning({ id: withdrawalsTable2.id })
  ]);
  res.json({
    success: true,
    deletedDeposits: deletedDeposits.length,
    deletedWithdrawals: deletedWithdrawals.length
  });
});
var admin_default = router12;

// src/routes/upload.ts
import { Router as Router13 } from "express";
import { randomBytes } from "node:crypto";
import { writeFile, readFile, access, mkdir } from "node:fs/promises";
import { join } from "node:path";
var router13 = Router13();
var UPLOADS_DIR = join(process.cwd(), "uploads");
mkdir(UPLOADS_DIR, { recursive: true }).catch(() => {
});
router13.post("/upload", requireAuth, async (req, res) => {
  try {
    const { base64, mimeType } = req.body;
    if (!base64 || !mimeType) {
      res.status(400).json({ error: "base64 and mimeType are required" });
      return;
    }
    const ext = mimeType.includes("png") ? "png" : mimeType.includes("webm") ? "webm" : mimeType.includes("ogg") ? "ogg" : mimeType.includes("mp4") && mimeType.startsWith("audio") ? "m4a" : "jpg";
    const filename = `${randomBytes(16).toString("hex")}.${ext}`;
    const filepath = join(UPLOADS_DIR, filename);
    const buffer = Buffer.from(base64, "base64");
    await writeFile(filepath, buffer);
    res.json({ url: `/api/uploads/${filename}` });
  } catch (err) {
    console.error("Upload error:", err);
    const msg = err?.code === "ENOENT" ? "Dossier uploads introuvable sur le serveur" : err?.message ?? "Upload failed";
    res.status(500).json({ error: msg });
  }
});
router13.get("/uploads/:filename", async (req, res) => {
  try {
    const filename = req.params.filename;
    if (filename.includes("..") || filename.includes("/")) {
      res.status(400).json({ error: "Invalid filename" });
      return;
    }
    const filepath = join(UPLOADS_DIR, filename);
    try {
      await access(filepath);
    } catch {
      res.status(404).json({ error: "File not found" });
      return;
    }
    const buffer = await readFile(filepath);
    const ext = filename.split(".").pop()?.toLowerCase();
    const contentType = ext === "png" ? "image/png" : ext === "webm" ? "audio/webm" : ext === "ogg" ? "audio/ogg" : ext === "m4a" ? "audio/mp4" : "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(buffer);
  } catch (err) {
    console.error("File serve error:", err);
    res.status(500).json({ error: "Could not serve file" });
  }
});
var upload_default = router13;

// src/routes/app-settings.ts
import { Router as Router14 } from "express";
import { db as db13, appSettingsTable as appSettingsTable3 } from "@workspace/db";
var router14 = Router14();
router14.get("/app-settings", async (_req, res) => {
  let [settings] = await db13.select().from(appSettingsTable3).limit(1);
  if (!settings) {
    [settings] = await db13.insert(appSettingsTable3).values({}).returning();
  }
  res.json({
    maintenanceMode: settings.maintenanceMode,
    maintenanceMessage: settings.maintenanceMessage ?? null,
    vipPriceFcfa: parseFloat(settings.vipPriceFcfa),
    whatsappChannelUrl: settings.whatsappChannelUrl ?? null,
    whatsappSupport1Url: settings.whatsappSupport1Url ?? null,
    whatsappSupport2Url: settings.whatsappSupport2Url ?? null,
    telegramSupportUrl: settings.telegramSupportUrl ?? null
  });
});
var app_settings_default = router14;

// src/routes/transactions.ts
import { Router as Router15 } from "express";
import { db as db14, depositsTable as depositsTable6, withdrawalsTable as withdrawalsTable3 } from "@workspace/db";
import { eq as eq13, desc as desc9 } from "drizzle-orm";
var router15 = Router15();
router15.get("/transactions", requireAuth, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = 20;
  const [deposits, withdrawals] = await Promise.all([
    db14.select().from(depositsTable6).where(eq13(depositsTable6.userId, req.userId)).orderBy(desc9(depositsTable6.createdAt)),
    db14.select().from(withdrawalsTable3).where(eq13(withdrawalsTable3.userId, req.userId)).orderBy(desc9(withdrawalsTable3.createdAt))
  ]);
  const all = [
    ...deposits.map((d) => ({
      id: d.id,
      kind: "deposit",
      amount: parseFloat(d.amount),
      status: d.status,
      operator: d.operator ?? null,
      createdAt: d.createdAt
    })),
    ...withdrawals.map((w) => ({
      id: w.id,
      kind: "withdrawal",
      amount: parseFloat(w.amount),
      status: w.status,
      operator: w.operator ?? null,
      createdAt: w.createdAt
    }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const total = all.length;
  const transactions = all.slice((page - 1) * limit, page * limit);
  res.json({ transactions, total, page, limit });
});
var transactions_default = router15;

// src/routes/sendavapay.ts
import { Router as Router16 } from "express";
import { db as db15, paymentConfigTable as paymentConfigTable2, depositsTable as depositsTable7, vipPaymentsTable, appSettingsTable as appSettingsTable4, pendingSpDepositsTable, usersTable as usersTable12 } from "@workspace/db";
import { eq as eq14 } from "drizzle-orm";
var SENDAVAPAY_BASE = "https://sendavapay.com/api/sdk/v1";
var router16 = Router16();
async function getApiKey() {
  if (process.env["SENDAVAPAY_API_KEY"]) return process.env["SENDAVAPAY_API_KEY"];
  const [config] = await db15.select().from(paymentConfigTable2).limit(1);
  if (!config?.sendavapayApiKey) {
    const err = new Error("SendavaPay non configur\xE9. Veuillez contacter l'administrateur.");
    err.status = 503;
    throw err;
  }
  return config.sendavapayApiKey;
}
function authHeaders(apiKey) {
  return { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" };
}
function webhookBase() {
  if (process.env["WEBHOOK_BASE_URL"]) return process.env["WEBHOOK_BASE_URL"];
  if (process.env["REPLIT_DEV_DOMAIN"]) return `https://${process.env["REPLIT_DEV_DOMAIN"]}`;
  return "";
}
router16.get("/sendavapay/countries", async (_req, res) => {
  try {
    const apiKey = await getApiKey();
    const r = await fetch(`${SENDAVAPAY_BASE}/countries`, { headers: { "Authorization": `Bearer ${apiKey}` } });
    const data = await r.json();
    if (!data.success) {
      res.status(400).json({ error: data.error ?? "Erreur SendavaPay" });
      return;
    }
    res.json({ countries: data.data });
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});
router16.get("/sendavapay/operators/:countryCode", async (req, res) => {
  try {
    const apiKey = await getApiKey();
    const code = Array.isArray(req.params.countryCode) ? req.params.countryCode[0] : req.params.countryCode;
    const r = await fetch(`${SENDAVAPAY_BASE}/operators/${code}`, { headers: { "Authorization": `Bearer ${apiKey}` } });
    const data = await r.json();
    if (!data.success) {
      res.status(400).json({ error: data.error ?? "Erreur SendavaPay" });
      return;
    }
    res.json({ operators: data.data });
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});
router16.post("/sendavapay/create-deposit-payment", requireAuth, async (req, res) => {
  try {
    const apiKey = await getApiKey();
    const { amount, currency, payerCountry, oneXbetAccountId } = req.body;
    if (!amount || !currency || !payerCountry || !oneXbetAccountId) {
      res.status(400).json({ error: "amount, currency, payerCountry et oneXbetAccountId sont requis" });
      return;
    }
    const externalRef = `dep_${req.userId}_${Date.now()}`;
    const base = webhookBase();
    const spRes = await fetch(`${SENDAVAPAY_BASE}/create-payment`, {
      method: "POST",
      headers: authHeaders(apiKey),
      body: JSON.stringify({
        amount,
        currency,
        description: "D\xE9p\xF4t international",
        payerCountry,
        externalReference: externalRef,
        ...base ? { webhookUrl: `${base}/webhooks/sendavapay` } : {}
      })
    });
    const spData = await spRes.json();
    if (!spData.success) {
      res.status(400).json({ error: spData.error ?? "Erreur SendavaPay" });
      return;
    }
    await db15.insert(pendingSpDepositsTable).values({
      userId: req.userId,
      sendavapayReference: spData.data.reference,
      externalReference: externalRef,
      amount: String(amount),
      currency,
      payerCountry,
      oneXbetAccountId
    });
    res.json({
      paymentToken: spData.data.paymentToken,
      reference: spData.data.reference,
      depositId: null,
      amount: spData.data.amount,
      currency: spData.data.currency,
      expiresAt: spData.data.expiresAt
    });
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});
router16.post("/sendavapay/create-vip-payment", requireAuth, async (req, res) => {
  try {
    const apiKey = await getApiKey();
    const { currency, payerCountry } = req.body;
    if (!currency || !payerCountry) {
      res.status(400).json({ error: "currency et payerCountry sont requis" });
      return;
    }
    const user = req.user;
    if (user.isVip) {
      res.status(400).json({ error: "Vous \xEAtes d\xE9j\xE0 VIP" });
      return;
    }
    const [settings] = await db15.select().from(appSettingsTable4).limit(1);
    const vipPrice = settings ? parseFloat(settings.vipPriceFcfa) : 5e3;
    const externalRef = `vip_${req.userId}_${Date.now()}`;
    const base = webhookBase();
    const spRes = await fetch(`${SENDAVAPAY_BASE}/create-payment`, {
      method: "POST",
      headers: authHeaders(apiKey),
      body: JSON.stringify({
        amount: vipPrice,
        currency,
        description: "Acc\xE8s VIP",
        payerCountry,
        externalReference: externalRef,
        ...base ? { webhookUrl: `${base}/webhooks/sendavapay` } : {}
      })
    });
    const spData = await spRes.json();
    if (!spData.success) {
      res.status(400).json({ error: spData.error ?? "Erreur SendavaPay" });
      return;
    }
    await db15.insert(vipPaymentsTable).values({
      userId: req.userId,
      sendavapayReference: spData.data.reference,
      amount: String(vipPrice),
      currency,
      status: "pending"
    });
    res.json({
      paymentToken: spData.data.paymentToken,
      reference: spData.data.reference,
      depositId: null,
      amount: spData.data.amount,
      currency: spData.data.currency,
      expiresAt: spData.data.expiresAt
    });
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});
router16.post("/sendavapay/initiate", requireAuth, async (req, res) => {
  const { paymentToken, payerName, payerPhone, payerEmail, payerCountry, operatorId } = req.body;
  if (!paymentToken || !payerName || !payerPhone || !payerCountry || !operatorId) {
    res.status(400).json({ error: "Param\xE8tres manquants" });
    return;
  }
  const r = await fetch(`${SENDAVAPAY_BASE}/initiate-payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paymentToken, payerName, payerPhone, payerEmail, payerCountry, operatorId })
  });
  const data = await r.json();
  if (!data.success) {
    res.status(400).json({ error: data.error ?? "Erreur d'initiation" });
    return;
  }
  res.json({
    success: true,
    reference: data.reference,
    requiresOtp: data.requiresOtp ?? false,
    otpToken: data.otpToken ?? null,
    requiresRedirect: data.requiresRedirect ?? false,
    redirectUrl: data.redirectUrl ?? null,
    message: data.message ?? null
  });
});
router16.post("/sendavapay/submit-otp", requireAuth, async (req, res) => {
  const { otpToken, otp } = req.body;
  if (!otpToken || !otp) {
    res.status(400).json({ error: "otpToken et otp sont requis" });
    return;
  }
  const r = await fetch(`${SENDAVAPAY_BASE}/submit-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ otpToken, otp })
  });
  const data = await r.json();
  if (!data.success) {
    res.status(400).json({ error: data.error ?? "OTP invalide" });
    return;
  }
  res.json({ success: true, message: data.message ?? null });
});
router16.get("/sendavapay/status/:reference", requireAuth, async (req, res) => {
  try {
    const apiKey = await getApiKey();
    const ref = Array.isArray(req.params.reference) ? req.params.reference[0] : req.params.reference;
    const r = await fetch(`${SENDAVAPAY_BASE}/payment-status/${ref}`, {
      headers: { "Authorization": `Bearer ${apiKey}` }
    });
    const data = await r.json();
    if (!data.success) {
      const [pendingDepFail] = await db15.select().from(pendingSpDepositsTable).where(eq14(pendingSpDepositsTable.sendavapayReference, ref));
      if (pendingDepFail) {
        await db15.delete(pendingSpDepositsTable).where(eq14(pendingSpDepositsTable.id, pendingDepFail.id));
        logger.info({ ref }, "D\xE9p\xF4t SP en attente supprim\xE9 apr\xE8s \xE9chec (polling)");
      }
      res.json({ reference: ref, status: "failed", amount: null, currency: null, completedAt: null });
      return;
    }
    const status = data.data.status;
    if (status === "failed" || status === "expired") {
      const [pendingDepFail] = await db15.select().from(pendingSpDepositsTable).where(eq14(pendingSpDepositsTable.sendavapayReference, ref));
      if (pendingDepFail) {
        await db15.delete(pendingSpDepositsTable).where(eq14(pendingSpDepositsTable.id, pendingDepFail.id));
        logger.info({ ref, status }, "D\xE9p\xF4t SP en attente supprim\xE9 apr\xE8s \xE9chec/expiration (polling)");
      }
    }
    if (status === "completed") {
      const [pendingDep] = await db15.select().from(pendingSpDepositsTable).where(eq14(pendingSpDepositsTable.sendavapayReference, ref));
      if (pendingDep) {
        const existing = await db15.select().from(depositsTable7).where(eq14(depositsTable7.sendavapayReference, ref));
        if (existing.length === 0) {
          await db15.insert(depositsTable7).values({
            userId: pendingDep.userId,
            type: "international",
            operator: "other",
            oneXbetAccountId: pendingDep.oneXbetAccountId,
            amount: pendingDep.amount,
            referenceId: pendingDep.externalReference,
            sendavapayReference: ref,
            country: pendingDep.payerCountry,
            status: "pending"
          });
          await db15.delete(pendingSpDepositsTable).where(eq14(pendingSpDepositsTable.id, pendingDep.id));
          logger.info({ userId: pendingDep.userId, ref }, "D\xE9p\xF4t SP cr\xE9\xE9 via polling (webhook manqu\xE9)");
          const [depUser] = await db15.select({ username: usersTable12.username, userId: usersTable12.userId }).from(usersTable12).where(eq14(usersTable12.id, pendingDep.userId));
          tg.depositSendavapay({
            username: depUser?.username ?? String(pendingDep.userId),
            userId: depUser?.userId ?? String(pendingDep.userId),
            amount: parseFloat(pendingDep.amount),
            reference: ref,
            country: pendingDep.payerCountry
          });
        }
      }
      const [vipPayment] = await db15.select().from(vipPaymentsTable).where(eq14(vipPaymentsTable.sendavapayReference, ref));
      if (vipPayment && vipPayment.status === "pending") {
        await db15.update(vipPaymentsTable).set({ status: "completed", updatedAt: /* @__PURE__ */ new Date() }).where(eq14(vipPaymentsTable.id, vipPayment.id));
        await db15.update(usersTable12).set({ isVip: true, updatedAt: /* @__PURE__ */ new Date() }).where(eq14(usersTable12.id, vipPayment.userId));
        logger.info({ userId: vipPayment.userId }, "VIP activ\xE9 via polling (webhook manqu\xE9)");
        const [vipUser] = await db15.select({ username: usersTable12.username, userId: usersTable12.userId }).from(usersTable12).where(eq14(usersTable12.id, vipPayment.userId));
        tg.vipActivated({
          username: vipUser?.username ?? String(vipPayment.userId),
          userId: vipUser?.userId ?? String(vipPayment.userId),
          amount: parseFloat(vipPayment.amount)
        });
      }
    }
    res.json({
      reference: data.data.reference,
      status,
      amount: data.data.amount,
      currency: data.data.currency,
      completedAt: data.data.completedAt ?? null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
var sendavapay_default = router16;

// src/routes/chat.ts
import { Router as Router17 } from "express";
import { db as db16, chatMessagesTable, usersTable as usersTable13 } from "@workspace/db";
import { eq as eq15, desc as desc10, and as and5 } from "drizzle-orm";
import { unlink } from "node:fs/promises";
import { join as join2 } from "node:path";
var router17 = Router17();
var UPLOADS_DIR2 = join2(process.cwd(), "uploads");
async function removeMessageFile(fileUrl) {
  if (!fileUrl?.startsWith("/api/uploads/")) return;
  const filename = fileUrl.slice("/api/uploads/".length);
  if (!/^[a-zA-Z0-9._-]+$/.test(filename)) return;
  await unlink(join2(UPLOADS_DIR2, filename)).catch(() => {
  });
}
router17.get("/chat", requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const messages = await db16.select().from(chatMessagesTable).where(eq15(chatMessagesTable.userId, userId)).orderBy(desc10(chatMessagesTable.createdAt)).limit(100);
    await db16.update(chatMessagesTable).set({ isRead: true }).where(
      and5(
        eq15(chatMessagesTable.userId, userId),
        eq15(chatMessagesTable.fromAdmin, true),
        eq15(chatMessagesTable.isRead, false)
      )
    );
    res.json({ messages: messages.reverse() });
  } catch {
    res.status(500).json({ error: "Erreur lors du chargement des messages" });
  }
});
router17.post("/chat", requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { content, type = "text", fileUrl } = req.body;
    if (type === "text" && !content?.trim()) {
      res.status(400).json({ error: "Le message ne peut pas \xEAtre vide" });
      return;
    }
    if ((type === "audio" || type === "image") && !fileUrl) {
      res.status(400).json({ error: "fileUrl requis pour ce type de message" });
      return;
    }
    const [msg] = await db16.insert(chatMessagesTable).values({
      userId,
      fromAdmin: false,
      content: content?.trim() ?? null,
      type,
      fileUrl: fileUrl ?? null,
      isRead: false
    }).returning();
    const [sender] = await db16.select({ username: usersTable13.username }).from(usersTable13).where(eq15(usersTable13.id, userId));
    notifyAdmins({
      title: "\u{1F4AC} Nouveau message support",
      body: `${sender?.username ?? "Utilisateur"} : ${content?.trim() ?? "(fichier)"}`,
      data: { type: "new_chat_message", userId: String(userId) }
    });
    res.status(201).json({ message: msg });
  } catch {
    res.status(500).json({ error: "Erreur lors de l'envoi du message" });
  }
});
router17.delete("/chat/:messageId", requireAuth, async (req, res) => {
  try {
    const messageId = Number.parseInt(req.params.messageId, 10);
    if (Number.isNaN(messageId)) {
      res.status(400).json({ error: "Invalid messageId" });
      return;
    }
    const [message] = await db16.select().from(chatMessagesTable).where(and5(eq15(chatMessagesTable.id, messageId), eq15(chatMessagesTable.userId, req.userId)));
    if (!message) {
      res.status(404).json({ error: "Message introuvable" });
      return;
    }
    if (message.fromAdmin || message.type !== "audio" && message.type !== "image") {
      res.status(403).json({ error: "Seuls vos messages vocaux et images peuvent \xEAtre supprim\xE9s" });
      return;
    }
    await db16.delete(chatMessagesTable).where(eq15(chatMessagesTable.id, messageId));
    await removeMessageFile(message.fileUrl);
    res.status(204).send();
  } catch {
    res.status(500).json({ error: "Erreur lors de la suppression" });
  }
});
router17.get("/chat/unread", requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const rows = await db16.select().from(chatMessagesTable).where(
      and5(
        eq15(chatMessagesTable.userId, userId),
        eq15(chatMessagesTable.fromAdmin, true),
        eq15(chatMessagesTable.isRead, false)
      )
    );
    res.json({ count: rows.length });
  } catch {
    res.status(500).json({ error: "Erreur" });
  }
});
router17.get("/admin/chat/users", requireAdmin, async (_req, res) => {
  try {
    const rows = await db16.selectDistinct({ userId: chatMessagesTable.userId }).from(chatMessagesTable).orderBy(chatMessagesTable.userId);
    const userIds = rows.map((r) => r.userId);
    if (userIds.length === 0) {
      res.json({ users: [] });
      return;
    }
    const result = await Promise.all(
      userIds.map(async (uid) => {
        const [user] = await db16.select({ id: usersTable13.id, username: usersTable13.username, userId: usersTable13.userId }).from(usersTable13).where(eq15(usersTable13.id, uid));
        const [lastMsg] = await db16.select().from(chatMessagesTable).where(eq15(chatMessagesTable.userId, uid)).orderBy(desc10(chatMessagesTable.createdAt)).limit(1);
        const unreadRows = await db16.select().from(chatMessagesTable).where(
          and5(
            eq15(chatMessagesTable.userId, uid),
            eq15(chatMessagesTable.fromAdmin, false),
            eq15(chatMessagesTable.isRead, false)
          )
        );
        return {
          user: user ?? { id: uid, username: "Inconnu", userId: "" },
          lastMessage: lastMsg ?? null,
          unreadCount: unreadRows.length
        };
      })
    );
    result.sort((a, b) => {
      const ta = a.lastMessage?.createdAt?.getTime() ?? 0;
      const tb = b.lastMessage?.createdAt?.getTime() ?? 0;
      return tb - ta;
    });
    res.json({ users: result });
  } catch {
    res.status(500).json({ error: "Erreur" });
  }
});
router17.get("/admin/chat/:userId", requireAdmin, async (req, res) => {
  try {
    const uid = parseInt(req.params.userId, 10);
    if (isNaN(uid)) {
      res.status(400).json({ error: "Invalid userId" });
      return;
    }
    const messages = await db16.select().from(chatMessagesTable).where(eq15(chatMessagesTable.userId, uid)).orderBy(desc10(chatMessagesTable.createdAt)).limit(100);
    await db16.update(chatMessagesTable).set({ isRead: true }).where(
      and5(
        eq15(chatMessagesTable.userId, uid),
        eq15(chatMessagesTable.fromAdmin, false),
        eq15(chatMessagesTable.isRead, false)
      )
    );
    res.json({ messages: messages.reverse() });
  } catch {
    res.status(500).json({ error: "Erreur" });
  }
});
router17.post("/admin/chat/:userId", requireAdmin, async (req, res) => {
  try {
    const uid = parseInt(req.params.userId, 10);
    if (isNaN(uid)) {
      res.status(400).json({ error: "Invalid userId" });
      return;
    }
    const { content, type = "text", fileUrl } = req.body;
    if (type === "text" && !content?.trim()) {
      res.status(400).json({ error: "Message vide" });
      return;
    }
    const [msg] = await db16.insert(chatMessagesTable).values({
      userId: uid,
      fromAdmin: true,
      content: content?.trim() ?? null,
      type,
      fileUrl: fileUrl ?? null,
      isRead: false
    }).returning();
    const [targetUser] = await db16.select({ pushToken: usersTable13.pushToken }).from(usersTable13).where(eq15(usersTable13.id, uid));
    sendPushNotification([targetUser?.pushToken], {
      title: "\u{1F4AC} R\xE9ponse du support",
      body: content?.trim() ?? "(fichier)",
      data: { type: "admin_chat_reply", userId: String(uid) }
    });
    res.status(201).json({ message: msg });
  } catch {
    res.status(500).json({ error: "Erreur lors de l'envoi" });
  }
});
router17.delete("/admin/chat/:userId/:messageId", requireAdmin, async (req, res) => {
  try {
    const userId = Number.parseInt(req.params.userId, 10);
    const messageId = Number.parseInt(req.params.messageId, 10);
    if (Number.isNaN(userId) || Number.isNaN(messageId)) {
      res.status(400).json({ error: "Identifiants invalides" });
      return;
    }
    const [message] = await db16.select().from(chatMessagesTable).where(and5(eq15(chatMessagesTable.id, messageId), eq15(chatMessagesTable.userId, userId)));
    if (!message) {
      res.status(404).json({ error: "Message introuvable" });
      return;
    }
    if (message.type !== "audio" && message.type !== "image") {
      res.status(403).json({ error: "Seuls les messages vocaux et images peuvent \xEAtre supprim\xE9s" });
      return;
    }
    await db16.delete(chatMessagesTable).where(eq15(chatMessagesTable.id, messageId));
    await removeMessageFile(message.fileUrl);
    res.status(204).send();
  } catch {
    res.status(500).json({ error: "Erreur lors de la suppression" });
  }
});
var chat_default = router17;

// src/routes/index.ts
var router18 = Router18();
router18.use(health_default);
router18.use(auth_default);
router18.use(profile_default);
router18.use(deposits_default);
router18.use(withdrawals_default);
router18.use(coupons_default);
router18.use(vip_default);
router18.use(promotions_default);
router18.use(referrals_default);
router18.use(contest_default);
router18.use(notifications_default);
router18.use(admin_default);
router18.use(upload_default);
router18.use(app_settings_default);
router18.use(transactions_default);
router18.use(sendavapay_default);
router18.use(chat_default);
var routes_default = router18;

// src/routes/webhooks.ts
import { Router as Router19 } from "express";
import crypto2 from "node:crypto";
import { db as db17, depositsTable as depositsTable8, vipPaymentsTable as vipPaymentsTable2, usersTable as usersTable14, paymentConfigTable as paymentConfigTable3, pendingSpDepositsTable as pendingSpDepositsTable2 } from "@workspace/db";
import { eq as eq16 } from "drizzle-orm";
var router19 = Router19();
router19.post("/", async (req, res) => {
  const rawBody = req.body;
  try {
    const [config] = await db17.select().from(paymentConfigTable3).limit(1);
    const secret = process.env["SENDAVAPAY_WEBHOOK_SECRET"] ?? config?.sendavapayWebhookSecret;
    if (secret) {
      const sig = req.headers["x-sendavapay-signature"];
      const expected = "sha256=" + crypto2.createHmac("sha256", secret).update(rawBody).digest("hex");
      if (!sig || sig !== expected) {
        logger.warn("SendavaPay webhook: signature invalide");
        res.status(401).json({ error: "Invalid signature" });
        return;
      }
    }
    const payload = JSON.parse(rawBody.toString());
    const { event, reference } = payload;
    logger.info({ event, reference }, "SendavaPay webhook re\xE7u");
    if (event === "payment.completed") {
      const [pendingDep] = await db17.select().from(pendingSpDepositsTable2).where(eq16(pendingSpDepositsTable2.sendavapayReference, reference));
      if (pendingDep) {
        await db17.insert(depositsTable8).values({
          userId: pendingDep.userId,
          type: "international",
          operator: "other",
          oneXbetAccountId: pendingDep.oneXbetAccountId,
          amount: pendingDep.amount,
          referenceId: pendingDep.externalReference,
          sendavapayReference: reference,
          country: pendingDep.payerCountry,
          status: "pending"
          // admin still needs to credit 1xBet account
        });
        await db17.delete(pendingSpDepositsTable2).where(eq16(pendingSpDepositsTable2.id, pendingDep.id));
        logger.info({ userId: pendingDep.userId, reference }, "D\xE9p\xF4t SP cr\xE9\xE9 pour l'admin apr\xE8s confirmation");
        const [depUser] = await db17.select({ username: usersTable14.username, userId: usersTable14.userId }).from(usersTable14).where(eq16(usersTable14.id, pendingDep.userId));
        tg.depositSendavapay({
          username: depUser?.username ?? String(pendingDep.userId),
          userId: depUser?.userId ?? String(pendingDep.userId),
          amount: parseFloat(pendingDep.amount),
          reference,
          country: pendingDep.payerCountry
        });
      }
      const [vipPayment] = await db17.select().from(vipPaymentsTable2).where(eq16(vipPaymentsTable2.sendavapayReference, reference));
      if (vipPayment && vipPayment.status === "pending") {
        await db17.update(vipPaymentsTable2).set({ status: "completed", updatedAt: /* @__PURE__ */ new Date() }).where(eq16(vipPaymentsTable2.id, vipPayment.id));
        await db17.update(usersTable14).set({ isVip: true, updatedAt: /* @__PURE__ */ new Date() }).where(eq16(usersTable14.id, vipPayment.userId));
        logger.info({ userId: vipPayment.userId }, "VIP activ\xE9 via SendavaPay");
        const [vipUser] = await db17.select({ username: usersTable14.username, userId: usersTable14.userId }).from(usersTable14).where(eq16(usersTable14.id, vipPayment.userId));
        tg.vipActivated({
          username: vipUser?.username ?? String(vipPayment.userId),
          userId: vipUser?.userId ?? String(vipPayment.userId),
          amount: parseFloat(vipPayment.amount)
        });
      }
    }
    if (event === "payment.failed" || event === "payment.expired") {
      const [pendingDep] = await db17.select().from(pendingSpDepositsTable2).where(eq16(pendingSpDepositsTable2.sendavapayReference, reference));
      if (pendingDep) {
        await db17.delete(pendingSpDepositsTable2).where(eq16(pendingSpDepositsTable2.id, pendingDep.id));
        logger.info({ reference }, "Paiement SP \xE9chou\xE9 \u2014 aucun d\xE9p\xF4t cr\xE9\xE9");
      }
      const [vipPayment] = await db17.select().from(vipPaymentsTable2).where(eq16(vipPaymentsTable2.sendavapayReference, reference));
      if (vipPayment && vipPayment.status === "pending") {
        await db17.update(vipPaymentsTable2).set({ status: "failed", updatedAt: /* @__PURE__ */ new Date() }).where(eq16(vipPaymentsTable2.id, vipPayment.id));
      }
    }
    res.json({ received: true });
  } catch (err) {
    logger.error({ err }, "Erreur webhook SendavaPay");
    res.status(500).json({ error: "Internal error" });
  }
});
var webhooks_default = router19;

// src/middlewares/maintenance.ts
import { db as db18, appSettingsTable as appSettingsTable5, sessionsTable as sessionsTable3, usersTable as usersTable15 } from "@workspace/db";
import { eq as eq17, and as and6, gt as gt2 } from "drizzle-orm";
var ALWAYS_ALLOWED_PREFIXES = ["/app-settings", "/healthz", "/auth/login"];
async function maintenanceGate(req, res, next) {
  if (ALWAYS_ALLOWED_PREFIXES.some((p) => req.path.startsWith(p))) {
    next();
    return;
  }
  let [settings] = await db18.select().from(appSettingsTable5).limit(1);
  if (!settings) {
    [settings] = await db18.insert(appSettingsTable5).values({}).returning();
  }
  if (!settings.maintenanceMode) {
    next();
    return;
  }
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const [session] = await db18.select().from(sessionsTable3).where(and6(eq17(sessionsTable3.token, token), gt2(sessionsTable3.expiresAt, /* @__PURE__ */ new Date())));
    if (session) {
      const [user] = await db18.select().from(usersTable15).where(eq17(usersTable15.id, session.userId));
      if (user?.isAdmin) {
        next();
        return;
      }
    }
  }
  res.status(503).json({
    error: "maintenance",
    message: settings.maintenanceMessage ?? "L'application est actuellement en maintenance. Veuillez r\xE9essayer plus tard."
  });
}

// src/app.ts
var app = express();
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0]
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode
        };
      }
    }
  })
);
app.use(cors());
app.use("/webhooks/sendavapay", express.raw({ type: "application/json" }), webhooks_default);
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/api/uploads", express.static(join3(process.cwd(), "uploads")));
app.use("/api", maintenanceGate, routes_default);
if (process.env.NODE_ENV === "production") {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const frontendDist = join3(__dirname, "../../vitrine/dist");
  app.use(express.static(frontendDist));
  app.get("*", (_req, res) => {
    res.sendFile(join3(frontendDist, "index.html"));
  });
}
app.use((err, _req, res, _next) => {
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Internal server error" });
});
var app_default = app;

// src/index.ts
var rawPort = process.env["PORT"];
if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided."
  );
}
var port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}
app_default.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});
//# sourceMappingURL=index.mjs.map
