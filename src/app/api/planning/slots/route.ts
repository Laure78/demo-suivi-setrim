import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { parsePlanningDate } from '@/lib/planning/dates';
import { syncContratDepuisSlots } from '@/lib/affaire-lifecycle';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const body = await req.json();
  const equipeId = String(body.equipeId ?? '');
  const date = body.date ? String(body.date) : '';
  if (!equipeId || !date) {
    return NextResponse.json({ error: 'équipe et date requises' }, { status: 400 });
  }

  const type = String(body.type ?? 'chantier');
  const label = body.label != null ? String(body.label) : null;
  const affaireId = body.affaireId ? String(body.affaireId) : null;

  const slot = await prisma.planningSlot.create({
    data: {
      equipeId,
      date: parsePlanningDate(date),
      type,
      label,
      affaireId,
    },
  });

  if (affaireId) {
    await syncContratDepuisSlots(affaireId);
  }

  return NextResponse.json(slot);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const body = await req.json();
  const id = String(body.id ?? '');
  if (!id || id.startsWith('tache-')) {
    return NextResponse.json({ error: 'Créneau non modifiable' }, { status: 400 });
  }

  const existing = await prisma.planningSlot.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (body.equipeId) data.equipeId = String(body.equipeId);
  if (body.date) data.date = parsePlanningDate(String(body.date));
  if (typeof body.label === 'string') data.label = body.label;
  if (body.type) data.type = String(body.type);
  if (body.affaireId === null) data.affaireId = null;
  else if (body.affaireId) data.affaireId = String(body.affaireId);

  if (!Object.keys(data).length) {
    return NextResponse.json({ error: 'Rien à mettre à jour' }, { status: 400 });
  }

  const updated = await prisma.planningSlot.update({ where: { id }, data });

  const linkedAffaireId = updated.affaireId ?? existing.affaireId;
  if (updated.affaireId) {
    const aff = await prisma.affaire.findUnique({
      where: { id: updated.affaireId },
      include: { contratEntretien: { select: { nbCompagnons: true } } },
    });
    if (aff && (body.date || body.equipeId)) {
      const isCe = aff.type === 'contrat_entretien' || updated.type === 'ce';
      const label = isCe
        ? (
            await import('@/lib/ce-statut')
          ).labelSlotCe({
            client: aff.client,
            adresse: aff.adresse,
            nbCompagnons: aff.contratEntretien?.nbCompagnons,
            duree: (await import('@/lib/ce-statut')).parseDureeCeFromNote(aff.note),
          })
        : `${aff.client} · ${aff.adresse}`;
      await prisma.planningSlot.update({
        where: { id: updated.id },
        data: { label },
      });
    }
    await syncContratDepuisSlots(updated.affaireId);
  } else if (existing.affaireId && !updated.affaireId) {
    await syncContratDepuisSlots(existing.affaireId);
  }

  // Affaire précédente détachée
  if (linkedAffaireId && linkedAffaireId !== updated.affaireId) {
    await syncContratDepuisSlots(linkedAffaireId);
  }

  return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? new URL(req.url).searchParams.get('id') ?? '');
  if (!id || id.startsWith('tache-')) {
    return NextResponse.json({ error: 'Créneau non supprimable' }, { status: 400 });
  }

  const existing = await prisma.planningSlot.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

  await prisma.planningSlot.delete({ where: { id } });
  if (existing.affaireId) {
    await syncContratDepuisSlots(existing.affaireId);
  }

  return NextResponse.json({
    ok: true,
    signal:
      existing.type === 'ce'
        ? 'Créneau CE retiré — le contrat repasse à programmer si plus aucun créneau.'
        : undefined,
  });
}
