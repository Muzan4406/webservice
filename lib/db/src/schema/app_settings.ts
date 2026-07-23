import { pgTable, serial, boolean, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Singleton table: app-wide settings (maintenance mode, VIP price).
export const appSettingsTable = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  maintenanceMode: boolean("maintenance_mode").notNull().default(false),
  maintenanceMessage: text("maintenance_message"),
  vipPriceFcfa: numeric("vip_price_fcfa", { precision: 12, scale: 2 }).notNull().default("5000"),
  // Support links
  whatsappChannelUrl: text("whatsapp_channel_url"),
  whatsappSupport1Url: text("whatsapp_support1_url"),
  whatsappSupport2Url: text("whatsapp_support2_url"),
  telegramSupportUrl: text("telegram_support_url"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAppSettingsSchema = createInsertSchema(appSettingsTable).omit({
  id: true,
  updatedAt: true,
});

export type InsertAppSettings = z.infer<typeof insertAppSettingsSchema>;
export type AppSettings = typeof appSettingsTable.$inferSelect;
