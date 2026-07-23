import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';

const DEVICE_ID_KEY = 'muzan_device_id';

/**
 * Returns a stable unique device identifier.
 * - iOS: uses identifierForVendor (resets on app reinstall)
 * - Android: uses androidId (stable per device/signing key)
 * - Web: generates a UUID stored in AsyncStorage
 */
export async function getDeviceId(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      // Web: use stored UUID
      let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
      if (!id) {
        id = generateUUID();
        await AsyncStorage.setItem(DEVICE_ID_KEY, id);
      }
      return id;
    }

    // Native: use expo-application
    if (Platform.OS === 'android') {
      return Application.getAndroidId();
    }

    if (Platform.OS === 'ios') {
      return await Application.getIosIdForVendorAsync();
    }

    return null;
  } catch (err) {
    console.warn('getDeviceId failed:', err);
    return null;
  }
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
