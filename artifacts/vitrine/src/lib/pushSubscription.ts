/**
 * Gestion de la souscription aux notifications push Web.
 * Appelé après la connexion de l'utilisateur.
 */

async function getVapidPublicKey(): Promise<string | null> {
  try {
    const token = localStorage.getItem('muzan_auth_token');
    const res = await fetch('/api/push/vapid-public-key', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.publicKey ?? null;
  } catch {
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

async function saveSubscription(subscription: PushSubscription): Promise<void> {
  const token = localStorage.getItem('muzan_auth_token');
  await fetch('/api/push-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ token: JSON.stringify(subscription) }),
  });
}

/**
 * Demande la permission et abonne l'utilisateur aux notifications push.
 * Silencieux en cas d'erreur (ne bloque pas l'app).
 */
export async function subscribeToPush(): Promise<void> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    // Ne pas demander si déjà refusé (évite le spam)
    if (Notification.permission === 'denied') return;

    const vapidPublicKey = await getVapidPublicKey();
    if (!vapidPublicKey) return;

    const registration = await navigator.serviceWorker.ready;

    // Vérifier si déjà souscrit
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      // Synchroniser avec le backend au cas où la clé a changé
      await saveSubscription(existingSubscription);
      return;
    }

    // Demander la permission si pas encore accordée
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    await saveSubscription(subscription);
  } catch {
    // Silencieux — les notifications push sont optionnelles
  }
}
