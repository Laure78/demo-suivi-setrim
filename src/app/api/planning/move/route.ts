import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { parsePlanningDate } from '@/lib/planning/dates';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { slotId, equipeId, date } = await req.json();
  if (!slotId || !equipeId || !date) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
  }

  // Don't move synthetic tache-* ids
  if (String(slotId).startsWith('tache-')) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const day = parsePlanningDate(String(date));

  const updated = await prisma.planningSlot.update({
    where: { id: slotId },
    data: {
      equipeId,
      date: day,
    },
  });

  // Si une affaire était en commande et reçoit une date → PROGRAMMÉ
  if (updated.affaireId) {
    const aff = await prisma.affaire.findUnique({ where: { id: updated.affaireId } });
    if (aff?.statut === 'commande') {
      await prisma.affaire.update({
        where: { id: aff.id },
        data: { statut: 'programme', dateDebut: day },
      });
    }
  }

  return NextResponse.json(updated);
}
