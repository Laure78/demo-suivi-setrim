import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const DEFAULTS = {
  pushEnabled: true,
  emailEnabled: false,
  alertMessages: true,
  alertActions: true,
  alertContrats: true,
  alertRelances: true,
  urgenceMin: 1,
  silenceDebut: '22:00',
  silenceFin: '07:00',
};

function parseHhMm(v: unknown, fallback: string) {
  const s = String(v ?? '').trim();
  return /^\d{2}:\d{2}$/.test(s) ? s : fallback;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const prefs = await prisma.userNotifPrefs.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...DEFAULTS },
    update: {},
  });

  return NextResponse.json(prefs);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const body = await req.json();
  const urgenceMin = Math.min(3, Math.max(1, Number(body.urgenceMin) || 1));

  const prefs = await prisma.userNotifPrefs.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      pushEnabled: Boolean(body.pushEnabled ?? DEFAULTS.pushEnabled),
      emailEnabled: Boolean(body.emailEnabled ?? DEFAULTS.emailEnabled),
      alertMessages: Boolean(body.alertMessages ?? DEFAULTS.alertMessages),
      alertActions: Boolean(body.alertActions ?? DEFAULTS.alertActions),
      alertContrats: Boolean(body.alertContrats ?? DEFAULTS.alertContrats),
      alertRelances: Boolean(body.alertRelances ?? DEFAULTS.alertRelances),
      urgenceMin,
      silenceDebut: parseHhMm(body.silenceDebut, DEFAULTS.silenceDebut),
      silenceFin: parseHhMm(body.silenceFin, DEFAULTS.silenceFin),
    },
    update: {
      pushEnabled: Boolean(body.pushEnabled),
      emailEnabled: Boolean(body.emailEnabled),
      alertMessages: Boolean(body.alertMessages),
      alertActions: Boolean(body.alertActions),
      alertContrats: Boolean(body.alertContrats),
      alertRelances: Boolean(body.alertRelances),
      urgenceMin,
      silenceDebut: parseHhMm(body.silenceDebut, DEFAULTS.silenceDebut),
      silenceFin: parseHhMm(body.silenceFin, DEFAULTS.silenceFin),
    },
  });

  return NextResponse.json(prefs);
}
