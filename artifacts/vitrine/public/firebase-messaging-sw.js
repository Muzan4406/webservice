// Firebase Cloud Messaging service worker
// Handles background push notifications when the app is not in focus.

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDfyGukTziMPuVyDeWM3xfhn1Ah16VogYQ",
  authDomain: "webservice-6f6d1.firebaseapp.com",
  projectId: "webservice-6f6d1",
  storageBucket: "webservice-6f6d1.firebasestorage.app",
  messagingSenderId: "906704984190",
  appId: "1:906704984190:web:9e65c4db5236319ac4202f",
});

const messaging = firebase.messaging();

// Handle background messages (app closed or not focused)
messaging.onBackgroundMessage(function (payload) {
  console.log('[FCM SW] Background message received:', payload);

  const title = payload.notification?.title ?? 'Muzan Service';
  const options = {
    body: payload.notification?.body ?? '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: payload.data ?? {},
    requireInteraction: false,
  };

  self.registration.showNotification(title, options);
});

// Click on notification → open/focus the app
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        if (client.url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
    }),
  );
});
