import { VAPID_PUBLIC_KEY } from '@/lib/vapid';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch {
    return null;
  }
}

export async function enableWebPush(userId: string): Promise<{ ok: boolean; error?: string }> {
  if (!('Notification' in window) || !('PushManager' in window)) {
    return { ok: false, error: 'Notifications push non supportées sur cet appareil' };
  }
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') {
    return { ok: false, error: 'Permission notifications refusée' };
  }
  const reg = await registerServiceWorker();
  if (!reg) return { ok: false, error: 'Service worker indisponible' };

  const existing = await reg.pushManager.getSubscription();
  const sub =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    }));

  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, subscription: sub.toJSON() }),
  });
  return { ok: true };
}
