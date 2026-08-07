import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const equipes = await prisma.equipe.findMany({
    orderBy: { ordre: 'asc' },
    select: { id: true, nom: true, categorie: true, chef: true },
  });
  return NextResponse.json({ equipes });
}
