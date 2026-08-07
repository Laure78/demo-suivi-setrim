import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const list = await prisma.remarque.findMany({
    include: { user: { select: { nom: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return NextResponse.json(list);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { texte, ecran } = await req.json();
  const t = String(texte ?? '').trim();
  if (!t) return NextResponse.json({ error: 'Vide' }, { status: 400 });

  const r = await prisma.remarque.create({
    data: {
      texte: t,
      ecran: String(ecran ?? ''),
      userId: session.user.id,
    },
  });
  return NextResponse.json(r);
}
