import { and, eq, or } from "drizzle-orm";
import {
  db,
  depositsTable,
  pendingSpDepositsTable,
  usersTable,
  vipPaymentsTable,
} from "@workspace/db";
import { logger } from "./logger.js";
import { tg } from "./telegram.js";
import { nextVipExpiration } from "./vip-entitlement.js";

export type AshtechPayPaymentEvent = {
  reference?: string;
  transaction_id?: string;
  status?: string;
  amount?: number;
  total_amount?: number;
  currency?: string;
  country_code?: string;
  operator?: string;
};

function amountMatches(expected: string, received: unknown): boolean {
  const amount = Number(received);
  return Number.isFinite(amount) && amount === Number(expected);
}

function findPaymentCondition(reference: string | undefined, transactionId: string | undefined) {
  const conditions = [];
  if (reference) {
    conditions.push(
      eq(pendingSpDepositsTable.providerReference, reference),
      eq(pendingSpDepositsTable.externalReference, reference),
    );
  }
  if (transactionId) conditions.push(eq(pendingSpDepositsTable.providerTransactionId, transactionId));
  return conditions.length ? or(...conditions) : undefined;
}

export async function settleAshtechPayPayment(payment: AshtechPayPaymentEvent): Promise<void> {
  const { reference, transaction_id: transactionId } = payment;
  if (!reference && !transactionId) throw new Error("Payment event is missing provider identifiers");

  const depositCondition = findPaymentCondition(reference, transactionId);
  const vipConditions = [];
  if (reference) {
    vipConditions.push(
      eq(vipPaymentsTable.providerReference, reference),
      eq(vipPaymentsTable.externalReference, reference),
    );
  }
  if (transactionId) vipConditions.push(eq(vipPaymentsTable.providerTransactionId, transactionId));

  const [pendingDeposit] = depositCondition
    ? await db.select().from(pendingSpDepositsTable).where(and(
      eq(pendingSpDepositsTable.paymentProvider, "ashtechpay"),
      depositCondition,
    )).limit(1)
    : [];
  const [vipPayment] = vipConditions.length
    ? await db.select().from(vipPaymentsTable).where(and(
      eq(vipPaymentsTable.paymentProvider, "ashtechpay"),
      or(...vipConditions),
    )).limit(1)
    : [];

  if (!pendingDeposit && !vipPayment) {
    logger.warn({ transactionId, reference }, "Ashtechpay payment has no matching local order");
    return;
  }

  const grossAmount = payment.total_amount ?? payment.amount;
  if (pendingDeposit && (
    (grossAmount !== undefined && !amountMatches(pendingDeposit.amount, grossAmount)) ||
    (payment.currency && pendingDeposit.currency !== payment.currency) ||
    (payment.country_code && pendingDeposit.payerCountry !== payment.country_code)
  )) {
    throw new Error("Ashtechpay deposit does not match the pending order");
  }
  if (vipPayment && (
    (grossAmount !== undefined && !amountMatches(vipPayment.amount, grossAmount)) ||
    (payment.currency && vipPayment.currency !== payment.currency)
  )) {
    throw new Error("Ashtechpay VIP payment does not match the pending order");
  }

  const status = payment.status;
  if (status === "success" || status === "completed") {
    if (!transactionId) throw new Error("Completed Ashtechpay payment is missing transaction_id");

    if (pendingDeposit) {
      const [existingDeposit] = await db.select()
        .from(depositsTable)
        .where(or(
          eq(depositsTable.providerReference, reference ?? transactionId),
          eq(depositsTable.referenceId, pendingDeposit.externalReference),
        ))
        .limit(1);

      if (!existingDeposit) {
        await db.insert(depositsTable).values({
          userId: pendingDeposit.userId,
          paymentProvider: "ashtechpay",
          type: "international",
          operator: "other",
          internationalOperator: payment.operator ?? null,
          oneXbetAccountId: pendingDeposit.oneXbetAccountId,
          amount: pendingDeposit.amount,
          referenceId: pendingDeposit.externalReference,
          providerReference: reference ?? transactionId,
          country: pendingDeposit.payerCountry,
          status: "pending",
        });

        const [depositUser] = await db
          .select({ username: usersTable.username, userId: usersTable.userId })
          .from(usersTable)
          .where(eq(usersTable.id, pendingDeposit.userId));

        await tg.depositMobileMoney({
          username: depositUser?.username ?? String(pendingDeposit.userId),
          userId: depositUser?.userId ?? String(pendingDeposit.userId),
          amount: Number(pendingDeposit.amount),
          transactionId,
          country: pendingDeposit.payerCountry,
        });
      }

      await db.delete(pendingSpDepositsTable)
        .where(eq(pendingSpDepositsTable.id, pendingDeposit.id));
    }

    if (vipPayment?.status === "pending") {
      const activatedAt = new Date();
      let activated = false;
      await db.transaction(async (tx) => {
        const [lockedPayment] = await tx
          .select()
          .from(vipPaymentsTable)
          .where(eq(vipPaymentsTable.id, vipPayment.id))
          .for("update");
        if (!lockedPayment || lockedPayment.status !== "pending") return;

        const [vipUser] = await tx
          .select({ vipExpiresAt: usersTable.vipExpiresAt })
          .from(usersTable)
          .where(eq(usersTable.id, lockedPayment.userId))
          .for("update");
        if (!vipUser) throw new Error("VIP payment has no matching user");

        await tx.update(usersTable)
          .set({
            isVip: true,
            vipExpiresAt: nextVipExpiration(vipUser.vipExpiresAt, activatedAt),
            updatedAt: activatedAt,
          })
          .where(eq(usersTable.id, lockedPayment.userId));
        await tx.update(vipPaymentsTable)
          .set({
            providerReference: reference ?? lockedPayment.providerReference,
            providerTransactionId: transactionId,
            status: "completed",
            updatedAt: activatedAt,
          })
          .where(eq(vipPaymentsTable.id, lockedPayment.id));
        activated = true;
      });

      if (activated) {
        const [vipUser] = await db
          .select({ username: usersTable.username, userId: usersTable.userId })
          .from(usersTable)
          .where(eq(usersTable.id, vipPayment.userId));

        await tg.vipActivated({
          username: vipUser?.username ?? String(vipPayment.userId),
          userId: vipUser?.userId ?? String(vipPayment.userId),
          amount: Number(vipPayment.amount),
        });
      }
    }
    return;
  }

  if (status === "failed") {
    if (pendingDeposit) {
      await db.delete(pendingSpDepositsTable)
        .where(eq(pendingSpDepositsTable.id, pendingDeposit.id));
    }
    if (vipPayment?.status === "pending") {
      await db.update(vipPaymentsTable)
        .set({
          providerReference: reference ?? vipPayment.providerReference,
          providerTransactionId: transactionId ?? vipPayment.providerTransactionId,
          status: "failed",
          updatedAt: new Date(),
        })
        .where(and(eq(vipPaymentsTable.id, vipPayment.id), eq(vipPaymentsTable.status, "pending")));
    }
    return;
  }

  if (pendingDeposit && transactionId && pendingDeposit.providerTransactionId !== transactionId) {
    await db.update(pendingSpDepositsTable)
      .set({ providerTransactionId: transactionId })
      .where(eq(pendingSpDepositsTable.id, pendingDeposit.id));
  }
  if (vipPayment && transactionId && vipPayment.providerTransactionId !== transactionId) {
    await db.update(vipPaymentsTable)
      .set({
        providerReference: reference ?? vipPayment.providerReference,
        providerTransactionId: transactionId,
        updatedAt: new Date(),
      })
      .where(and(
        eq(vipPaymentsTable.id, vipPayment.id),
        eq(vipPaymentsTable.status, "pending"),
      ));
  }
}
