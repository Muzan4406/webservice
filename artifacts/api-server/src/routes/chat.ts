import { Router, type IRouter } from "express";
import { db, chatMessagesTable, usersTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { requireAuth, requireAdmin, type AuthRequest } from "../middlewares/auth";
import { sendPushNotification, notifyAdmins } from "../lib/pushNotifications";

const router: IRouter = Router();
const UPLOADS_DIR = join(process.cwd(), "uploads");

async function removeMessageFile(fileUrl: string | null) {
  if (!fileUrl?.startsWith("/api/uploads/")) return;

  const filename = fileUrl.slice("/api/uploads/".length);
  if (!/^[a-zA-Z0-9._-]+$/.test(filename)) return;

  await unlink(join(UPLOADS_DIR, filename)).catch(() => {
    // The message can still be deleted if its local upload was already removed.
  });
}

/* ─── USER: Get my chat messages ─── */
router.get("/chat", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const userId = req.userId!;
    const messages = await db
      .select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.userId, userId))
      .orderBy(desc(chatMessagesTable.createdAt))
      .limit(100);

    // Mark all admin messages as read
    await db
      .update(chatMessagesTable)
      .set({ isRead: true })
      .where(
        and(
          eq(chatMessagesTable.userId, userId),
          eq(chatMessagesTable.fromAdmin, true),
          eq(chatMessagesTable.isRead, false),
        ),
      );

    res.json({ messages: messages.reverse() });
  } catch {
    res.status(500).json({ error: "Erreur lors du chargement des messages" });
  }
});

/* ─── USER: Send a message ─── */
router.post("/chat", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const userId = req.userId!;
    const { content, type = "text", fileUrl } = req.body as {
      content?: string;
      type?: string;
      fileUrl?: string;
    };

    if (type === "text" && !content?.trim()) {
      res.status(400).json({ error: "Le message ne peut pas être vide" });
      return;
    }

    if ((type === "audio" || type === "image") && !fileUrl) {
      res.status(400).json({ error: "fileUrl requis pour ce type de message" });
      return;
    }

    const [msg] = await db
      .insert(chatMessagesTable)
      .values({
        userId,
        fromAdmin: false,
        content: content?.trim() ?? null,
        type,
        fileUrl: fileUrl ?? null,
        isRead: false,
      })
      .returning();

    // Notify all admins of new support message
    const [sender] = await db
      .select({ username: usersTable.username })
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    notifyAdmins({
      title: "💬 Nouveau message support",
      body: `${sender?.username ?? "Utilisateur"} : ${content?.trim() ?? "(fichier)"}`,
      data: { type: "new_chat_message", userId: String(userId) },
    });

    res.status(201).json({ message: msg });
  } catch {
    res.status(500).json({ error: "Erreur lors de l'envoi du message" });
  }
});

/* ─── USER: Delete one of my audio/image messages ─── */
router.delete("/chat/:messageId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const messageId = Number.parseInt(req.params.messageId as string, 10);
    if (Number.isNaN(messageId)) {
      res.status(400).json({ error: "Invalid messageId" });
      return;
    }

    const [message] = await db
      .select()
      .from(chatMessagesTable)
      .where(and(eq(chatMessagesTable.id, messageId), eq(chatMessagesTable.userId, req.userId!)));

    if (!message) {
      res.status(404).json({ error: "Message introuvable" });
      return;
    }
    if (message.fromAdmin || (message.type !== "audio" && message.type !== "image")) {
      res.status(403).json({ error: "Seuls vos messages vocaux et images peuvent être supprimés" });
      return;
    }

    await db.delete(chatMessagesTable).where(eq(chatMessagesTable.id, messageId));
    await removeMessageFile(message.fileUrl);
    res.status(204).send();
  } catch {
    res.status(500).json({ error: "Erreur lors de la suppression" });
  }
});

/* ─── USER: Unread count (admin messages not yet read) ─── */
router.get("/chat/unread", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const userId = req.userId!;
    const rows = await db
      .select()
      .from(chatMessagesTable)
      .where(
        and(
          eq(chatMessagesTable.userId, userId),
          eq(chatMessagesTable.fromAdmin, true),
          eq(chatMessagesTable.isRead, false),
        ),
      );
    res.json({ count: rows.length });
  } catch {
    res.status(500).json({ error: "Erreur" });
  }
});

