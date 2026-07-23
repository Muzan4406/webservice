import { pgTable, serial, text, numeric, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const couponsTable = pgTable("coupons", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // 'daily' | 'vip'
  title: text("title").notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  date: date("date").notNull(),
  odds: numeric("odds", { precision: 6, scale: 2 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCouponSchema = createInsertSchema(couponsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCoupon = z.infer<typeof insertCouponSchema>;
export type Coupon = typeof couponsTable.$inferSelect;
