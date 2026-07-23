/**
 * Expo Push Notification helper.
 * Sends push notifications via the Expo Push API (no extra server package needed).
 */

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Send a push notification to one or more Expo push tokens.
 * Silently ignores null/undefined tokens.
 */
export async function sendPushNotification(
  tokens: (string | null | undefined)[],
  message: PushMessage,
): Promise<void> {
  const validTokens = tokens.filter(
    (t): t is string => typeof t === "string" && t.startsWith("ExponentPushToken["),
  );
  if (validTokens.length === 0) return;

  const messages = validTokens.map((to) => ({
    to,
    sound: "default",
    title: message.title,
    body: message.body,
    data: message.data ?? {},
    channelId: "muzan-default",
    priority: "high",
  }));

  console.log("[push] Sending to tokens:", validTokens);
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
      signal: AbortSignal.timeout(10_000),
    });
    const responseBody = await res.json();
    if (!res.ok) {
      console.error("[push] Expo push API HTTP error:", res.status, JSON.stringify(responseBody));
    } else {
      // Expo returns 200 even for delivery failures — check each ticket
      console.log("[push] Expo response:", JSON.stringify(responseBody));
      const tickets = responseBody?.data ?? [];
      tickets.forEach((ticket: { status: string; id?: string; message?: string; details?: unknown }, i: number) => {
        if (ticket.status === "error") {
          console.error(`[push] Ticket ${i} error:`, ticket.message, JSON.stringify(ticket.details));
        } else {
          console.log(`[push] Ticket ${i} OK — receiptId:`, ticket.id);
        }
      });
    }
  } catch (err) {
    // Push is best-effort — never crash the API call
    console.error("[push] Failed to send push notification:", err);
  }
}

/**
 * Send a push notification to all users who have a push token.
 */
export async function broadcastPushNotification(
  allTokens: (string | null | undefined)[],
  message: PushMessage,
): Promise<void> {
  // Expo push API accepts up to 100 messages per request
  const valid = allTokens.filter(
    (t): t is string => typeof t === "string" && t.startsWith("ExponentPushToken["),
  );
  const BATCH_SIZE = 100;
  for (let i = 0; i < valid.length; i += BATCH_SIZE) {
    const batch = valid.slice(i, i + BATCH_SIZE);
    await sendPushNotification(batch, message);
  }
}
