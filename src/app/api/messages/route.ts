import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { notifyUsers } from '@/lib/push-server';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const url = new URL(req.url);
  const thread = url.searchParams.get('thread') ?? 'gen';
  const affaireIdParam = url.searchParams.get('affaireId');
  const meta = await prisma.threadMeta.findUnique({ where: { id: thread } });

  const affaire =
    affaireIdParam
      ? await prisma.affaire.findUnique({ where: { id: affaireIdParam } })
      : await prisma.affaire.findFirst({ where: { numeroDevis: thread } });

  const messages = await prisma.message.findMany({
    where: affaire
      ? { OR: [{ threadKey: thread }, { affaireId: affaire.id }] }
      : { threadKey: thread },
    include: { auteur: { select: { nom: true, initiales: true } } },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({
    messages,
    pin: meta?.pin ?? '',
    affaireId: affaire?.id ?? null,
  });
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
  let affaireId = body.affaireId ? String(body.affaireId) : null;

  // Messagerie interne (Équipe / DM) OU fil chantier (affaire)
  let affaire = affaireId
    ? await prisma.affaire.findUnique({ where: { id: affaireId } })
    : null;

  if (threadKey !== 'gen') {
    const user = await prisma.user.findUnique({ where: { id: threadKey } });
    if (!user && !affaire) {
      affaire = await prisma.affaire.findFirst({ where: { numeroDevis: threadKey } });
    }
    if (!user && !affaire) {
      return NextResponse.json(
        {
          error:
            'Conversation introuvable — Équipe SETRIM, un collaborateur, ou une affaire.',
        },
        { status: 400 },
      );
    }
    if (affaire) affaireId = affaire.id;
  }

  const msg = await prisma.message.create({
    data: {
      threadKey,
      affaireId,
      auteurId: session.user.id,
      texte: texte || null,
      photoLabel,
      fichier,
    },
  });

  // Fil chantier → visible aussi dans la messagerie (conversation dédiée)
  if (affaire) {
    const avatar = affaire.type === 'contrat_entretien' ? 'CE' : 'CH';
    const cls = affaire.type === 'contrat_entretien' ? 'ce' : 'cha';
    await prisma.threadMeta.upsert({
      where: { id: threadKey },
      create: {
        id: threadKey,
        titre: `${affaire.client} · ${affaire.numeroDevis}`,
        sousTitre: affaire.adresse.split(',')[0] ?? affaire.adresse,
        avatar,
        cls,
        pin: '',
        ordre: 50,
      },
      update: {
        titre: `${affaire.client} · ${affaire.numeroDevis}`,
        sousTitre: affaire.adresse.split(',')[0] ?? affaire.adresse,
        avatar,
        cls,
      },
    });
  }

  const preview =
    texte ||
    (fichier && photoLabel
      ? `📎 ${photoLabel}`
      : photoLabel
        ? `📷 ${photoLabel}`
        : 'Nouveau message');

  // Notifs : messagerie interne + fil chantier (tout le bureau)
  if (affaireId) {
    const others = await prisma.user.findMany({
      where: { actif: true, id: { not: session.user.id } },
      select: { id: true },
    });
    await notifyUsers({
      userIds: others.map((u) => u.id),
      title: `${affaire?.client ?? 'Chantier'} — ${session.user.name}`,
      body: preview.slice(0, 120),
      url: `/messages?thread=${encodeURIComponent(threadKey)}`,
    });
  } else if (threadKey === 'gen') {
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
  } else if (threadKey !== 'gen') {
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
