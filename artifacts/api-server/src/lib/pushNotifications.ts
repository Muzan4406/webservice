/**
 * Push notification stubs — Firebase removed.
 * These functions are no-ops; they keep the existing route imports working
 * without requiring any external credentials.
 */

export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export async function sendPushNotification(
  _tokens: (string | null | undefined)[],
  _message: PushMessage,
): Promise<void> {
  // Push notifications disabled — Firebase removed.
}

export async function notifyAdmins(_message: PushMessage): Promise<void> {
  // Push notifications disabled — Firebase removed.
}

export async function broadcastPushNotification(
  _allTokens: (string | null | undefined)[],
  _message: PushMessage,
): Promise<void> {
  // Push notifications disabled — Firebase removed.
}
