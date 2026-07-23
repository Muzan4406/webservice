import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, sessionsTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import { generateToken, generateUserId, generateReferralCode } from "../lib/auth";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { tg } from "../lib/telegram";

const router: IRouter = Router();

// ── Helpers ──────────────────────────────────────────────────────────────────

async function createSession(userId: number): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  await db.insert(sessionsTable).values({ userId, token, expiresAt });
  return { token, expiresAt };
}

function buildUserResponse(user: typeof usersTable.$inferSelect, referralCount = 0) {
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
    createdAt: user.createdAt,
  };
}

// ── Register ─────────────────────────────────────────────────────────────────

router.post("/auth/register", async (req, res): Promise<void> => {
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

  // Check duplicate username/phone
  const existing = await db
    .select()
    .from(usersTable)
    .where(or(eq(usersTable.username, username), eq(usersTable.phone, phone)));

  if (existing.length > 0) {
    res.status(400).json({ error: "Username or phone already in use" });
    return;
  }

  // Check device uniqueness
  if (deviceId) {
    const [deviceUser] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.deviceId, deviceId));
    if (deviceUser) {
      res.status(400).json({ error: "Un compte existe déjà sur cet appareil." });
      return;
    }
  }

  // Handle referral
  let referredById: number | null = null;
  if (referralCode) {
    const [referrer] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.referralCode, referralCode));
    if (referrer) referredById = referrer.id;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const tempCode = generateReferralCode(username);

  const [newUser] = await db
    .insert(usersTable)
    .values({
      username,
      phone,
      passwordHash,
      userId: "MS-TEMP",
      referralCode: tempCode,
      referredById,
      country: country ?? null,
      deviceId: deviceId ?? null,
    })
    .returning();

  const realUserId = generateUserId(newUser.id);
  const [user] = await db
    .update(usersTable)
    .set({ userId: realUserId })
    .where(eq(usersTable.id, newUser.id))
    .returning();

  const { token } = await createSession(user.id);

  let referredByUsername: string | null = null;
  if (referredById) {
    const [referrer] = await db.select({ username: usersTable.username }).from(usersTable).where(eq(usersTable.id, referredById));
    referredByUsername = referrer?.username ?? null;
  }

  tg.newUser({ username: user.username, userId: user.userId, country: user.country, referredBy: referredByUsername });

  res.status(201).json({ user: buildUserResponse(user, 0), token });
});

// ── Login ─────────────────────────────────────────────────────────────────────

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { identifier, password } = parsed.data;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(or(eq(usersTable.phone, identifier), eq(usersTable.username, identifier)));

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

  const referralCount = await db.$count(usersTable, eq(usersTable.referredById, user.id));

  res.json({ user: buildUserResponse(user, referralCount), token });
});

// ── Google Auth ───────────────────────────────────────────────────────────────

router.post("/auth/google", async (req, res): Promise<void> => {
  const { accessToken, deviceId, country, referralCode } = req.body as {
    accessToken?: string;
    deviceId?: string;
    country?: string;
    referralCode?: string;
  };

  if (!accessToken) {
    res.status(400).json({ error: "accessToken is required" });
    return;
  }

  // Verify token with Google UserInfo API
  let googleUser: { sub: string; email: string; name: string; picture?: string };
  try {
    const googleRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!googleRes.ok) {
      res.status(401).json({ error: "Invalid Google access token" });
      return;
    }
    googleUser = await googleRes.json() as typeof googleUser;
  } catch {
    res.status(500).json({ error: "Failed to verify Google token" });
    return;
  }

  const { sub: googleId, email, name, picture } = googleUser;

  // Check device uniqueness (only for new users)
  let existingUser = (await db.select().from(usersTable).where(eq(usersTable.googleId, googleId)))[0];

  if (!existingUser && deviceId) {
    const [deviceUser] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.deviceId, deviceId));
    if (deviceUser) {
      res.status(400).json({ error: "Un compte existe déjà sur cet appareil." });
      return;
    }
  }

  if (existingUser) {
    // Existing Google user — login
    if (existingUser.isBanned) {
      res.status(401).json({ error: "Account is banned" });
      return;
    }
    const { token } = await createSession(existingUser.id);
    const referralCount = await db.$count(usersTable, eq(usersTable.referredById, existingUser.id));
    res.json({ user: buildUserResponse(existingUser, referralCount), token });
    return;
  }

  // New user — create account
  // Generate a unique username from Google name/email
  const baseUsername = (name ?? email.split("@")[0])
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .slice(0, 20);

  let username = baseUsername;
  let suffix = 1;
  while (true) {
    const [taken] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.username, username));
    if (!taken) break;
    username = `${baseUsername}${suffix++}`;
  }

  // Handle referral
  let referredById: number | null = null;
  if (referralCode) {
    const [referrer] = await db.select().from(usersTable).where(eq(usersTable.referralCode, referralCode));
    if (referrer) referredById = referrer.id;
  }

  const tempCode = generateReferralCode(username);

  const [newUser] = await db
    .insert(usersTable)
    .values({
      username,
      phone: null,
      passwordHash: null,
      userId: "MS-TEMP",
      referralCode: tempCode,
      referredById,
      country: country ?? null,
      googleId,
      deviceId: deviceId ?? null,
      photoUrl: picture ?? null,
    })
    .returning();

  const realUserId = generateUserId(newUser.id);
  const [user] = await db
    .update(usersTable)
    .set({ userId: realUserId })
    .where(eq(usersTable.id, newUser.id))
    .returning();

  let referredByUsername: string | null = null;
  if (referredById) {
    const [referrer] = await db.select({ username: usersTable.username }).from(usersTable).where(eq(usersTable.id, referredById));
    referredByUsername = referrer?.username ?? null;
  }

  tg.newUser({ username: user.username, userId: user.userId, country: user.country, referredBy: referredByUsername });

  const { token } = await createSession(user.id);
  res.status(201).json({ user: buildUserResponse(user, 0), token });
});

// ── Logout ───────────────────────────────────────────────────────────────────

router.post("/auth/logout", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.slice(7);
  if (token) {
    await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
  }
  res.json({ success: true });
});

export default router;
