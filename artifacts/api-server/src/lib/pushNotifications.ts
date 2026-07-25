/**
 * Firebase Cloud Messaging (FCM) push notification helper.
 * Uses firebase-admin SDK to send notifications via FCM.
 */

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

// Initialize Firebase Admin SDK once
if (!getApps().length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Replit stores \n literally in secrets — replace with real newlines
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (projectId && clientEmail && privateKey) {
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
    console.log("[FCM] Firebase Admin initialized for project:", projectId);
  } else {
    console.warn("[FCM] Missing Firebase credentials — push notifications disabled.");
  }
}

export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

function isValidFcmToken(token: string | null | undefined): token is string {
  return typeof token === "string" && token.length > 20;
}

function toStringData(data?: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  if (!data) return out;
  for (const [k, v] of Object.entries(data)) out[k] = String(v);
  return out;
}

/**
 * Send a push notification to one or more FCM tokens.
 * Silently ignores null/undefined/invalid tokens.
 */
export async function sendPushNotification(
  tokens: (string | null | undefined)[],
  message: PushMessage,
): Promise<void> {
  if (!getApps().length) return;

  const validTokens = tokens.filter(isValidFcmToken);
  if (validTokens.length === 0) return;

  const messaging = getMessaging();
  const stringData = toStringData(message.data);

  const results = await Promise.allSettled(
    validTokens.map((token) =>
      messaging.send({
        token,
        notification: { title: message.title, body: message.body },
        data: stringData,
        webpush: {
          notification: {
            title: message.title,
            body: message.body,
            icon: "/icon-192.png",
            badge: "/icon-192.png",
            vibrate: [200, 100, 200],
          },
          fcmOptions: { link: "/" },
        },
        android: {
          priority: "high",
          notification: { sound: "default", channelId: "muzan-default" },
        },
        apns: {
          payload: { aps: { sound: "default" } },
        },
      }),
    ),
  );

  results.forEach((result, i) => {
    if (result.status === "rejected") {
      console.error(`[FCM] Failed for token[${i}]:`, result.reason?.message ?? result.reason);
    } else {
      console.log(`[FCM] Sent OK — messageId:`, result.value);
    }
  });
}

/**
 * Broadcast a push notification to all provided tokens (batched 500 at a time).
 */
export async function broadcastPushNotification(
  allTokens: (string | null | undefined)[],
  message: PushMessage,
): Promise<void> {
  if (!getApps().length) return;

  const valid = allTokens.filter(isValidFcmToken);
  const BATCH_SIZE = 500;
  for (let i = 0; i < valid.length; i += BATCH_SIZE) {
    await sendPushNotification(valid.slice(i, i + BATCH_SIZE), message);
  }
}
