import { Request, Response, NextFunction } from "express";
import { db, appSettingsTable, sessionsTable, usersTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";

// Paths that must keep working even while the app is in maintenance mode:
// the settings probe itself, health checks, and login (so an admin can sign
// in and turn maintenance back off).
const ALWAYS_ALLOWED_PREFIXES = ["/app-settings", "/healthz", "/auth/login"];

export async function maintenanceGate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (ALWAYS_ALLOWED_PREFIXES.some((p) => req.path.startsWith(p))) {
    next();
    return;
  }

  let [settings] = await db.select().from(appSettingsTable).limit(1);
  if (!settings) {
    // No row yet — auto-create defaults and let the request through.
    [settings] = await db.insert(appSettingsTable).values({}).returning();
  }
  if (!settings.maintenanceMode) {
    next();
    return;
  }

  // Admins keep working during maintenance so they can manage the app.
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const [session] = await db
      .select()
      .from(sessionsTable)
      .where(and(eq(sessionsTable.token, token), gt(sessionsTable.expiresAt, new Date())));

    if (session) {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId));
      if (user?.isAdmin) {
        next();
        return;
      }
    }
  }

  res.status(503).json({
    error: "maintenance",
    message:
      settings.maintenanceMessage ??
      "L'application est actuellement en maintenance. Veuillez réessayer plus tard.",
  });
}
