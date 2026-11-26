import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import {
  appSettingsTable,
  db,
  depositsTable,
  pendingSpDepositsTable,
  usersTable,
  vipPaymentsTable,
} from "@workspace/db";
import { getDatabaseIssue } from "../lib/database-errors.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

router.get("/healthz", async (_req, res): Promise<void> => {
  if (!process.env.PG_URL) {
    res.status(503).json({ status: "unavailable", reason: "database_not_configured" });
    return;
  }

  try {
    // Zero-row queries verify the tables and columns used by login, VIP, and
    // both DrimPay initiation/status flows without reading customer records.
    await Promise.all([
      db.select({ id: usersTable.id, vipExpiresAt: usersTable.vipExpiresAt }).from(usersTable).limit(0),
      db.select({ id: appSettingsTable.id, vipPrice: appSettingsTable.vipPriceFcfa }).from(appSettingsTable).limit(0),
      db.select({ id: vipPaymentsTable.id, orderId: vipPaymentsTable.drimpayOrderId }).from(vipPaymentsTable).limit(0),
      db.select({ id: pendingSpDepositsTable.id, orderId: pendingSpDepositsTable.externalReference }).from(pendingSpDepositsTable).limit(0),
      db.select({ id: depositsTable.id, reference: depositsTable.drimpayReference }).from(depositsTable).limit(0),
    ]);
    res.json(HealthCheckResponse.parse({
      status: "ok",
      database: "ready",
      schema: "vip-expiry-v1",
      paymentSchema: "drimpay-v1",
    }));
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
