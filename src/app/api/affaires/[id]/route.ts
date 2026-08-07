import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { daysLate } from '@/lib/format';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id } = await params;
  const a = await prisma.affaire.findUnique({
    where: { id },
    include: {
      taches: {
        include: { responsable: { select: { nom: true } } },
        orderBy: { dateEcheance: 'asc' },
      },
      messages: {
        include: { auteur: { select: { nom: true } } },
        orderBy: { createdAt: 'asc' },
      },
      pieces: { orderBy: { createdAt: 'desc' } },
      factures: true,
    },
  });
  if (!a) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

  // Prefer thread messages by numeroDevis
  const threadMsgs = await prisma.message.findMany({
    where: { threadKey: a.numeroDevis },
    include: { auteur: { select: { nom: true } } },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({
    id: a.id,
    numeroDevis: a.numeroDevis,
    client: a.client,
    adresse: a.adresse,
    montantHt: Number(a.montantHt),
    acompteHt: Number(a.acompteHt),
    joursCharge: a.joursCharge,
    statut: a.statut,
    dateDevis: a.dateDevis?.toISOString() ?? null,
    note: a.note,
    taches: a.taches.map((t) => ({
      id: t.id,
      titre: t.titre,
      niveau: t.niveau,
      fait: t.fait,
      dateEcheance: t.dateEcheance.toISOString(),
      responsable: t.responsable,
      retard: t.fait ? 0 : daysLate(t.dateEcheance),
    })),
    messages: (threadMsgs.length ? threadMsgs : a.messages).map((m) => ({
      id: m.id,
      texte: m.texte,
      photoLabel: m.photoLabel,
      systeme: m.systeme,
      createdAt: m.createdAt.toISOString(),
      auteur: m.auteur,
    })),
    pieces: a.pieces.map((p) => ({
      id: p.id,
      titre: p.titre,
      createdAt: p.createdAt.toISOString(),
    })),
    factures: a.factures.map((f) => ({
      id: f.id,
      type: f.type,
      montant: Number(f.montant),
      dateEmission: f.dateEmission?.toISOString() ?? null,
      dateEncaissement: f.dateEncaissement?.toISOString() ?? null,
    })),
  });
}
