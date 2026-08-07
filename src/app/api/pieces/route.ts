import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { PieceType } from '@prisma/client';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const body = await req.json();
  const affaireId = String(body.affaireId ?? '');
  if (!affaireId) return NextResponse.json({ error: 'affaireId requis' }, { status: 400 });

  const affaire = await prisma.affaire.findUnique({ where: { id: affaireId } });
  if (!affaire) return NextResponse.json({ error: 'Affaire introuvable' }, { status: 404 });

  const titre = String(body.titre ?? '').trim();
  if (!titre) return NextResponse.json({ error: 'Titre requis' }, { status: 400 });

  const typeRaw = String(body.type ?? 'autre');
  const type = (Object.values(PieceType) as string[]).includes(typeRaw)
    ? (typeRaw as PieceType)
    : PieceType.autre;

  const piece = await prisma.piece.create({
    data: {
      affaireId,
      titre,
      type,
      fichier: body.fichier ? String(body.fichier) : null,
      auteurId: session.user.id,
    },
  });

  return NextResponse.json(piece);
}
