import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { Shell } from '@/components/Shell';
import { MessagesView } from '@/components/MessagesView';
import { redirect } from 'next/navigation';
import { formatDateShort, ROLE_LABEL } from '@/lib/format';
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

  await ensureBureauUsers();
  await ensureValerieMessageEquipe();

  const sp = searchParams ? await searchParams : {};
  const initialFromUrl = sp.thread?.trim() || null;

  const users = sortUsersBureauFirst(
    await prisma.user.findMany({
      where: { actif: true },
    }),
  );

  const userIds = new Set(users.map((u) => u.id));

  const affaires = await prisma.affaire.findMany({
    select: {
      id: true,
      numeroDevis: true,
      client: true,
      adresse: true,
      type: true,
    },
  });
  const affaireByDevis = new Map(affaires.map((a) => [a.numeroDevis, a]));
  const affaireKeys = new Set(affaires.map((a) => a.numeroDevis));

  // Nettoyer les fils orphelins (ni équipe, ni collab, ni chantier)
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

  async function lastOf(threadKey: string, affaireId?: string | null) {
    return prisma.message.findFirst({
      where: affaireId
        ? { OR: [{ threadKey }, { affaireId }], systeme: false }
        : { threadKey, systeme: false },
      orderBy: { createdAt: 'desc' },
      include: { auteur: true },
    });
  }

  // Fils chantier : messages liés à une affaire (même sans ThreadMeta encore)
  const chantierThreadKeys = await prisma.message.findMany({
    where: { affaireId: { not: null } },
    select: { threadKey: true, affaireId: true },
    distinct: ['threadKey'],
  });

  const chantierConvs = (
    await Promise.all(
      chantierThreadKeys.map(async ({ threadKey, affaireId }) => {
        const aff =
          (affaireId
            ? affaires.find((a) => a.id === affaireId)
            : null) ??
          affaireByDevis.get(threadKey) ??
          null;
        if (!aff) return null;

        const avatar = aff.type === 'contrat_entretien' ? 'CE' : 'CH';
        const cls = aff.type === 'contrat_entretien' ? 'ce' : 'cha';
        await prisma.threadMeta.upsert({
          where: { id: threadKey },
          create: {
            id: threadKey,
            titre: `${aff.client} · ${aff.numeroDevis}`,
            sousTitre: aff.adresse.split(',')[0] ?? aff.adresse,
            avatar,
            cls,
            ordre: 50,
          },
          update: {
            titre: `${aff.client} · ${aff.numeroDevis}`,
            sousTitre: aff.adresse.split(',')[0] ?? aff.adresse,
            avatar,
            cls,
          },
        });
        const last = await lastOf(threadKey, aff.id);
        return {
          id: threadKey,
          kind: 'affaire' as const,
          affaireId: aff.id,
          titre: `${aff.client} · ${aff.numeroDevis}`,
          sousTitre: `Fil chantier · ${aff.adresse.split(',')[0] ?? aff.adresse}`,
          avatar,
          photo: null as string | null,
          cls,
          pin: '',
          last: last
            ? `${last.auteur.nom} : ${last.texte ?? last.photoLabel ?? ''}`
            : 'Aucun message',
          hr: last ? formatDateShort(last.createdAt) : '',
          nb: 0,
          sortAt: last?.createdAt?.getTime() ?? 0,
        };
      }),
    )
  )
    .filter((x): x is NonNullable<typeof x> => !!x)
    .sort((a, b) => b.sortAt - a.sortAt);

  const genLast = await lastOf('gen');
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
          photo: null as string | null,
          cls: '',
          pin: '',
          last: last
            ? `${last.auteur.nom} : ${last.texte ?? last.photoLabel ?? ''}`
            : 'Aucun message',
          hr: last ? formatDateShort(last.createdAt) : '',
          nb: 0,
        };
      }),
    )),
  ];

  const initialThread =
    (initialFromUrl && convs.some((c) => c.id === initialFromUrl)
      ? initialFromUrl
      : null) ??
    convs[0]?.id ??
    'gen';

  return (
    <Shell title="Messagerie">
      <MessagesView
        convs={convs}
        initialThread={initialThread}
        meId={session.user.id}
        canAdd={['assistante', 'responsable', 'dirigeant'].includes(session.user.role)}
      />
    </Shell>
  );
}
