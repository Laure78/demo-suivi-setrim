/**
 * Notifications navigateur (desktop + mobile) pour les alertes critiques.
 * Démo : pas de service worker push — API Notification du navigateur.
 */

import type { DayAlert } from './chantier-helpers';

const SEEN_KEY = 'setrim-notif-seen-v1';

function loadSeen(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = sessionStorage.getItem(SEEN_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveSeen(seen: Set<string>) {
  try {
    sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
  } catch {
    /* ignore */
  }
}

export function notificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function ensureNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationSupported()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
}

/** Envoie une notif native pour chaque alerte critique non encore vue (session). */
export function pushBrowserAlerts(alerts: DayAlert[]): void {
  if (!notificationSupported() || Notification.permission !== 'granted') return;

  const seen = loadSeen();
  const critical = alerts.filter((a) => a.severity === 'escalate' || a.severity === 'red');

  for (const a of critical) {
    if (seen.has(a.id)) continue;
    seen.add(a.id);
    try {
      const n = new Notification('SETRIM — Alerte', {
        body: `${a.title}\n${a.subtitle}`,
        tag: a.id,
        lang: 'fr',
        icon: '/logo-setrim.png',
        requireInteraction: a.severity === 'escalate',
      });
      n.onclick = () => {
        window.focus();
        window.location.href = a.href;
        n.close();
      };
    } catch {
      /* Safari / restrictions */
    }
  }
  saveSeen(seen);
}
