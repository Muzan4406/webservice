import { pgTable, integer, timestamp, primaryKey } from "drizzle-orm/pg-core";

// Tracks which users have read which broadcast notifications (userId=-1 rows)
export const notificationReadsTable = pgTable(
  "notification_reads",
  {
    userId: integer("user_id").notNull(),
    notificationId: integer("notification_id").notNull(),
    readAt: timestamp("read_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.notificationId] })],
);
