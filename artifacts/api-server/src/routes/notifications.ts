import { Router, type IRouter } from "express";
import { db, notificationsTable, usersTable, notificationReadsTable } from "@workspace/db";
import { eq, or, desc, and, inArray } from "drizzle-orm";
import { BroadcastNotificationBody } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { broadcastPushNotification, sendPushNotification } from "../lib/pushNotifications";

const router: IRouter = Router();

router.get("/notifications", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const userId = req.userId!;

    // Fetch personal + broadcast notifications
    const rows = await db
      .select()
      .from(notificationsTable)
      .where(or(eq(notificationsTable.userId, userId), eq(notificationsTable.userId, -1)))
      .orderBy(desc(notificationsTable.createdAt))
      .limit(50);

    // Find which broadcasts this user has already read
    const broadcastIds = rows.filter((n) => n.userId === -1).map((n) => n.id);
    let readBroadcastIds = new Set<number>();
    if (broadcastIds.length > 0) {
      const reads = await db
        .select({ notificationId: notificationReadsTable.notificationId })
        .from(notificationReadsTable)
        .where(
          and(
            eq(notificationReadsTable.userId, userId),
            inArray(notificationReadsTable.notificationId, broadcastIds),
          ),
        );
      readBroadcastIds = new Set(reads.map((r) => r.notificationId));
    }

    const notifications = rows.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      createdAt: n.createdAt,
      // For personal notifications use the isRead flag; for broadcasts check junction table
      isRead: n.userId === -1 ? readBroadcastIds.has(n.id) : n.isRead,
    }));

    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// Mark a single notification as read
router.patch("/notifications/:id/read", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const userId = req.userId!;
    const notifId = parseInt(req.params.id as string, 10);
    if (isNaN(notifId)) {
      res.status(400).json({ error: "Invalid notification id" });
      return;
    }

    const [notif] = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.id, notifId));

    if (!notif) {
      res.status(404).json({ error: "Notification not found" });
      return;
    }

    if (notif.userId === -1) {
      // Broadcast: insert into junction table (ignore if already exists)
      await db
        .insert(notificationReadsTable)
        .values({ userId, notificationId: notifId })
        .onConflictDoNothing();
    } else if (notif.userId === userId) {
      // Personal: update isRead flag directly
      await db
        .update(notificationsTable)
        .set({ isRead: true })
        .where(eq(notificationsTable.id, notifId));
    } else {
      res.status(403).json({ error: "Not your notification" });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

// Mark all notifications as read for the current user
router.patch("/notifications/read-all", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const userId = req.userId!;

    // Mark all personal notifications as read
    await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.isRead, false)));

    // Get all unread broadcasts for this user
    const broadcasts = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.userId, -1));

    if (broadcasts.length > 0) {
      const broadcastIds = broadcasts.map((b) => b.id);
      // Get already-read ones to avoid conflict
      const alreadyRead = await db
        .select({ notificationId: notificationReadsTable.notificationId })
        .from(notificationReadsTable)
        .where(
          and(
            eq(notificationReadsTable.userId, userId),
            inArray(notificationReadsTable.notificationId, broadcastIds),
          ),
        );
      const alreadyReadIds = new Set(alreadyRead.map((r) => r.notificationId));
      const unreadBroadcasts = broadcastIds.filter((id) => !alreadyReadIds.has(id));

      if (unreadBroadcasts.length > 0) {
        await db.insert(notificationReadsTable).values(
          unreadBroadcasts.map((nid) => ({ userId, notificationId: nid })),
        ).onConflictDoNothing();
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to mark all as read" });
  }
});

// Admin: delete a notification
router.delete("/notifications/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    if (!req.isAdmin) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const notifId = parseInt(req.params.id as string, 10);
    if (isNaN(notifId)) {
      res.status(400).json({ error: "Invalid notification id" });
      return;
    }

    // Also delete read records for this notification
    await db.delete(notificationReadsTable).where(eq(notificationReadsTable.notificationId, notifId));
    const [deleted] = await db.delete(notificationsTable).where(eq(notificationsTable.id, notifId)).returning();

    if (!deleted) {
      res.status(404).json({ error: "Notification not found" });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete notification" });
  }
});

// Register / update the caller's Expo push token
router.post("/push-token", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const { token } = req.body as { token?: string };
    if (!token || typeof token !== "string") {
      res.status(400).json({ error: "token is required" });
      return;
    }
    await db.update(usersTable).set({ pushToken: token }).where(eq(usersTable.id, req.userId!));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to save push token" });
  }
});

router.post("/notifications/broadcast", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    if (!req.isAdmin) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const parsed = BroadcastNotificationBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const { title, message } = parsed.data;
    await db.insert(notificationsTable).values({ userId: -1, title, message, isRead: false });

    // Also send push to all users who have a token
    const usersWithTokens = await db
      .select({ pushToken: usersTable.pushToken })
      .from(usersTable)
      .where(eq(usersTable.isBanned, false));
    broadcastPushNotification(
      usersWithTokens.map((u) => u.pushToken),
      { title, body: message },
    );

    res.json({ success: true, message: "Notification broadcast sent" });
  } catch (err) {
    res.status(500).json({ error: "Failed to broadcast notification" });
  }
});

export default router;
