import { initializeApp, getApps } from "firebase/app";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: "webservice-6f6d1.firebaseapp.com",
  projectId: "webservice-6f6d1",
  storageBucket: "webservice-6f6d1.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
};

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);

export { app };

export async function getFirebaseMessaging() {
  try {
    const supported = await isSupported();
    if (!supported) return null;
    return getMessaging(app);
  } catch {
    return null;
  }
}
