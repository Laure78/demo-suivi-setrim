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
    include: { auteur: { select: { nom: true, initiales: true, avatarUrl: true } } },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ messages, pin: meta?.pin ?? '' });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const body = await req.json();
  const texte = String(body.texte ?? '').trim();
  const photoLabel = body.photoLabel ? String(body.photoLabel) : null;
  const fichier = body.fichier ? String(body.fichier) : null;
  if (!texte && !photoLabel && !fichier) {
    return NextResponse.json({ error: 'Message vide' }, { status: 400 });
  }

  const threadKey = String(body.threadKey ?? 'gen');
  const affaireId = body.affaireId ? String(body.affaireId) : null;

  // Messagerie interne (Équipe / DM) OU fil chantier (affaire)
  if (threadKey !== 'gen') {
    const user = await prisma.user.findUnique({ where: { id: threadKey } });
    const affaire =
      !user &&
      (await prisma.affaire.findFirst({
        where: affaireId
          ? { id: affaireId }
          : { numeroDevis: threadKey },
      }));
    if (!user && !affaire) {
      return NextResponse.json(
        {
          error:
            'Conversation introuvable — Équipe SETRIM, un collaborateur, ou une affaire.',
        },
        { status: 400 },
      );
    }
  }

  const msg = await prisma.message.create({
    data: {
      threadKey,
      affaireId: affaireId ?? null,
      auteurId: session.user.id,
      texte: texte || null,
      photoLabel,
      fichier,
    },
  });

  const preview =
    texte ||
    (fichier && photoLabel
      ? `📎 ${photoLabel}`
      : photoLabel
        ? `📷 ${photoLabel}`
        : 'Nouveau message');

  // Notifs : uniquement messagerie interne (pas les fils chantier)
  if (!affaireId && threadKey === 'gen') {
    const others = await prisma.user.findMany({
      where: { actif: true, id: { not: session.user.id } },
      select: { id: true },
    });
    await notifyUsers({
      userIds: others.map((u) => u.id),
      title: `Équipe SETRIM — ${session.user.name}`,
      body: preview.slice(0, 120),
      url: '/messages',
    });
  } else if (!affaireId && threadKey !== 'gen') {
    const isUser = await prisma.user.findUnique({ where: { id: threadKey } });
    if (isUser) {
      await notifyUsers({
        userIds: [threadKey],
        title: `${session.user.name}`,
        body: preview.slice(0, 120),
        url: '/messages',
      });
    }
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
