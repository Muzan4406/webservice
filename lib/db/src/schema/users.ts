import { pgTable, serial, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  phone: text("phone").unique(), // nullable: Google users may not have a phone
  passwordHash: text("password_hash"), // nullable: Google users have no password
  userId: text("user_id").notNull().unique(), // display ID like MS-00123
  referralCode: text("referral_code").notNull().unique(),
  referredById: integer("referred_by_id"), // FK to users.id (self-referential)
  isVip: boolean("is_vip").notNull().default(false),
  isBanned: boolean("is_banned").notNull().default(false),
  isAdmin: boolean("is_admin").notNull().default(false),
  photoUrl: text("photo_url"),
  country: text("country"),
  googleId: text("google_id").unique(), // Google OAuth sub
  deviceId: text("device_id").unique(), // one account per device
  pushToken: text("push_token"), // Expo push notification token
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
