import { useEffect, useRef } from "react";
import { getToken } from "firebase/messaging";
import { getFirebaseMessaging } from "@/lib/firebase";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string;
const STORAGE_KEY = "fcm_token_v1";

/**
 * Requests notification permission and registers the FCM token with the backend.
 * Only runs when the user is authenticated. Skips if the token hasn't changed.
 */
export function useFcmToken(isAuthenticated: boolean) {
  const registered = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || registered.current) return;
    if (!("Notification" in window)) return;

    let cancelled = false;

    async function register() {
      try {
        const messaging = await getFirebaseMessaging();
        if (!messaging || cancelled) return;

        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        // Register the service worker explicitly so Vite doesn't intercept it
        const swReg = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
          scope: "/",
        });

        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: swReg,
        });

        if (!token || cancelled) return;

        // Avoid redundant API calls if token hasn't changed
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === token) {
          registered.current = true;
          return;
        }

        const authToken = localStorage.getItem("muzan_auth_token");
        const res = await fetch("/api/push-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({ token }),
        });

        if (res.ok) {
          localStorage.setItem(STORAGE_KEY, token);
          registered.current = true;
          console.log("[FCM] Token registered successfully.");
        }
      } catch (err) {
        // Non-blocking: push notifications are optional
        console.warn("[FCM] Token registration failed:", err);
      }
    }

    register();
    return () => { cancelled = true; };
  }, [isAuthenticated]);
}
