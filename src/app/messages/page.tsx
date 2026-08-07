import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { Shell } from '@/components/Shell';
import { MessagesView } from '@/components/MessagesView';
import { redirect } from 'next/navigation';
import { formatDateShort } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function MessagesPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const threads = await prisma.threadMeta.findMany({ orderBy: { ordre: 'asc' } });
  const lastByThread = await prisma.message.groupBy({
    by: ['threadKey'],
    _max: { createdAt: true },
  });
  const lastMap = Object.fromEntries(
    lastByThread.map((x) => [x.threadKey, x._max.createdAt]),
  );

  const convs = await Promise.all(
    threads.map(async (t) => {
      const last = await prisma.message.findFirst({
        where: { threadKey: t.id, systeme: false },
        orderBy: { createdAt: 'desc' },
        include: { auteur: true },
      });
      return {
        id: t.id,
        titre: t.titre,
        sousTitre: t.sousTitre,
        avatar: t.avatar,
        cls: t.cls,
        pin: t.pin,
        last: last
          ? `${last.auteur.nom} : ${last.texte ?? last.photoLabel ?? ''}`
          : 'Aucun message',
        hr: lastMap[t.id] ? formatDateShort(lastMap[t.id]!) : '',
        nb: 0,
      };
    }),
  );

  return (
    <Shell title="Messages">
      <MessagesView
        convs={convs}
        initialThread={convs[0]?.id ?? 'gen'}
        meId={session.user.id}
      />
    </Shell>
  );
}
