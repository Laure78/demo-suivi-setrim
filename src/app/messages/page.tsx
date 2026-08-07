import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { Shell } from '@/components/Shell';
import { MessagesView } from '@/components/MessagesView';
import { redirect } from 'next/navigation';
import { formatDateShort, ROLE_LABEL, STATUT_LABEL } from '@/lib/format';
import {
  ensureBureauUsers,
  ensureValerieMessageEquipe,
  sortUsersBureauFirst,
} from '@/lib/bureau-users';

export const dynamic = 'force-dynamic';

export default async function MessagesPage({
  searchParams,
}: {
  searchParams?: Promise<{ thread?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const sp = searchParams ? await searchParams : {};
  const wantedThread = sp.thread?.trim() || null;

  await ensureBureauUsers();
  await ensureValerieMessageEquipe();

  const users = sortUsersBureauFirst(
    await prisma.user.findMany({
      where: { actif: true },
    }),
  );

  const userIds = new Set(users.map((u) => u.id));

  const affaires = await prisma.affaire.findMany({
    where: {
      OR: [
        { statut: { in: ['commande', 'programme', 'encours'] } },
        { messages: { some: {} } },
      ],
    },
    orderBy: [{ client: 'asc' }, { numeroDevis: 'asc' }],
    select: {
      id: true,
      numeroDevis: true,
      client: true,
      adresse: true,
      statut: true,
    },
  });
  const affaireNums = new Set(affaires.map((a) => a.numeroDevis));

  // Nettoyer uniquement les métas orphelines (ni équipe, ni collège, ni affaire)
  const allThreads = await prisma.threadMeta.findMany({ select: { id: true } });
  const toDelete = allThreads
    .map((t) => t.id)
    .filter((id) => id !== 'gen' && !userIds.has(id) && !affaireNums.has(id) && id !== 'ce');
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

  async function lastOf(threadKey: string, affaireId?: string) {
    return prisma.message.findFirst({
      where: {
        systeme: false,
        OR: [
          { threadKey },
          ...(affaireId ? [{ affaireId }] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: { auteur: true },
    });
  }

  const genLast = await lastOf('gen');

  const chantierConvs = await Promise.all(
    affaires.map(async (a) => {
      const last = await lastOf(a.numeroDevis, a.id);
      const avatar = a.client
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
      await prisma.threadMeta.upsert({
        where: { id: a.numeroDevis },
        create: {
          id: a.numeroDevis,
          titre: `${a.client} · ${a.numeroDevis}`,
          sousTitre: a.adresse,
          avatar: avatar || 'AF',
          cls: 'cha',
          ordre: 5,
        },
        update: {
          titre: `${a.client} · ${a.numeroDevis}`,
          sousTitre: a.adresse,
          avatar: avatar || 'AF',
          cls: 'cha',
          ordre: 5,
        },
      });
      return {
        id: a.numeroDevis,
        kind: 'affaire' as const,
        affaireId: a.id,
        titre: `${a.client} · ${a.numeroDevis}`,
        sousTitre: `${STATUT_LABEL[a.statut] ?? a.statut} — ${a.adresse}`,
        avatar: avatar || 'AF',
        photo: null as string | null,
        cls: 'cha',
        pin: '',
        last: last
          ? `${last.auteur.nom} : ${last.texte ?? last.photoLabel ?? ''}`
          : 'Fil de discussion du chantier',
        hr: last ? formatDateShort(last.createdAt) : '',
        nb: 0,
        sortAt: last?.createdAt?.getTime() ?? 0,
      };
    }),
  );

  // Chantiers les plus récents en premier
  chantierConvs.sort((a, b) => b.sortAt - a.sortAt);

  const peopleConvs = await Promise.all(
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
      const last = await lastOf(u.id);
      return {
        id: u.id,
        kind: 'user' as const,
        affaireId: null as string | null,
        titre: u.nom,
        sousTitre: u.terrain
          ? `Sur chantier — ${ROLE_LABEL[u.role] ?? u.role}`
          : ROLE_LABEL[u.role] ?? u.role,
        avatar: u.initiales,
        photo: u.avatarUrl ?? null,
        cls: '',
        pin: '',
        last: last
          ? `${last.auteur.nom} : ${last.texte ?? last.photoLabel ?? ''}`
          : 'Aucun message',
        hr: last ? formatDateShort(last.createdAt) : '',
        nb: 0,
      };
    }),
  );

  const convs = [
    {
      id: 'gen',
      kind: 'gen' as const,
      affaireId: null as string | null,
      titre: genMeta.titre,
      sousTitre: genMeta.sousTitre,
      avatar: genMeta.avatar,
      photo: null as string | null,
      cls: 'grp',
      pin: genMeta.pin,
      last: genLast
        ? `${genLast.auteur.nom} : ${genLast.texte ?? genLast.photoLabel ?? ''}`
        : 'Aucun message',
      hr: genLast ? formatDateShort(genLast.createdAt) : '',
      nb: 0,
    },
    ...chantierConvs.map(({ sortAt: _s, ...c }) => c),
    ...peopleConvs,
  ];

  const initialThread =
    wantedThread && convs.some((c) => c.id === wantedThread)
      ? wantedThread
      : convs[0]?.id ?? 'gen';

  return (
    <Shell title="Messages">
      <MessagesView
        convs={convs}
        initialThread={initialThread}
        meId={session.user.id}
        meNom={session.user.name ?? ''}
        meInitiales={session.user.initiales}
        meAvatarUrl={
          users.find((u) => u.id === session.user.id)?.avatarUrl ?? null
        }
        canAdd={['assistante', 'responsable', 'dirigeant'].includes(session.user.role)}
      />
    </Shell>
  );
}
