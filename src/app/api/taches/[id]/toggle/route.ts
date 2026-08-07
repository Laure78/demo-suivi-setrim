import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { notifyUsers } from '@/lib/push-server';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id } = await params;
  const tache = await prisma.tache.findUnique({ where: { id } });
  if (!tache) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

  const fait = !tache.fait;
  const updated = await prisma.tache.update({
    where: { id },
    data: { fait, faitAt: fait ? new Date() : null },
  });

  if (fait) {
    // Alerte éteinte uniquement par la case — pas de notify
  } else {
    await notifyUsers({
      userIds: [tache.responsableId],
      title: 'Tâche rouverte',
      body: tache.titre,
      url: '/aujourdhui',
    });
  }

  return NextResponse.json(updated);
}
