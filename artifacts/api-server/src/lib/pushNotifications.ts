/**
 * Web Push Notifications — VAPID (Web Push Protocol)
 * Stocke les souscriptions dans la colonne pushToken (JSON.stringify du PushSubscription)
 */
import webpush from "web-push";
import { logger } from "./logger";

let initialized = false;

function init() {
  if (initialized) return;
  const publicKey = process.env["VAPID_PUBLIC_KEY"];
  const privateKey = process.env["VAPID_PRIVATE_KEY"];
  const contact = process.env["VAPID_CONTACT"] ?? "mailto:admin@example.com";

  if (!publicKey || !privateKey) {
    logger.warn("VAPID keys not set — push notifications disabled");
    return;
  }

  webpush.setVapidDetails(contact, publicKey, privateKey);
  initialized = true;
}

export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/** Essaie d'analyser un token stocké comme PushSubscription JSON. */
function parseSubscription(token: string | null | undefined): webpush.PushSubscription | null {
  if (!token) return null;
  try {
    const obj = JSON.parse(token);
    if (obj && typeof obj.endpoint === "string") return obj as webpush.PushSubscription;
  } catch {
    // ancien format Expo — pas une subscription Web Push
  }
  return null;
}

/** Envoie une notification push à une ou plusieurs souscriptions. */
export async function sendPushNotification(
  tokens: (string | null | undefined)[],
  message: PushMessage,
): Promise<void> {
  init();
  if (!initialized) return;

  const payload = JSON.stringify({
    title: message.title,
    body: message.body,
    data: message.data ?? {},
  });

  const subscriptions = tokens.map(parseSubscription).filter(Boolean) as webpush.PushSubscription[];

  await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(sub, payload).catch((err) => {
        logger.warn({ endpoint: sub.endpoint, status: err.statusCode }, "Push échoué");
      })
    )
  );
}

/** Notifie tous les admins (token stocké dans la colonne pushToken). */
export async function notifyAdmins(message: PushMessage): Promise<void> {
  // Les routes appellent déjà sendPushNotification avec les tokens admin — pas besoin ici.
  // Gardée pour compatibilité.
}

/** Diffuse une notification push à tous les tokens fournis. */
export async function broadcastPushNotification(
  allTokens: (string | null | undefined)[],
  message: PushMessage,
): Promise<void> {
  await sendPushNotification(allTokens, message);
}