/* ─── ADMIN: List all users who have messages ─── */
router.get("/admin/chat/users", requireAdmin, async (_req, res): Promise<void> => {
  try {
    // Get distinct userIds from chat messages
    const rows = await db
      .selectDistinct({ userId: chatMessagesTable.userId })
      .from(chatMessagesTable)
      .orderBy(chatMessagesTable.userId);

    const userIds = rows.map((r) => r.userId);

    if (userIds.length === 0) {
      res.json({ users: [] });
      return;
    }

    // Fetch user info + last message + unread count per user
    const result = await Promise.all(
      userIds.map(async (uid) => {
        const [user] = await db
          .select({ id: usersTable.id, username: usersTable.username, userId: usersTable.userId })
          .from(usersTable)
          .where(eq(usersTable.id, uid));

        const [lastMsg] = await db
          .select()
          .from(chatMessagesTable)
          .where(eq(chatMessagesTable.userId, uid))
          .orderBy(desc(chatMessagesTable.createdAt))
          .limit(1);

        const unreadRows = await db
          .select()
          .from(chatMessagesTable)
          .where(
            and(
              eq(chatMessagesTable.userId, uid),
              eq(chatMessagesTable.fromAdmin, false),
              eq(chatMessagesTable.isRead, false),
            ),
          );

        return {
          user: user ?? { id: uid, username: "Inconnu", userId: "" },
          lastMessage: lastMsg ?? null,
          unreadCount: unreadRows.length,
        };
      }),
    );

    // Sort by latest message
    result.sort((a, b) => {
      const ta = a.lastMessage?.createdAt?.getTime() ?? 0;
      const tb = b.lastMessage?.createdAt?.getTime() ?? 0;
      return tb - ta;
    });

    res.json({ users: result });
  } catch {
    res.status(500).json({ error: "Erreur" });
  }
});

/* ─── ADMIN: Get messages for a specific user ─── */
router.get("/admin/chat/:userId", requireAdmin, async (req, res): Promise<void> => {
  try {
    const uid = parseInt(req.params.userId as string, 10);
    if (isNaN(uid)) { res.status(400).json({ error: "Invalid userId" }); return; }

    const messages = await db
      .select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.userId, uid))
      .orderBy(desc(chatMessagesTable.createdAt))
      .limit(100);

    // Mark user messages as read by admin
    await db
      .update(chatMessagesTable)
      .set({ isRead: true })
      .where(
        and(
          eq(chatMessagesTable.userId, uid),
          eq(chatMessagesTable.fromAdmin, false),
          eq(chatMessagesTable.isRead, false),
        ),
      );

    res.json({ messages: messages.reverse() });
  } catch {
    res.status(500).json({ error: "Erreur" });
  }
});

/* ─── ADMIN: Reply to a user ─── */
router.post("/admin/chat/:userId", requireAdmin, async (req, res): Promise<void> => {
  try {
    const uid = parseInt(req.params.userId as string, 10);
    if (isNaN(uid)) { res.status(400).json({ error: "Invalid userId" }); return; }

    const { content, type = "text", fileUrl } = req.body as {
      content?: string;
      type?: string;
      fileUrl?: string;
    };

    if (type === "text" && !content?.trim()) {
      res.status(400).json({ error: "Message vide" });
      return;
    }

    const [msg] = await db
      .insert(chatMessagesTable)
      .values({
        userId: uid,
        fromAdmin: true,
        content: content?.trim() ?? null,
        type,
        fileUrl: fileUrl ?? null,
        isRead: false,
      })
      .returning();

    // Notify the user of the admin reply
    const [targetUser] = await db
      .select({ pushToken: usersTable.pushToken })
      .from(usersTable)
      .where(eq(usersTable.id, uid));

    sendPushNotification([targetUser?.pushToken], {
      title: "💬 Réponse du support",
      body: content?.trim() ?? "(fichier)",
      data: { type: "admin_chat_reply", userId: String(uid) },
    });

    res.status(201).json({ message: msg });
  } catch {
    res.status(500).json({ error: "Erreur lors de l'envoi" });
  }
});

/* ─── ADMIN: Delete an audio/image message in a conversation ─── */
router.delete("/admin/chat/:userId/:messageId", requireAdmin, async (req, res): Promise<void> => {
  try {
    const userId = Number.parseInt(req.params.userId as string, 10);
    const messageId = Number.parseInt(req.params.messageId as string, 10);
    if (Number.isNaN(userId) || Number.isNaN(messageId)) {
      res.status(400).json({ error: "Identifiants invalides" });
      return;
    }

    const [message] = await db
      .select()
      .from(chatMessagesTable)
      .where(and(eq(chatMessagesTable.id, messageId), eq(chatMessagesTable.userId, userId)));

    if (!message) {
      res.status(404).json({ error: "Message introuvable" });
      return;
    }
    if (message.type !== "audio" && message.type !== "image") {
      res.status(403).json({ error: "Seuls les messages vocaux et images peuvent être supprimés" });
      return;
    }

    await db.delete(chatMessagesTable).where(eq(chatMessagesTable.id, messageId));
    await removeMessageFile(message.fileUrl);
    res.status(204).send();
  } catch {
    res.status(500).json({ error: "Erreur lors de la suppression" });
  }
});

export default router;
