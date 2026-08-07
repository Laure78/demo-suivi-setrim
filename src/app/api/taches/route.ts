import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { addDays } from 'date-fns';
import { notifyUsers } from '@/lib/push-server';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const body = await req.json();
  const titre = String(body.titre ?? '').trim();
  if (!titre) return NextResponse.json({ error: 'Titre requis' }, { status: 400 });

  const niveau = Number(body.niveau ?? 2);
  const dateEcheance = body.dateEcheance
    ? new Date(body.dateEcheance)
    : addDays(new Date(), 1);
  if (Number.isNaN(dateEcheance.getTime())) {
    return NextResponse.json({ error: 'Échéance invalide' }, { status: 400 });
  }

  let affaireId: string | null = body.affaireId ?? null;
  if (!affaireId && body.threadKey) {
    const aff = await prisma.affaire.findUnique({
      where: { numeroDevis: String(body.threadKey) },
    });
    affaireId = aff?.id ?? null;
  }

  let libelleAffaire: string | null = body.libelleAffaire ?? null;
  if (!libelleAffaire && affaireId) {
    const aff = await prisma.affaire.findUnique({ where: { id: affaireId } });
    if (aff) libelleAffaire = `${aff.client} · ${aff.adresse.split(',')[0]}`;
  }

  const responsableId = String(body.responsableId ?? session.user.id);

  const tache = await prisma.tache.create({
    data: {
      titre,
      niveau: Math.min(3, Math.max(1, niveau)),
      dateEcheance,
      responsableId,
      affaireId,
      libelleAffaire,
    },
  });

  if (body.fromMessage && body.threadKey) {
    await prisma.message.create({
      data: {
        threadKey: String(body.threadKey),
        affaireId,
        auteurId: session.user.id,
        systeme: true,
        texte: `${session.user.name} a créé une tâche depuis ce message — ${
          niveau >= 3 ? 'urgent' : 'à faire'
        }, échéance ${dateEcheance.toLocaleDateString('fr-FR')}`,
      },
    });
  }

  // Remonte dans Aujourd'hui chez le responsable
  if (responsableId !== session.user.id || niveau >= 2) {
    await notifyUsers({
      userIds: [responsableId],
      title: niveau >= 3 ? 'Tâche urgente' : 'Tâche à faire',
      body: `${titre} — échéance ${dateEcheance.toLocaleDateString('fr-FR')}`,
      url: '/aujourdhui',
    });
  }

  return NextResponse.json(tache);
}
