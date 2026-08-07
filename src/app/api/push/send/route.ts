import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { getSharedStore } from '@/lib/server-store';
import { VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, VAPID_SUBJECT } from '@/lib/vapid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

export async function POST(req: Request) {
  const body = (await req.json()) as {
    userIds?: string[];
    title?: string;
    body?: string;
    url?: string;
  };
  const targets = body.userIds ?? [];
  if (!targets.length) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const store = getSharedStore();
  const payload = JSON.stringify({
    title: body.title ?? 'SETRIM — Nouveau message',
    body: body.body ?? '',
    url: body.url ?? '/messagerie',
  });

  let sent = 0;
  const keep: typeof store.pushSubs = [];
  for (const sub of store.pushSubs) {
    if (!targets.includes(sub.userId)) {
      keep.push(sub);
      continue;
    }
    try {
      await webpush.sendNotification(sub.subscription as webpush.PushSubscription, payload);
      sent += 1;
      keep.push(sub);
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      // 404/410 = subscription morte
      if (status !== 404 && status !== 410) keep.push(sub);
    }
  }
  store.pushSubs = keep;
  return NextResponse.json({ ok: true, sent });
}
