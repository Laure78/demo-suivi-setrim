import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { Shell } from '@/components/Shell';
import { MessagesView } from '@/components/MessagesView';
import { redirect } from 'next/navigation';
import { ROLE_LABEL } from '@/lib/format';
import {
  ensureBureauUsers,
  ensureValerieMessageEquipe,
  sortUsersBureauFirst,
} from '@/lib/bureau-users';
import { isAdministrateur, isExterne } from '@/lib/acces-labels';

export const dynamic = 'force-dynamic';

function lastPreview(last: {
  auteur: { nom: string };
  texte: string | null;
  photoLabel: string | null;
  fichier: string | null;
  systeme: boolean;
} | null): {
  last: string;
  lastKind: 'text' | 'photo' | 'doc' | 'action' | 'empty';
  lastAt: string | null;
  lastAuthor: string | null;
} {
  if (!last) {
    return { last: 'Aucun message', lastKind: 'empty', lastAt: null, lastAuthor: null };
  }
  if (last.systeme) {
    return {
      last: last.texte ?? 'Action créée',
      lastKind: 'action',
      lastAt: null,
      lastAuthor: last.auteur.nom,
    };
  }
  const isImg =
    last.fichier && /\.(jpe?g|png|webp|gif|heic)$/i.test(last.fichier);
  if (last.fichier && isImg) {
    return {
      last: last.photoLabel ?? 'Photo',
      lastKind: 'photo',
      lastAt: null,
      lastAuthor: last.auteur.nom,
    };
  }
  if (last.fichier || last.photoLabel) {
    return {
      last: last.photoLabel ?? 'Document',
      lastKind: 'doc',
      lastAt: null,
      lastAuthor: last.auteur.nom,
    };
  }
  return {
    last: last.texte ?? '',
    lastKind: 'text',
    lastAt: null,
    lastAuthor: last.auteur.nom,
  };
}

