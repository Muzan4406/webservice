import { pgTable, serial, integer, text, numeric, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const depositsTable = pgTable(
  "deposits",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    type: text("type").notNull(), // 'national' | 'international'
    operator: text("operator").notNull(), // 'tmoney' | 'moov_money' | 'other'
    oneXbetAccountId: text("one_xbet_account_id").notNull(), // user's 1xBet account ID
    internationalOperator: text("international_operator"), // chosen payment operator, international deposits only
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    referenceId: text("reference_id"), // unique enforced via DB index below
    screenshotUrl: text("screenshot_url"),
    country: text("country"),
    ashtechpayReference: text("sendavapay_reference"),
    status: text("status").notNull().default("pending"), // 'pending' | 'validated' | 'rejected'
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("deposits_reference_id_unique").on(table.referenceId)],
);

export const insertDepositSchema = createInsertSchema(depositsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDeposit = z.infer<typeof insertDepositSchema>;
export type Deposit = typeof depositsTable.$inferSelect;
