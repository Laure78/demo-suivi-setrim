import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { AVATAR_EMOJIS } from '@/lib/avatar';

const EMOJI_SET = new Set<string>(AVATAR_EMOJIS);

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      nom: true,
      initiales: true,
      email: true,
      role: true,
      avatarUrl: true,
    },
  });
  if (!user) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
  return NextResponse.json(user);
}

/** Profil : emoji (recommandé) ou retrait. Plus d’upload photo. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const contentType = req.headers.get('content-type') ?? '';
  let action = 'emoji';
  let emoji = '';

  if (contentType.includes('application/json')) {
    const body = await req.json();
    action = String(body.action ?? 'emoji');
    emoji = String(body.emoji ?? '').trim();
  } else {
    const form = await req.formData();
    action = String(form.get('action') ?? 'emoji');
    emoji = String(form.get('emoji') ?? '').trim();
  }

  if (action === 'remove') {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { avatarUrl: null },
    });
    return NextResponse.json({ ok: true, avatarUrl: null });
  }

  if (!emoji || !EMOJI_SET.has(emoji)) {
    return NextResponse.json({ error: 'Emoji non reconnu' }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { avatarUrl: emoji },
  });

  return NextResponse.json({ ok: true, avatarUrl: emoji });
}
