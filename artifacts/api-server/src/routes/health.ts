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
    // Ashtechpay initiation/status flows without reading customer records.
    const checks: Array<[string, () => Promise<unknown>]> = [
      ["accounts", () => db.select({ id: usersTable.id, vipExpiresAt: usersTable.vipExpiresAt }).from(usersTable).limit(0)],
      ["app_settings", () => db.select({ id: appSettingsTable.id, vipPrice: appSettingsTable.vipPriceFcfa }).from(appSettingsTable).limit(0)],
      ["vip_payments", () => db.select({
        id: vipPaymentsTable.id,
        orderId: vipPaymentsTable.externalReference,
        transactionId: vipPaymentsTable.providerTransactionId,
        provider: vipPaymentsTable.paymentProvider,
        otpUssdCode: vipPaymentsTable.otpUssdCode,
      }).from(vipPaymentsTable).limit(0)],
      ["international_deposits", () => db.select({
        id: pendingSpDepositsTable.id,
        orderId: pendingSpDepositsTable.externalReference,
        transactionId: pendingSpDepositsTable.providerTransactionId,
        provider: pendingSpDepositsTable.paymentProvider,
        otpUssdCode: pendingSpDepositsTable.otpUssdCode,
      }).from(pendingSpDepositsTable).limit(0)],
      ["deposits", () => db.select({
        id: depositsTable.id,
        reference: depositsTable.providerReference,
        provider: depositsTable.paymentProvider,
      }).from(depositsTable).limit(0)],
    ];
    for (const [check, run] of checks) {
      try {
        await run();
      } catch (error) {
        const issue = getDatabaseIssue(error);
        logger.error({ check, reason: issue?.code ?? "database_error" }, "Database readiness check failed");
        res.status(503).json({
          status: "unavailable",
          reason: issue?.code ?? "database_error",
          check,
        });
        return;
      }
    }
    res.json(HealthCheckResponse.parse({
      status: "ok",
      database: "ready",
      schema: "vip-expiry-v1",
      paymentSchema: "ashtechpay-v1",
    }));
  } catch (error) {
    const issue = getDatabaseIssue(error);
    logger.error({ check: "health_response", reason: issue?.code ?? "database_error" }, "Database readiness check failed");
    res.status(503).json({
      status: "unavailable",
      reason: issue?.code ?? "database_error",
      check: "health_response",
    });
  }
});

export default router;
