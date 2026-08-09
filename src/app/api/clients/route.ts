import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { assurerFichesClients } from '@/lib/clients';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  await assurerFichesClients();

  const clients = await prisma.client.findMany({
    orderBy: { nom: 'asc' },
    include: {
      affaires: {
        select: {
          id: true,
          numeroDevis: true,
          client: true,
          adresse: true,
          statut: true,
          type: true,
          montantHt: true,
        },
        orderBy: { dateDevis: 'desc' },
      },
    },
  });

  return NextResponse.json({
    clients: clients.map((c) => ({
      id: c.id,
      nom: c.nom,
      contact: c.contact,
      telephone: c.telephone,
      email: c.email,
      adresse: c.adresse,
      note: c.note,
      nbChantiers: c.affaires.length,
      affaires: c.affaires.map((a) => ({
        id: a.id,
        numeroDevis: a.numeroDevis,
        adresse: a.adresse,
        statut: a.statut,
        type: a.type,
        montantHt: Number(a.montantHt),
      })),
    })),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const body = await req.json();
  const nom = String(body.nom ?? '').trim();
  if (!nom) return NextResponse.json({ error: 'Nom du client requis' }, { status: 400 });

  const client = await prisma.client.create({
    data: {
      nom,
      contact: String(body.contact ?? '').trim(),
      telephone: String(body.telephone ?? '').trim(),
      email: String(body.email ?? '').trim(),
      adresse: String(body.adresse ?? '').trim(),
      note: String(body.note ?? '').trim(),
    },
  });

  // Option : rattacher une affaire existante
  if (body.affaireId) {
    await prisma.affaire.update({
      where: { id: String(body.affaireId) },
      data: { clientId: client.id, client: client.nom },
    });
  }

  return NextResponse.json(client);
}
