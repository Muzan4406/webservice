import { pgTable, serial, boolean, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const paymentConfigTable = pgTable("payment_config", {
  id: serial("id").primaryKey(),
  tmoneyEnabled: boolean("tmoney_enabled").notNull().default(true),
  moovMoneyEnabled: boolean("moov_money_enabled").notNull().default(false),
  moovMoneyNumber: text("moov_money_number"),
  moovMoneyUssdCode: text("moov_money_ussd_code"),
  // Retained only so existing database columns and stored history are not dropped.
  internationalPaymentApiUrl: text("international_payment_api_url"),
  internationalPaymentApiKey: text("international_payment_api_key"),
  legacyPaymentApiKey: text("sendavapay_api_key"),
  legacyWebhookSecret: text("sendavapay_webhook_secret"),
  // Adresse du point de retrait 1xBet (affiché sur la page retrait)
  withdrawCity: text("withdraw_city").default("Tsevie"),
  withdrawStreet: text("withdraw_street").default("Kpali24"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPaymentConfigSchema = createInsertSchema(paymentConfigTable).omit({
  id: true,
  updatedAt: true,
});

export type InsertPaymentConfig = z.infer<typeof insertPaymentConfigSchema>;
export type PaymentConfig = typeof paymentConfigTable.$inferSelect;
