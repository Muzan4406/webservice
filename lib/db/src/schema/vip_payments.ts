import { pgTable, serial, integer, text, numeric, timestamp } from "drizzle-orm/pg-core";

export const vipPaymentsTable = pgTable("vip_payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  sendavapayReference: text("sendavapay_reference"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("XAF"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type VipPayment = typeof vipPaymentsTable.$inferSelect;
