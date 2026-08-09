import webpush from 'web-push';
import { prisma } from '@/lib/prisma';
import { VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, VAPID_SUBJECT } from '@/lib/vapid';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

/** Plage de silence (ex. 22:00 → 07:00, peut chevaucher minuit). */
export function isInSilenceWindow(
  debut: string,
  fin: string,
  now = new Date(),
): boolean {
  const parse = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  };
  const start = parse(debut);
  const end = parse(fin);
  const cur = now.getHours() * 60 + now.getMinutes();
  if (start === end) return false;
  if (start < end) return cur >= start && cur < end;
  return cur >= start || cur < end;
}

export async function notifyUsers(input: {
  userIds: string[];
  title: string;
  body: string;
  url?: string;
  /** urgent = immédiat, ignore silence ; normal = résumé / respect silence */
  priority?: 'urgent' | 'normal';
  /** Filtrer selon préférences (messages, actions…) */
  alertType?: 'messages' | 'actions' | 'contrats' | 'relances';
  niveau?: number;
}): Promise<void> {
  const priority = input.priority ?? (input.niveau && input.niveau >= 3 ? 'urgent' : 'normal');
  const uniqueIds = [...new Set(input.userIds.filter(Boolean))];
  if (!uniqueIds.length) return;

  const prefs = await prisma.userNotifPrefs.findMany({
    where: { userId: { in: uniqueIds } },
  });
  const prefsByUser = new Map(prefs.map((p) => [p.userId, p]));

  const allowed = uniqueIds.filter((uid) => {
    const p = prefsByUser.get(uid);
    if (p && !p.pushEnabled) return false;
    if (p && input.niveau != null && input.niveau < p.urgenceMin) return false;
    if (p && input.alertType === 'messages' && !p.alertMessages) return false;
    if (p && input.alertType === 'actions' && !p.alertActions) return false;
    if (p && input.alertType === 'contrats' && !p.alertContrats) return false;
    if (p && input.alertType === 'relances' && !p.alertRelances) return false;
    if (priority !== 'urgent' && p && isInSilenceWindow(p.silenceDebut, p.silenceFin)) {
      return false;
    }
    return true;
  });

  if (!allowed.length) return;

  const subs = await prisma.pushSubscription.findMany({
    where: { userId: { in: allowed } },
  });

  const payload = JSON.stringify({
    title: input.title,
    body: input.body,
    url: input.url ?? '/aujourdhui',
  });

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          payload,
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 410 || status === 404) {
          await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => undefined);
        }
      }
    }),
  );
}
