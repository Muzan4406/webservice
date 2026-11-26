import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { db, usersTable } from "@workspace/db";
import { getDatabaseIssue } from "../lib/database-errors.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

router.get("/healthz", async (_req, res): Promise<void> => {
  if (!process.env.PG_URL) {
    res.status(503).json({ status: "unavailable", reason: "database_not_configured" });
    return;
  }

  try {
    // A zero-row query verifies both database connectivity and the VIP expiry
    // column required by the current authentication/payment code.
    await db
      .select({ id: usersTable.id, vipExpiresAt: usersTable.vipExpiresAt })
      .from(usersTable)
      .limit(0);
    res.json(HealthCheckResponse.parse({ status: "ok" }));
  } catch (error) {
    const issue = getDatabaseIssue(error);
    logger.error({ reason: issue?.code ?? "database_error" }, "Database readiness check failed");
    res.status(503).json({
      status: "unavailable",
      reason: issue?.code ?? "database_error",
    });
  }
});

export default router;
