import { NextResponse } from 'next/server';
import type { Message } from '@/lib/domain/types';
import { getSharedStore, mergeMessages } from '@/lib/server-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const store = getSharedStore();
  return NextResponse.json({ messages: store.messages });
}

export async function POST(req: Request) {
  const body = (await req.json()) as { message?: Message };
  if (!body.message?.id || !body.message.threadId) {
    return NextResponse.json({ error: 'Message invalide' }, { status: 400 });
  }
  const messages = mergeMessages([body.message]);
  return NextResponse.json({ ok: true, messages });
}
