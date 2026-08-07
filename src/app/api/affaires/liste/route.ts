import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

/** Liste légère pour lier un créneau planning à une affaire. */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const affaires = await prisma.affaire.findMany({
    where: { statut: { in: ['commande', 'programme', 'encours'] } },
    orderBy: { dateDevis: 'desc' },
    take: 200,
    select: {
      id: true,
      numeroDevis: true,
      client: true,
      adresse: true,
      statut: true,
    },
  });

  return NextResponse.json({ affaires });
}
