import { pgTable, serial, integer, text, numeric, timestamp } from "drizzle-orm/pg-core";

export const pendingSpDepositsTable = pgTable("pending_sp_deposits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  paymentProvider: text("payment_provider").notNull().default("ashtechpay"),
  providerReference: text("provider_reference").unique(),
  providerTransactionId: text("provider_transaction_id").unique(),
  otpUssdCode: text("otp_ussd_code"),
  externalReference: text("external_reference").notNull().unique(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  payerCountry: text("payer_country").notNull(),
  oneXbetAccountId: text("one_xbet_account_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type PendingSpDeposit = typeof pendingSpDepositsTable.$inferSelect;