export default async function MessagesPage({
  searchParams,
}: {
  searchParams?: Promise<{ thread?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const externe = isExterne(session.user.acces);
  if (!externe) {
    await ensureBureauUsers();
    await ensureValerieMessageEquipe();
  }

  const sp = searchParams ? await searchParams : {};
  const initialFromUrl = sp.thread?.trim() || null;
  const meId = session.user.id;

  if (externe) {
    const memberships = await prisma.threadMember.findMany({
      where: {
        userId: meId,
        revokedAt: null,
        OR: [{ accessExpiresAt: null }, { accessExpiresAt: { gt: new Date() } }],
      },
      orderBy: { invitedAt: 'desc' },
    });
    const keys = memberships.map((m) => m.threadKey);
    const metas = await prisma.threadMeta.findMany({ where: { id: { in: keys } } });
    const metaById = new Map(metas.map((m) => [m.id, m]));

    const convs = await Promise.all(
      memberships.map(async (m) => {
        const meta = metaById.get(m.threadKey);
        const last = await prisma.message.findFirst({
          where: {
            threadKey: m.threadKey,
            systeme: false,
            interne: false,
            ...(m.historyFrom ? { createdAt: { gte: m.historyFrom } } : {}),
          },
          orderBy: { createdAt: 'desc' },
          include: { auteur: true },
        });
        const prev = lastPreview(last);
        return {
          id: m.threadKey,
          kind: 'ext' as const,
          titre: meta?.titre ?? m.threadKey,
          sousTitre: meta?.sousTitre || 'Discussion invitée',
          avatar: meta?.avatar || 'EX',
          photo: null as string | null,
          cls: meta?.cls || 'cha',
          pinNote: meta?.pin ?? '',
          last: prev.last,
          lastKind: prev.lastKind,
          lastAuthor: prev.lastAuthor,
          lastAt: last?.createdAt?.toISOString() ?? null,
        };
      }),
    );

    const me = await prisma.user.findUnique({ where: { id: meId } });
    const initialThread =
      initialFromUrl && convs.some((c) => c.id === initialFromUrl)
        ? initialFromUrl
        : convs[0]?.id ?? null;

    const mentionPool = await prisma.user.findMany({
      where: {
        OR: [
          { acces: { in: ['administrateur', 'collaborateur'] }, actif: true },
          {
            id: {
              in: (
                await prisma.threadMember.findMany({
                  where: {
                    threadKey: { in: keys },
                    revokedAt: null,
                    user: { acces: 'externe', actif: true },
                  },
                  select: { userId: true },
                })
              ).map((x) => x.userId),
            },
          },
        ],
      },
      select: { id: true, nom: true, initiales: true },
    });

    return (
      <Shell title="Messagerie">
        <MessagesView
          convs={convs}
          initialThread={initialThread}
          meId={meId}
          meAvatar={me?.initiales ?? 'EX'}
          meNom={me?.nom ?? session.user.name ?? ''}
          canAdd={false}
          isExterne
          mentionUsers={mentionPool}
        />
      </Shell>
    );
  }

  const users = sortUsersBureauFirst(
    await prisma.user.findMany({
      where: { actif: true, acces: { in: ['administrateur', 'collaborateur'] } },
    }),
  );

  const userIds = new Set(users.map((u) => u.id));
  const affaireKeys = new Set(
    (await prisma.affaire.findMany({ select: { numeroDevis: true } })).map(
      (a) => a.numeroDevis,
    ),
  );

  const allThreads = await prisma.threadMeta.findMany({ select: { id: true } });
  const toDelete = allThreads
    .map((t) => t.id)
    .filter((id) => id !== 'gen' && !userIds.has(id) && !affaireKeys.has(id));
  if (toDelete.length) {
    await prisma.threadMeta.deleteMany({ where: { id: { in: toDelete } } });
  }

  const genMeta = await prisma.threadMeta.upsert({
    where: { id: 'gen' },
    create: {
      id: 'gen',
      titre: 'Équipe SETRIM',
      sousTitre: users.map((u) => u.nom).join(', '),
      avatar: 'ST',
      cls: 'grp',
      pin: '',
      ordre: 0,
    },
    update: {
      titre: 'Équipe SETRIM',
      sousTitre: users.map((u) => u.nom).join(', '),
      avatar: 'ST',
      cls: 'grp',
      ordre: 0,
    },
  });

  const people = users.filter((u) => u.id !== session.user.id);

  async function lastOf(threadKey: string, opts?: { peerId?: string }) {
    const { peerId } = opts ?? {};
    if (peerId) {
      return prisma.message.findFirst({
        where: {
          systeme: false,
          OR: [{ threadKey: peerId }, { threadKey: meId, auteurId: peerId }],
        },
        orderBy: { createdAt: 'desc' },
        include: { auteur: true },
      });
    }
    return prisma.message.findFirst({
      where: { threadKey, systeme: false },
      orderBy: { createdAt: 'desc' },
      include: { auteur: true },
    });
  }

  const genLast = await lastOf('gen');
  const genPrev = lastPreview(genLast);

  // Fils avec externes actifs : visibles aussi dans la messagerie
  const extThreadKeys = [
    ...new Set(
      (
        await prisma.threadMember.findMany({
          where: {
            revokedAt: null,
            OR: [{ accessExpiresAt: null }, { accessExpiresAt: { gt: new Date() } }],
            user: { acces: 'externe', actif: true },
          },
          select: { threadKey: true },
        })
      ).map((m) => m.threadKey),
    ),
  ].filter((k) => k !== 'gen' && !userIds.has(k));

  const extMetas = await prisma.threadMeta.findMany({
    where: { id: { in: extThreadKeys } },
  });

  const convs = [
    {
      id: 'gen',
      kind: 'gen' as const,
      titre: genMeta.titre,
      sousTitre: genMeta.sousTitre,
      avatar: genMeta.avatar,
      photo: null as string | null,
      cls: 'grp',
      pinNote: genMeta.pin,
      last: genPrev.lastAuthor
        ? `${genPrev.lastAuthor.split(/\s+/)[0]} : ${genPrev.last}`
        : genPrev.last,
      lastKind: genPrev.lastKind,
      lastAuthor: genPrev.lastAuthor,
      lastAt: genLast?.createdAt?.toISOString() ?? null,
      sortAt: genLast?.createdAt?.getTime() ?? 0,
    },
    ...(await Promise.all(
      people.map(async (u) => {
        await prisma.threadMeta.upsert({
          where: { id: u.id },
          create: {
            id: u.id,
            titre: u.nom,
            sousTitre: ROLE_LABEL[u.role] ?? u.role,
            avatar: u.initiales,
            cls: '',
            ordre: 10,
          },
          update: {
            titre: u.nom,
            sousTitre: ROLE_LABEL[u.role] ?? u.role,
            avatar: u.initiales,
          },
        });
        const last = await lastOf(u.id, { peerId: u.id });
        const prev = lastPreview(last);
        return {
          id: u.id,
          kind: 'user' as const,
          titre: u.nom,
          sousTitre: u.terrain
            ? `Sur chantier — ${ROLE_LABEL[u.role] ?? u.role}`
            : ROLE_LABEL[u.role] ?? u.role,
          avatar: u.initiales,
          photo: null as string | null,
          cls: '',
          pinNote: '',
          last: prev.last,
          lastKind: prev.lastKind,
          lastAuthor: prev.lastAuthor,
          lastAt: last?.createdAt?.toISOString() ?? null,
          sortAt: last?.createdAt?.getTime() ?? 0,
        };
      }),
    )),
    ...(await Promise.all(
      extMetas.map(async (meta) => {
        const last = await lastOf(meta.id);
        const prev = lastPreview(last);
        return {
          id: meta.id,
          kind: 'cha' as const,
          titre: meta.titre,
          sousTitre: `Ouvert aux externes · ${meta.sousTitre}`,
          avatar: meta.avatar || 'CH',
          photo: null as string | null,
          cls: meta.cls || 'cha',
          pinNote: meta.pin,
          last: prev.last,
          lastKind: prev.lastKind,
          lastAuthor: prev.lastAuthor,
          lastAt: last?.createdAt?.toISOString() ?? null,
          sortAt: last?.createdAt?.getTime() ?? 0,
        };
      }),
    )),
  ]
    .sort((a, b) => b.sortAt - a.sortAt)
    .map(({ sortAt: _s, ...c }) => c);

  const initialThread =
    initialFromUrl && convs.some((c) => c.id === initialFromUrl)
      ? initialFromUrl
      : null;

  const me = users.find((u) => u.id === session.user.id);

  return (
    <Shell title="Messagerie">
      <MessagesView
        convs={convs}
        initialThread={initialThread}
        meId={session.user.id}
        meAvatar={me?.initiales ?? 'ME'}
        meNom={me?.nom ?? session.user.name ?? ''}
        canAdd={isAdministrateur(session.user.acces)}
        isExterne={false}
        mentionUsers={users.map((u) => ({
          id: u.id,
          nom: u.nom,
          initiales: u.initiales,
        }))}
      />
    </Shell>
  );
}
