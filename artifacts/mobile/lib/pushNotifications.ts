import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { getStoredToken } from '@/contexts/AuthContext';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request permission and register the device for push notifications.
 * Sends the Expo push token to the API so the server can reach this device.
 * Safe to call on every app launch — silently no-ops on simulators/web.
 */
export async function registerForPushNotificationsAsync(): Promise<void> {
  // Push notifications only work on physical devices
  if (!Device.isDevice) return;
  // Web is not supported
  if (Platform.OS === 'web') return;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[push] Permission not granted');
      return;
    }

    // Get the Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'b4ed452d-4d2c-41b3-a4d0-8feb6ad3d802',
    });
    const token = tokenData.data;

    if (!token) return;

    // Send token to our API
    const authToken = await getStoredToken();
    if (!authToken) return;

    const domain = process.env.EXPO_PUBLIC_DOMAIN;
    await fetch(`https://${domain}/api/push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ token }),
    });
  } catch (err) {
    // Best-effort — never crash the app
    console.error('[push] Registration failed:', err);
  }
}
