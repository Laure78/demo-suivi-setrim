import { auth } from '@/auth';
import { notifyUsers } from '@/lib/push-server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const body = await req.json();
  await notifyUsers({
    userIds: body.userIds ?? [],
    title: body.title ?? 'SETRIM',
    body: body.body ?? '',
    url: body.url,
  });
  return NextResponse.json({ ok: true });
}
