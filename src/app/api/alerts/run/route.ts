import { auth } from '@/auth';
import { runAlertEngine } from '@/lib/alerts-engine';
import { NextResponse } from 'next/server';

/** Déclenchement manuel ou cron (Railway cron / cron-job.org). */
export async function POST() {
  const session = await auth();
  const cronSecret = process.env.CRON_SECRET;
  const header = (await import('next/headers')).headers;
  const h = await header();
  const key = h.get('x-cron-secret');

  if (!session?.user && (!cronSecret || key !== cronSecret)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const result = await runAlertEngine();
  return NextResponse.json({ ok: true, ...result });
}

export async function GET() {
  return POST();
}
