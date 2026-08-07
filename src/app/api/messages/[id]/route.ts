import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

/** Supprimer un message — auteur ou bureau (assistante / responsable / dirigeant). */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id } = await params;
  const msg = await prisma.message.findUnique({ where: { id } });
  if (!msg) return NextResponse.json({ error: 'Message introuvable' }, { status: 404 });
  if (msg.systeme) {
    return NextResponse.json({ error: 'Message système non suppressible' }, { status: 400 });
  }

  const isAuthor = msg.auteurId === session.user.id;
  const isBureau = ['assistante', 'responsable', 'dirigeant'].includes(session.user.role);
  if (!isAuthor && !isBureau) {
    return NextResponse.json({ error: 'Vous ne pouvez supprimer que vos messages.' }, { status: 403 });
  }

  await prisma.message.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
