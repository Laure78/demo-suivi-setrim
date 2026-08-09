import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id } = await params;
  const c = await prisma.client.findUnique({
    where: { id },
    include: {
      affaires: {
        select: {
          id: true,
          numeroDevis: true,
          adresse: true,
          statut: true,
          type: true,
          montantHt: true,
          dateDebut: true,
          dateFin: true,
        },
        orderBy: { dateDevis: 'desc' },
      },
    },
  });
  if (!c) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

  return NextResponse.json({
    id: c.id,
    nom: c.nom,
    contact: c.contact,
    telephone: c.telephone,
    email: c.email,
    adresse: c.adresse,
    note: c.note,
    affaires: c.affaires.map((a) => ({
      id: a.id,
      numeroDevis: a.numeroDevis,
      adresse: a.adresse,
      statut: a.statut,
      type: a.type,
      montantHt: Number(a.montantHt),
      dateDebut: a.dateDebut?.toISOString() ?? null,
      dateFin: a.dateFin?.toISOString() ?? null,
    })),
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const existing = await prisma.client.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

  const data: Record<string, string> = {};
  if (typeof body.nom === 'string' && body.nom.trim()) data.nom = body.nom.trim();
  if (typeof body.contact === 'string') data.contact = body.contact.trim();
  if (typeof body.telephone === 'string') data.telephone = body.telephone.trim();
  if (typeof body.email === 'string') data.email = body.email.trim();
  if (typeof body.adresse === 'string') data.adresse = body.adresse.trim();
  if (typeof body.note === 'string') data.note = body.note.trim();

  const updated = Object.keys(data).length
    ? await prisma.client.update({ where: { id }, data })
    : existing;

  // Aligner le libellé « client » des affaires liées si le nom change
  if (data.nom) {
    await prisma.affaire.updateMany({
      where: { clientId: id },
      data: { client: data.nom },
    });
  }

  // Rattacher une affaire
  if (typeof body.affaireId === 'string' && body.affaireId) {
    await prisma.affaire.update({
      where: { id: body.affaireId },
      data: { clientId: id, client: updated.nom },
    });
  }

  // Détacher une affaire
  if (typeof body.detachAffaireId === 'string' && body.detachAffaireId) {
    await prisma.affaire.updateMany({
      where: { id: body.detachAffaireId, clientId: id },
      data: { clientId: null },
    });
  }

  if (
    !Object.keys(data).length &&
    !(typeof body.affaireId === 'string' && body.affaireId) &&
    !(typeof body.detachAffaireId === 'string' && body.detachAffaireId)
  ) {
    return NextResponse.json({ error: 'Rien à mettre à jour' }, { status: 400 });
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
  const existing = await prisma.client.findUnique({
    where: { id },
    include: { _count: { select: { affaires: true } } },
  });
  if (!existing) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

  await prisma.affaire.updateMany({
    where: { clientId: id },
    data: { clientId: null },
  });
  await prisma.client.delete({ where: { id } });

  return NextResponse.json({ ok: true, detached: existing._count.affaires });
}
