import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { parsePlanningDate } from '@/lib/planning/dates';
import { programmerAffaire, syncContratDepuisSlots } from '@/lib/affaire-lifecycle';

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

  const existing = await prisma.planningSlot.findUnique({ where: { id: slotId } });
  if (!existing) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

  // CE lié à une affaire : reprogrammer (sync datePosee + créneau)
  if (existing.affaireId && existing.type === 'ce') {
    await programmerAffaire(existing.affaireId, {
      dateDebut: day,
      equipeId: String(equipeId),
      joursCharge: 1,
    });
    return NextResponse.json({ ok: true, reprogrammed: true });
  }

  const updated = await prisma.planningSlot.update({
    where: { id: slotId },
    data: {
      equipeId: String(equipeId),
      date: day,
    },
  });

  if (updated.affaireId) {
    const aff = await prisma.affaire.findUnique({ where: { id: updated.affaireId } });
    if (aff?.type === 'contrat_entretien') {
      await programmerAffaire(updated.affaireId, {
        dateDebut: day,
        equipeId: String(equipeId),
        joursCharge: 1,
      });
    } else {
      await syncContratDepuisSlots(updated.affaireId);
    }
  }

  return NextResponse.json(updated);
}
