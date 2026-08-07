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

  let affaireId: string | null = body.affaireId ?? null;
  const threadKey = String(body.threadKey ?? 'gen');

  if (!affaireId) {
    const aff = await prisma.affaire.findUnique({ where: { numeroDevis: threadKey } });
    affaireId = aff?.id ?? null;
  }

  // Ensure thread meta exists for affaire threads
  if (affaireId) {
    const aff = await prisma.affaire.findUnique({ where: { id: affaireId } });
    if (aff) {
      await prisma.threadMeta.upsert({
        where: { id: aff.numeroDevis },
        create: {
          id: aff.numeroDevis,
          titre: `${aff.client} — ${aff.adresse.split(',')[0]}`,
          sousTitre: 'Chantier',
          avatar: aff.client.slice(0, 2).toUpperCase(),
          ordre: 10,
        },
        update: {},
      });
    }
  }

  const msg = await prisma.message.create({
    data: {
      threadKey,
      affaireId,
      auteurId: session.user.id,
      texte: texte || null,
      photoLabel: body.photoLabel ?? null,
    },
  });

  // Mentions @Prénom
  const mentions = texte.match(/@(\w+)/g) ?? [];
  if (mentions.length) {
    const names = mentions.map((m) => m.slice(1).toLowerCase());
    const users = await prisma.user.findMany();
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
