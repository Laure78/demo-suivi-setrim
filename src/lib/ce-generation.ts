/**
 * À l'ouverture d'un exercice (01/07), chaque ContratEntretien
 * génère une Affaire de type contrat_entretien positionnée sur son mois contractuel.
 */

import { prisma } from '@/lib/prisma';
import { AffaireStatut, AffaireType } from '@prisma/client';
import { addDays } from 'date-fns';

/** moisContractuel 0 = juillet N, … 11 = juin N+1 */
function monthToDate(exercice: string, moisContractuel: number): Date {
  const [startYear] = exercice.split('-').map(Number);
  const calendarMonth = (6 + moisContractuel) % 12; // 0=juil → 6
  const year = moisContractuel <= 5 ? startYear : startYear + 1;
  return new Date(Date.UTC(year, calendarMonth, 1, 12, 0, 0));
}

export async function genererAffairesExercice(exercice: string) {
  const contrats = await prisma.contratEntretien.findMany({ where: { exercice } });
  let created = 0;

  for (const c of contrats) {
    const numeroDevis = `CE-${exercice}-${c.id.slice(-6)}`;
    const exists = await prisma.affaire.findUnique({ where: { numeroDevis } });
    if (exists) continue;

    const dateMois = monthToDate(exercice, c.moisContractuel);
    const affaire = await prisma.affaire.create({
      data: {
        numeroDevis,
        client: c.syndic,
        adresse: c.immeuble,
        montantHt: c.montantHt,
        joursCharge: 1,
        statut: AffaireStatut.commande,
        type: AffaireType.contrat_entretien,
        dateDevis: dateMois,
        note: `Contrat d'entretien — mois contractuel`,
      },
    });

    // Alerte J-30 : caler la date
    await prisma.tache.create({
      data: {
        titre: `Caler la date du contrat d'entretien`,
        affaireId: affaire.id,
        libelleAffaire: `CE · ${c.syndic}`,
        responsableId: 'audrey',
        dateEcheance: addDays(dateMois, -30),
        niveau: 2,
      },
    });

    created++;
  }

  return { created, total: contrats.length };
}
