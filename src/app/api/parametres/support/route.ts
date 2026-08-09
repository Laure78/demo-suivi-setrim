import { SupportUrgence } from '@prisma/client';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { notifyUsers } from '@/lib/push-server';
import { Acces } from '@prisma/client';
import {
  SUPPORT_STATUT_LABEL,
  SUPPORT_URGENCE_LABEL,
} from '@/lib/parametres-labels';
import { getEntrepriseFull } from '@/lib/entreprise-settings';

async function nextNumero() {
  const year = new Date().getFullYear();
  const prefix = `SUP-${year}-`;
  const last = await prisma.supportTicket.findFirst({
    where: { numero: { startsWith: prefix } },
    orderBy: { numero: 'desc' },
    select: { numero: true },
  });
  const n = last ? Number(last.numero.slice(prefix.length)) || 0 : 0;
  return `${prefix}${String(n + 1).padStart(4, '0')}`;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const [tickets, entreprise] = await Promise.all([
    prisma.supportTicket.findMany({
      where: { auteurId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    getEntrepriseFull(),
  ]);

  return NextResponse.json({
    contact: {
      email: entreprise.supportEmail,
      telephone: entreprise.supportTelephone,
      horaires: entreprise.supportHoraires,
    },
    tickets: tickets.map((t) => ({
      id: t.id,
      numero: t.numero,
      objet: t.objet,
      description: t.description,
      urgence: t.urgence,
      urgenceLabel: SUPPORT_URGENCE_LABEL[t.urgence] ?? t.urgence,
      statut: t.statut,
      statutLabel: SUPPORT_STATUT_LABEL[t.statut] ?? t.statut,
      kind: t.kind,
      captureUrl: t.captureUrl,
      createdAt: t.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const body = await req.json();
  const objet = String(body.objet ?? '').trim();
  const description = String(body.description ?? '').trim();
  const captureUrl = body.captureUrl ? String(body.captureUrl) : null;
  const kind = String(body.kind ?? 'probleme').trim() || 'probleme';
  const urgenceRaw = String(body.urgence ?? 'normale');
  const urgence = (Object.values(SupportUrgence) as string[]).includes(urgenceRaw)
    ? (urgenceRaw as SupportUrgence)
    : SupportUrgence.normale;

  if (!objet) {
    return NextResponse.json({ error: 'Indiquez un objet.' }, { status: 400 });
  }
  if (!description) {
    return NextResponse.json({ error: 'Décrivez le problème ou la demande.' }, { status: 400 });
  }

  const numero = await nextNumero();
  const ticket = await prisma.supportTicket.create({
    data: {
      numero,
      auteurId: session.user.id,
      objet: objet.slice(0, 160),
      description: description.slice(0, 4000),
      urgence,
      captureUrl,
      kind,
    },
  });

  const admins = await prisma.user.findMany({
    where: { actif: true, acces: Acces.administrateur },
    select: { id: true },
  });
  if (admins.length) {
    await notifyUsers({
      userIds: admins.map((a) => a.id),
      title: `Support ${numero}`,
      body: objet,
      url: '/parametres?tab=support',
    });
  }

  return NextResponse.json({
    ok: true,
    numero: ticket.numero,
    id: ticket.id,
    message: `Demande enregistrée — n° ${ticket.numero}. Les administrateurs sont prévenus.`,
  });
}
