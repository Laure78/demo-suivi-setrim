import webpush from 'web-push';
import { prisma } from '@/lib/prisma';
import { VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, VAPID_SUBJECT } from '@/lib/vapid';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

export async function notifyUsers(input: {
  userIds: string[];
  title: string;
  body: string;
  url?: string;
}): Promise<void> {
  const subs = await prisma.pushSubscription.findMany({
    where: { userId: { in: input.userIds } },
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
