import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const chatMessagesTable = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // the user involved in this conversation
  fromAdmin: boolean("from_admin").notNull().default(false), // true = admin sent, false = user sent
  content: text("content"), // text content (null for audio/image)
  type: text("type").notNull().default("text"), // "text" | "audio" | "image"
  fileUrl: text("file_url"), // relative URL for audio/image files
  isRead: boolean("is_read").notNull().default(false), // read by the recipient
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertChatMessageSchema = createInsertSchema(chatMessagesTable).omit({
  id: true,
  createdAt: true,
});

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessagesTable.$inferSelect;
