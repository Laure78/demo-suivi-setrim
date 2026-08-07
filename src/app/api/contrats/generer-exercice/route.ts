import { auth } from '@/auth';
import { genererAffairesExercice } from '@/lib/ce-generation';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (session.user.role !== 'responsable' && session.user.role !== 'dirigeant' && session.user.role !== 'assistante') {
    return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const exercice = String(body.exercice ?? '2026-2027');
  const result = await genererAffairesExercice(exercice);
  return NextResponse.json({ ok: true, ...result });
}
