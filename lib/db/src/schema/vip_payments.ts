import { pgTable, serial, integer, text, numeric, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const vipPaymentsTable = pgTable("vip_payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  paymentProvider: text("payment_provider").notNull().default("ashtechpay"),
  providerReference: text("provider_reference"),
  providerTransactionId: text("provider_transaction_id"),
  externalReference: text("external_reference"),
  otpUssdCode: text("otp_ussd_code"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("XAF"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("vip_payments_external_reference_unique").on(table.externalReference),
  uniqueIndex("vip_payments_provider_transaction_id_unique").on(table.providerTransactionId),
]);

export type VipPayment = typeof vipPaymentsTable.$inferSelect;
