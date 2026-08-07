import { NextResponse } from 'next/server';
import { getSharedStore } from '@/lib/server-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = (await req.json()) as {
    userId?: string;
    subscription?: PushSubscriptionJSON;
  };
  if (!body.userId || !body.subscription?.endpoint) {
    return NextResponse.json({ error: 'Subscription invalide' }, { status: 400 });
  }
  const store = getSharedStore();
  store.pushSubs = store.pushSubs.filter(
    (s) =>
      s.subscription.endpoint !== body.subscription!.endpoint || s.userId !== body.userId,
  );
  store.pushSubs.push({ userId: body.userId, subscription: body.subscription });
  return NextResponse.json({ ok: true, count: store.pushSubs.length });
}

export async function DELETE(req: Request) {
  const body = (await req.json()) as { userId?: string; endpoint?: string };
  const store = getSharedStore();
  store.pushSubs = store.pushSubs.filter((s) => {
    if (body.endpoint) return s.subscription.endpoint !== body.endpoint;
    if (body.userId) return s.userId !== body.userId;
    return true;
  });
  return NextResponse.json({ ok: true });
}
