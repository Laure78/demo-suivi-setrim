import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { notifyUsers } from '@/lib/push-server';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const thread = new URL(req.url).searchParams.get('thread') ?? 'gen';
  const meta = await prisma.threadMeta.findUnique({ where: { id: thread } });
  const messages = await prisma.message.findMany({
    where: { threadKey: thread },
    include: { auteur: { select: { nom: true, initiales: true } } },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ messages, pin: meta?.pin ?? '' });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const body = await req.json();
  const texte = String(body.texte ?? '').trim();
  if (!texte && !body.photoLabel) {
    return NextResponse.json({ error: 'Message vide' }, { status: 400 });
  }

  const threadKey = String(body.threadKey ?? 'gen');

  // Messagerie = Équipe SETRIM ou direct collaborateur uniquement
  if (threadKey !== 'gen') {
    const user = await prisma.user.findUnique({ where: { id: threadKey } });
    if (!user) {
      return NextResponse.json(
        { error: 'Conversation introuvable — uniquement Équipe SETRIM ou un collaborateur.' },
        { status: 400 },
      );
    }
  }

  const msg = await prisma.message.create({
    data: {
      threadKey,
      affaireId: body.affaireId ?? null,
      auteurId: session.user.id,
      texte: texte || null,
      photoLabel: body.photoLabel ?? null,
    },
  });

  // Notifier le destinataire en DM, ou toute l'équipe sur le fil général
  if (threadKey === 'gen') {
    const others = await prisma.user.findMany({
      where: { actif: true, id: { not: session.user.id } },
      select: { id: true },
    });
    await notifyUsers({
      userIds: others.map((u) => u.id),
      title: `Équipe SETRIM — ${session.user.name}`,
      body: texte.slice(0, 120),
      url: '/messages',
    });
  } else {
    await notifyUsers({
      userIds: [threadKey],
      title: `${session.user.name}`,
      body: texte.slice(0, 120),
      url: '/messages',
    });
  }

  const mentions = texte.match(/@(\w+)/g) ?? [];
  if (mentions.length) {
    const names = mentions.map((m) => m.slice(1).toLowerCase());
    const users = await prisma.user.findMany({ where: { actif: true } });
    const targets = users.filter((u) =>
      names.some((n) => u.nom.toLowerCase().startsWith(n) || u.id.startsWith(n)),
    );
    if (targets.length) {
      await notifyUsers({
        userIds: targets.map((u) => u.id),
        title: `${session.user.name} vous a mentionné`,
        body: texte.slice(0, 120),
        url: '/messages',
      });
    }
  }

  return NextResponse.json(msg);
}
