import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { notifyUsers } from '@/lib/push-server';
import {
  assertThreadAccess,
  isExterne,
  listActiveExterneMembers,
  messagesVisibilityWhere,
  notifyIdsForThread,
  threadHasExternes,
} from '@/lib/externe-access';
import { isInterne } from '@/lib/acces-labels';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const url = new URL(req.url);
  const thread = url.searchParams.get('thread') ?? 'gen';
  const affaireIdParam = url.searchParams.get('affaireId');
  const acces = session.user.acces;
  const meId = session.user.id;

  const access = await assertThreadAccess({ userId: meId, acces, threadKey: thread });
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  // Externes : pas d'accès au fil Équipe ni aux DM hors membership (déjà couvert)
  if (access.isExterne && thread === 'gen') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  const meta = await prisma.threadMeta.findUnique({ where: { id: thread } });

  const affaire =
    affaireIdParam
      ? await prisma.affaire.findUnique({ where: { id: affaireIdParam } })
      : await prisma.affaire.findFirst({ where: { numeroDevis: thread } });

  const peer =
    !affaire && thread !== 'gen' && isInterne(acces)
      ? await prisma.user.findUnique({
          where: { id: thread },
          select: { id: true, acces: true },
        })
      : null;

  const baseWhere = affaire
    ? { OR: [{ threadKey: thread }, { affaireId: affaire.id }] }
    : peer && isInterne(peer.acces)
      ? {
          OR: [{ threadKey: thread }, { threadKey: meId, auteurId: peer.id }],
        }
      : { threadKey: thread };

  const messages = await prisma.message.findMany({
    where: {
      AND: [baseWhere, messagesVisibilityWhere(access)],
    },
    include: {
      auteur: {
        select: {
          nom: true,
          initiales: true,
          societe: true,
          fonction: true,
          acces: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const externes = isInterne(acces) ? await listActiveExterneMembers(thread) : [];
  const pendingInvites = isInterne(acces)
    ? await prisma.externalInvite.findMany({
        where: {
          threadKey: thread,
          acceptedAt: null,
          cancelledAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      })
    : [];

  return NextResponse.json({
    messages,
    pin: meta?.pin ?? '',
    affaireId: affaire?.id ?? null,
    hasExternes: externes.length > 0 || (await threadHasExternes(thread)),
    externes: externes.map((m) => ({
      id: m.user.id,
      nom: m.user.nom,
      societe: m.user.societe,
      fonction: m.user.fonction,
      email: m.user.email,
      initiales: m.user.initiales,
      accessExpiresAt: m.accessExpiresAt,
    })),
    pendingInvites: pendingInvites.map((i) => ({
      id: i.id,
      email: i.email,
      nom: i.nom,
      societe: i.societe,
      expiresAt: i.expiresAt.toISOString(),
      historyMode: i.historyMode,
    })),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const body = await req.json();
  const texte = String(body.texte ?? '').trim();
  const photoLabel = body.photoLabel ? String(body.photoLabel) : null;
  const fichier = body.fichier ? String(body.fichier) : null;
  const interne = !!body.interne && isInterne(session.user.acces);
  if (!texte && !photoLabel && !fichier) {
    return NextResponse.json({ error: 'Message vide' }, { status: 400 });
  }

  const threadKey = String(body.threadKey ?? 'gen');
  let affaireId = body.affaireId ? String(body.affaireId) : null;

  const access = await assertThreadAccess({
    userId: session.user.id,
    acces: session.user.acces,
    threadKey,
  });
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  if (access.isExterne && (interne || threadKey === 'gen')) {
    return NextResponse.json({ error: 'Action non autorisée' }, { status: 403 });
  }

  let affaire = affaireId
    ? await prisma.affaire.findUnique({ where: { id: affaireId } })
    : null;

  if (threadKey !== 'gen' && isInterne(session.user.acces)) {
    const user = await prisma.user.findUnique({ where: { id: threadKey } });
    if (!user && !affaire) {
      affaire = await prisma.affaire.findFirst({ where: { numeroDevis: threadKey } });
    }
    if (!user && !affaire) {
      // Fil créé pour externes uniquement (membership) — autoriser si métas existent
      const meta = await prisma.threadMeta.findUnique({ where: { id: threadKey } });
      if (!meta) {
        return NextResponse.json(
          {
            error:
              'Conversation introuvable — Équipe SETRIM, un collaborateur, ou une affaire.',
          },
          { status: 400 },
        );
      }
    }
    if (affaire) affaireId = affaire.id;
  } else if (access.isExterne) {
    affaire = await prisma.affaire.findFirst({ where: { numeroDevis: threadKey } });
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
      interne,
    },
  });

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
    (interne ? '[Interne] ' : '') +
    (texte ||
      (fichier && photoLabel
        ? `📎 ${photoLabel}`
        : photoLabel
          ? `📷 ${photoLabel}`
          : 'Nouveau message'));

  // Notes internes : uniquement les collaborateurs internes
  if (interne) {
    const internes = await prisma.user.findMany({
      where: {
        actif: true,
        id: { not: session.user.id },
        acces: { in: ['administrateur', 'collaborateur'] },
      },
      select: { id: true },
    });
    await notifyUsers({
      userIds: internes.map((u) => u.id),
      title: `Note interne — ${session.user.name}`,
      body: preview.slice(0, 120),
      url: '/messages',
      alertType: 'messages',
    });
    return NextResponse.json(msg);
  }

  const notifyIds = await notifyIdsForThread(threadKey, session.user.id);
  // Affiner : sur DM 1-1 interne, ne pas spammer tout le bureau
  const peerUser =
    threadKey !== 'gen'
      ? await prisma.user.findUnique({
          where: { id: threadKey },
          select: { id: true, acces: true },
        })
      : null;

  let recipients = notifyIds;
  if (peerUser && isInterne(peerUser.acces) && !(await threadHasExternes(threadKey))) {
    recipients = [peerUser.id];
  } else if (threadKey === 'gen') {
    recipients = (
      await prisma.user.findMany({
        where: {
          actif: true,
          id: { not: session.user.id },
          acces: { in: ['administrateur', 'collaborateur'] },
        },
        select: { id: true },
      })
    ).map((u) => u.id);
  }

  const urlNotif =
    affaireId && !isExterne(session.user.acces)
      ? `/portefeuille?affaire=${encodeURIComponent(affaireId)}`
      : '/messages';

  await notifyUsers({
    userIds: recipients,
    title: `${affaire?.client ?? (threadKey === 'gen' ? 'Équipe SETRIM' : session.user.name)} — ${session.user.name}`,
    body: preview.slice(0, 120),
    url: urlNotif,
    alertType: 'messages',
  });

  if (texte && isInterne(session.user.acces)) {
    const mentions = texte.match(/@(\w+)/g) ?? [];
    if (mentions.length) {
      const names = mentions.map((m) => m.slice(1).toLowerCase());
      const membres = await listActiveExterneMembers(threadKey);
      const users = await prisma.user.findMany({
        where: {
          actif: true,
          OR: [
            { acces: { in: ['administrateur', 'collaborateur'] } },
            { id: { in: membres.map((m) => m.userId) } },
          ],
        },
      });
      const targets = users.filter((u) =>
        names.some(
          (n) =>
            u.nom.toLowerCase().startsWith(n) ||
            u.id.startsWith(n) ||
            (u.prenom && u.prenom.toLowerCase().startsWith(n)),
        ),
      );
      if (targets.length) {
        await notifyUsers({
          userIds: targets.map((u) => u.id),
          title: `${session.user.name} vous a mentionné`,
          body: texte.slice(0, 120),
          url: '/messages',
          alertType: 'messages',
          priority: 'urgent',
          niveau: 3,
        });
      }
    }
  }

  return NextResponse.json(msg);
}
