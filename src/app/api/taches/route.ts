import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { addDays } from 'date-fns';

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

  let affaireId: string | null = body.affaireId ?? null;
  if (!affaireId && body.threadKey) {
    const aff = await prisma.affaire.findUnique({
      where: { numeroDevis: String(body.threadKey) },
    });
    affaireId = aff?.id ?? null;
  }

  const tache = await prisma.tache.create({
    data: {
      titre,
      niveau: Math.min(3, Math.max(1, niveau)),
      dateEcheance,
      responsableId: body.responsableId ?? session.user.id,
      affaireId,
      libelleAffaire: body.libelleAffaire ?? null,
    },
  });

  if (body.fromMessage && body.threadKey) {
    await prisma.message.create({
      data: {
        threadKey: String(body.threadKey),
        affaireId,
        auteurId: session.user.id,
        systeme: true,
        texte: `${session.user.name} a créé une tâche depuis ce message — à faire, échéance ${dateEcheance.toLocaleDateString('fr-FR')}`,
      },
    });
  }

  return NextResponse.json(tache);
}
