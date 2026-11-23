import { pgTable, serial, integer, text, numeric, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const vipPaymentsTable = pgTable("vip_payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  // Keep the legacy SQL column name for existing payment references.
  drimpayReference: text("sendavapay_reference"),
  drimpayOrderId: text("drimpay_order_id"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("XAF"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [uniqueIndex("vip_payments_drimpay_order_id_unique").on(table.drimpayOrderId)]);

export type VipPayment = typeof vipPaymentsTable.$inferSelect;
