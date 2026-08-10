/**
 * Reprise : cohérence contrats d'entretien ↔ créneaux planning (type ce).
 *
 * Usage : npx tsx scripts/reprise-ce-planning.ts
 *
 * Corrige :
 * - Contrats avec datePosee (non réalisés) sans créneau planning → recrée le slot
 * - Créneaux ce orphelins (sans affaire / sans contrat) → suppression
 * - Affaires CE avec dateDebut mais contrat sans datePosee → aligne datePosee
 */
import { PrismaClient, AffaireType } from '@prisma/client';
import { resyncAffaireSlots } from '../src/lib/planning/core';

const prisma = new PrismaClient();

async function main() {
  const report = {
    slotsCrees: 0,
    slotsSupprimes: 0,
    datesAlignees: 0,
    dejaOk: 0,
  };

  const contrats = await prisma.contratEntretien.findMany({
    where: {
      datePosee: { not: null },
      etat: { not: 'done' },
    },
    include: {
      affaires: {
        where: { type: AffaireType.contrat_entretien },
        take: 1,
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  for (const c of contrats) {
    const aff = c.affaires[0];
    if (!aff) continue;
    const slots = await prisma.planningSlot.count({
      where: { affaireId: aff.id, type: 'ce' },
    });
    if (slots === 0) {
      if (!aff.dateDebut && c.datePosee) {
        await prisma.affaire.update({
          where: { id: aff.id },
          data: {
            dateDebut: c.datePosee,
            dateFin: c.datePosee,
            joursCharge: 1,
            statut: 'programme',
          },
        });
      }
      const r = await resyncAffaireSlots(aff.id, {
        nbCompagnons: c.nbCompagnons,
      });
      if (r.ok) report.slotsCrees += r.created ?? 1;
    } else {
      report.dejaOk += 1;
    }
  }

  // Affaires CE datées sans datePosee sur le contrat
  const affaires = await prisma.affaire.findMany({
    where: {
      type: AffaireType.contrat_entretien,
      dateDebut: { not: null },
      contratEntretienId: { not: null },
      contratEntretien: { datePosee: null, etat: { not: 'done' } },
    },
    include: { contratEntretien: true },
  });
  for (const a of affaires) {
    if (!a.contratEntretienId || !a.dateDebut) continue;
    await prisma.contratEntretien.update({
      where: { id: a.contratEntretienId },
      data: { datePosee: a.dateDebut, etat: 'pose' },
    });
    const slots = await prisma.planningSlot.count({
      where: { affaireId: a.id, type: 'ce' },
    });
    if (slots === 0) {
      await resyncAffaireSlots(a.id);
      report.slotsCrees += 1;
    }
    report.datesAlignees += 1;
  }

  // Créneaux ce sans affaire ou affaire sans contrat
  const orphans = await prisma.planningSlot.findMany({
    where: { type: 'ce' },
    include: {
      affaire: { select: { id: true, contratEntretienId: true, type: true } },
    },
  });
  for (const s of orphans) {
    if (!s.affaireId || !s.affaire || !s.affaire.contratEntretienId) {
      await prisma.planningSlot.delete({ where: { id: s.id } });
      report.slotsSupprimes += 1;
    }
  }

  console.log('Reprise CE ↔ planning terminée :');
  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
