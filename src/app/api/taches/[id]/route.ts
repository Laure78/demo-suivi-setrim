import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { notifyUsers } from '@/lib/push-server';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id } = await params;
  const tache = await prisma.tache.findUnique({ where: { id } });
  if (!tache) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

  const body = await req.json();
  const data: {
    titre?: string;
    niveau?: number;
    dateEcheance?: Date;
    responsableId?: string;
  } = {};

  if (body.titre != null) {
    const titre = String(body.titre).trim();
    if (!titre) return NextResponse.json({ error: 'Titre requis' }, { status: 400 });
    data.titre = titre;
  }
  if (body.niveau != null) {
    data.niveau = Math.min(3, Math.max(1, Number(body.niveau)));
  }
  if (body.dateEcheance) {
    const d = new Date(body.dateEcheance);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: 'Échéance invalide' }, { status: 400 });
    }
    data.dateEcheance = d;
  }
  if (body.responsableId) {
    const u = await prisma.user.findUnique({ where: { id: String(body.responsableId) } });
    if (!u?.actif) {
      return NextResponse.json({ error: 'Responsable introuvable' }, { status: 400 });
    }
    data.responsableId = u.id;
  }

  const updated = await prisma.tache.update({ where: { id }, data });

  if (data.responsableId && data.responsableId !== tache.responsableId) {
    await notifyUsers({
      userIds: [data.responsableId],
      title: 'Nouvelle tâche à faire',
      body: `${updated.titre} — échéance ${updated.dateEcheance.toLocaleDateString('fr-FR')}`,
      url: '/aujourdhui',
    });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id } = await params;
  const tache = await prisma.tache.findUnique({ where: { id } });
  if (!tache) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

  await prisma.tache.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
