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

export type DrimPayPaymentEvent = {
  event?: string;
  reference?: string;
  order_id?: string;
  status?: string;
  amount?: number;
  currency?: string;
  country_code?: string;
  operator?: string;
  mode?: string;
};

function amountMatches(expected: string, received: unknown): boolean {
  const amount = Number(received);
  return Number.isFinite(amount) && amount === Number(expected);
}

export async function settleDrimPayPayment(payment: DrimPayPaymentEvent): Promise<void> {
  const reference = payment.reference;
  const orderId = payment.order_id;
  if (!reference || !orderId) {
    throw new Error("DrimPay event is missing reference or order_id");
  }

  const [pendingDeposit] = await db
    .select()
    .from(pendingSpDepositsTable)
    .where(or(
      eq(pendingSpDepositsTable.drimpayReference, reference),
      eq(pendingSpDepositsTable.externalReference, orderId),
    ))
    .limit(1);

  const [vipPayment] = await db
    .select()
    .from(vipPaymentsTable)
    .where(or(
      eq(vipPaymentsTable.drimpayReference, reference),
      eq(vipPaymentsTable.drimpayOrderId, orderId),
    ))
    .limit(1);

  if (!pendingDeposit && !vipPayment) {
    logger.warn({ reference, orderId }, "DrimPay payment has no matching local order");
    return;
  }

  if (pendingDeposit) {
    if (pendingDeposit.externalReference !== orderId ||
        !amountMatches(pendingDeposit.amount, payment.amount) ||
        pendingDeposit.currency !== payment.currency ||
        pendingDeposit.payerCountry !== payment.country_code) {
      throw new Error("DrimPay deposit payload does not match the pending order");
    }
  }

  if (vipPayment) {
    if (vipPayment.drimpayOrderId !== orderId ||
        !amountMatches(vipPayment.amount, payment.amount) ||
        vipPayment.currency !== payment.currency) {
      throw new Error("DrimPay VIP payload does not match the pending order");
    }
  }

  const status = payment.status ?? payment.event?.replace(/^payin\./, "");
  if (status === "success") {
    if (pendingDeposit) {
      const [existingDeposit] = await db
        .select()
        .from(depositsTable)
        .where(or(
          eq(depositsTable.drimpayReference, reference),
          eq(depositsTable.referenceId, orderId),
        ))
        .limit(1);

      if (!existingDeposit) {
        await db.insert(depositsTable).values({
          userId: pendingDeposit.userId,
          type: "international",
          operator: "other",
          internationalOperator: payment.operator ?? null,
          oneXbetAccountId: pendingDeposit.oneXbetAccountId,
          amount: pendingDeposit.amount,
          referenceId: orderId,
          drimpayReference: reference,
          country: pendingDeposit.payerCountry,
          status: "pending",
        });

        const [depositUser] = await db
          .select({ username: usersTable.username, userId: usersTable.userId })
          .from(usersTable)
          .where(eq(usersTable.id, pendingDeposit.userId));

        await tg.depositDrimPay({
          username: depositUser?.username ?? String(pendingDeposit.userId),
          userId: depositUser?.userId ?? String(pendingDeposit.userId),
          amount: Number(pendingDeposit.amount),
          transactionId: reference,
          country: pendingDeposit.payerCountry,
        });
      }

      await db.delete(pendingSpDepositsTable)
        .where(eq(pendingSpDepositsTable.id, pendingDeposit.id));
    }

    if (vipPayment?.status === "pending") {
      await db.update(vipPaymentsTable)
        .set({
          drimpayReference: reference,
          status: "completed",
          updatedAt: new Date(),
        })
        .where(eq(vipPaymentsTable.id, vipPayment.id));

      await db.update(usersTable)
        .set({ isVip: true, updatedAt: new Date() })
        .where(eq(usersTable.id, vipPayment.userId));

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
    return;
  }

  if (status === "failed" || status === "expired" || status === "cancelled") {
    if (pendingDeposit) {
      await db.delete(pendingSpDepositsTable)
        .where(eq(pendingSpDepositsTable.id, pendingDeposit.id));
    }
    if (vipPayment?.status === "pending") {
      await db.update(vipPaymentsTable)
        .set({ drimpayReference: reference, status: "failed", updatedAt: new Date() })
        .where(eq(vipPaymentsTable.id, vipPayment.id));
    }
    return;
  }

  if (status === "reversed") {
    if (pendingDeposit) {
      await db.delete(pendingSpDepositsTable)
        .where(eq(pendingSpDepositsTable.id, pendingDeposit.id));
    }
    const [deposit] = await db
      .select()
      .from(depositsTable)
      .where(or(
        eq(depositsTable.drimpayReference, reference),
        eq(depositsTable.referenceId, orderId),
      ))
      .limit(1);

    if (deposit?.status === "pending") {
      await db.update(depositsTable)
        .set({
          status: "rejected",
          rejectionReason: "Paiement DrimPay annulé après confirmation.",
          updatedAt: new Date(),
        })
        .where(eq(depositsTable.id, deposit.id));
    } else if (deposit?.status === "validated") {
      logger.error({ reference, depositId: deposit.id }, "Validated deposit was reversed by DrimPay");
    }

    if (vipPayment?.status === "completed") {
      await db.update(vipPaymentsTable)
        .set({ status: "reversed", updatedAt: new Date() })
        .where(eq(vipPaymentsTable.id, vipPayment.id));
      logger.error({ reference, userId: vipPayment.userId }, "Completed DrimPay VIP payment was reversed");
    }
    return;
  }

  if (pendingDeposit && pendingDeposit.drimpayReference !== reference) {
    await db.update(pendingSpDepositsTable)
      .set({ drimpayReference: reference })
      .where(eq(pendingSpDepositsTable.id, pendingDeposit.id));
  }
  if (vipPayment && vipPayment.drimpayReference !== reference) {
    await db.update(vipPaymentsTable)
      .set({ drimpayReference: reference, updatedAt: new Date() })
      .where(and(
        eq(vipPaymentsTable.id, vipPayment.id),
        eq(vipPaymentsTable.status, "pending"),
      ));
  }
}
