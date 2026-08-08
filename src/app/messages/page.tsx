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

export default async function MessagesPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  await ensureBureauUsers();
  await ensureValerieMessageEquipe();

  const users = sortUsersBureauFirst(
    await prisma.user.findMany({
      where: { actif: true },
    }),
  );

  const userIds = new Set(users.map((u) => u.id));

  // Messagerie interne uniquement : Équipe + DM (pas de fils chantier)
  const allThreads = await prisma.threadMeta.findMany({ select: { id: true } });
  const toDelete = allThreads
    .map((t) => t.id)
    .filter((id) => id !== 'gen' && !userIds.has(id));
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

  async function lastOf(threadKey: string) {
    return prisma.message.findFirst({
      where: { threadKey, systeme: false },
      orderBy: { createdAt: 'desc' },
      include: { auteur: true },
    });
  }

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
    )),
  ];

  return (
    <Shell title="Messagerie">
      <MessagesView
        convs={convs}
        initialThread={convs[0]?.id ?? 'gen'}
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
