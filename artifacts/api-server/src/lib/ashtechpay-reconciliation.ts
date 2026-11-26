import { and, asc, eq, isNotNull } from "drizzle-orm";
import { db, pendingSpDepositsTable, vipPaymentsTable } from "@workspace/db";
import { getAshtechPayApiKey, getAshtechPayTransaction, getAshtechPayUserId } from "./ashtechpay.js";
import { logger } from "./logger.js";
import { settleAshtechPayPayment } from "./ashtechpay-settlement.js";

const RECONCILE_INTERVAL_MS = 60_000;
const MAX_TRANSACTIONS_PER_CYCLE = 12;
const MAX_QUEUED_TRANSACTIONS = 100;
const MIN_RETRY_INTERVAL_MS = 55_000;

const lastAttemptAt = new Map<string, number>();
let running = false;

async function reconcilePendingPayments(): Promise<void> {
  if (running) return;
  running = true;

  try {
    const now = Date.now();
    for (const [transactionId, attemptedAt] of lastAttemptAt) {
      if (now - attemptedAt > 10 * RECONCILE_INTERVAL_MS) lastAttemptAt.delete(transactionId);
    }

    const [deposits, vipPayments] = await Promise.all([
      db.select({ transactionId: pendingSpDepositsTable.providerTransactionId })
        .from(pendingSpDepositsTable)
        .where(and(
          eq(pendingSpDepositsTable.paymentProvider, "ashtechpay"),
          isNotNull(pendingSpDepositsTable.providerTransactionId),
        ))
        .orderBy(asc(pendingSpDepositsTable.createdAt))
        .limit(MAX_QUEUED_TRANSACTIONS),
      db.select({ transactionId: vipPaymentsTable.providerTransactionId })
        .from(vipPaymentsTable)
        .where(and(
          eq(vipPaymentsTable.paymentProvider, "ashtechpay"),
          eq(vipPaymentsTable.status, "pending"),
          isNotNull(vipPaymentsTable.providerTransactionId),
        ))
        .orderBy(asc(vipPaymentsTable.createdAt))
        .limit(MAX_QUEUED_TRANSACTIONS),
    ]);

    const dueTransactionIds = [...new Set([
      ...deposits.map(({ transactionId }) => transactionId),
      ...vipPayments.map(({ transactionId }) => transactionId),
    ].filter((transactionId): transactionId is string => Boolean(transactionId)))]
      .filter((transactionId) => now - (lastAttemptAt.get(transactionId) ?? 0) >= MIN_RETRY_INTERVAL_MS)
      .slice(0, MAX_TRANSACTIONS_PER_CYCLE);

    for (let index = 0; index < dueTransactionIds.length; index += 4) {
      const batch = dueTransactionIds.slice(index, index + 4);
      await Promise.allSettled(batch.map(async (transactionId) => {
        lastAttemptAt.set(transactionId, Date.now());
        try {
          const payment = await getAshtechPayTransaction(transactionId);
          await settleAshtechPayPayment(payment);
        } catch (error) {
          logger.warn({
            errorType: error instanceof Error ? error.name : typeof error,
            statusCode: typeof error === "object" && error && "statusCode" in error
              ? (error as { statusCode?: unknown }).statusCode
              : undefined,
          }, "Ashtechpay pending payment status check failed");
        }
      }));
    }
  } catch (error) {
    logger.error(
      { errorType: error instanceof Error ? error.name : typeof error },
      "Ashtechpay background reconciliation failed",
    );
  } finally {
    running = false;
  }
}

export function startAshtechPayReconciliation(): void {
  if (!process.env.PG_URL) {
    logger.warn("Ashtechpay background reconciliation is disabled because PG_URL is not set");
    return;
  }

  try {
    getAshtechPayApiKey();
    getAshtechPayUserId();
  } catch (error) {
    logger.warn(
      { errorType: error instanceof Error ? error.name : typeof error },
      "Ashtechpay background reconciliation is disabled until its server configuration is complete",
    );
    return;
  }

  const timer = setInterval(() => void reconcilePendingPayments(), RECONCILE_INTERVAL_MS);
  timer.unref();
  void reconcilePendingPayments();
  logger.info("Ashtechpay background reconciliation started");
}
