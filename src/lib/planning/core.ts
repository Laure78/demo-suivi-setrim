import { prisma } from '@/lib/prisma';

/** Garantit les 2 prestataires externes SETRIM. */
export async function ensurePrestataires() {
  await prisma.equipe.upsert({
    where: { id: 'presta-echafaudage' },
    create: {
      id: 'presta-echafaudage',
      nom: 'Prestataire 1',
      chef: 'Externe',
      ordre: 20,
      categorie: 'prestataire',
    },
    update: {
      nom: 'Prestataire 1',
      categorie: 'prestataire',
      ordre: 20,
    },
  });
  await prisma.equipe.upsert({
    where: { id: 'presta-bennes' },
    create: {
      id: 'presta-bennes',
      nom: 'Prestataire 2',
      chef: 'Externe',
      ordre: 21,
      categorie: 'prestataire',
    },
    update: {
      nom: 'Prestataire 2',
      categorie: 'prestataire',
      ordre: 21,
    },
  });
}

const MOIS_FR = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
] as const;

export function moisLabel(monthIndex: number) {
  return MOIS_FR[monthIndex] ?? '';
}

export function daysInMonth(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

export function isoDateUTC(year: number, monthIndex: number, day: number) {
  return new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);
}

export function isWeekendUTC(year: number, monthIndex: number, day: number) {
  const dow = new Date(Date.UTC(year, monthIndex, day)).getUTCDay();
  return dow === 0 || dow === 6;
}

/** Jours fériés métropole (fixes + Lundi de Pâques approximatif simple pour 2026). */
export function isFerieUTC(year: number, monthIndex: number, day: number) {
  const fixed = [
    '01-01',
    '05-01',
    '05-08',
    '07-14',
    '08-15',
    '11-01',
    '11-11',
    '12-25',
  ];
  const mmdd = `${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  if (fixed.includes(mmdd)) return true;
  // Lundi de Pâques 2026 = 6 avril ; Ascension 14 mai ; Pentecôte 25 mai
  if (year === 2026) {
    if (mmdd === '04-06' || mmdd === '05-14' || mmdd === '05-25') return true;
  }
  return false;
}

export { MOIS_FR };

/**
 * Pose les chantiers (affaires programmées / en cours) sur le planning du mois.
 * Chaque jour ouvré de la période d'intervention porte client + adresse.
 */
export async function syncChantiersAuPlanning(year: number, month: number) {
  const { prisma } = await import('@/lib/prisma');
  const equipes = await prisma.equipe.findMany({
    where: { categorie: 'equipe' },
    orderBy: { ordre: 'asc' },
  });
  if (!equipes.length) return;

  const nDays = daysInMonth(year, month);
  const monthStart = new Date(Date.UTC(year, month, 1));
  const monthEnd = new Date(Date.UTC(year, month, nDays));

  const chantiers = await prisma.affaire.findMany({
    where: {
      statut: { in: ['programme', 'encours'] },
      type: { in: ['travaux', 'contrat_entretien'] },
    },
  });

  let eqIdx = 0;
  for (const a of chantiers) {
    let equipeId = a.equipeId;
    if (!equipeId || !equipes.some((e) => e.id === equipeId)) {
      equipeId = equipes[eqIdx % equipes.length].id;
      eqIdx++;
      await prisma.affaire.update({
        where: { id: a.id },
        data: { equipeId },
      });
    }

    const charge = Math.max(1, a.joursCharge || 1);
    let start = a.dateDebut ? new Date(a.dateDebut) : null;
    let end = a.dateFin ? new Date(a.dateFin) : null;

    if (!start) {
      // En cours → début du mois ; programmé → milieu du mois (ou date devis si dans le mois)
      if (a.statut === 'encours') {
        start = new Date(monthStart);
      } else if (a.dateDevis) {
        const dd = new Date(a.dateDevis);
        start =
          dd >= monthStart && dd <= monthEnd
            ? dd
            : new Date(Date.UTC(year, month, Math.min(15, nDays)));
      } else {
        start = new Date(Date.UTC(year, month, Math.min(10, nDays)));
      }
      await prisma.affaire.update({
        where: { id: a.id },
        data: { dateDebut: start },
      });
    }

    if (!end) {
      end = new Date(start);
      // Avancer de `charge` jours ouvrés
      let added = 0;
      while (added < charge - 1) {
        end.setUTCDate(end.getUTCDate() + 1);
        const dow = end.getUTCDay();
        if (dow !== 0 && dow !== 6) added++;
      }
      await prisma.affaire.update({
        where: { id: a.id },
        data: { dateFin: end },
      });
    }

    // Créer un créneau pour chaque jour du mois qui intersecte [start, end]
    for (let day = 1; day <= nDays; day++) {
      if (isWeekendUTC(year, month, day) || isFerieUTC(year, month, day)) continue;
      const date = new Date(Date.UTC(year, month, day, 12, 0, 0));
      if (date < start || date > end) continue;

      const existing = await prisma.planningSlot.findFirst({
        where: {
          affaireId: a.id,
          date: new Date(Date.UTC(year, month, day)),
          type: { in: ['chantier', 'ce'] },
        },
      });
      if (existing) {
        // Mettre à jour l'adresse si besoin
        if (existing.equipeId !== equipeId || !existing.label?.includes(a.adresse)) {
          await prisma.planningSlot.update({
            where: { id: existing.id },
            data: {
              equipeId,
              label: `${a.client} · ${a.adresse}`,
            },
          });
        }
        continue;
      }

      await prisma.planningSlot.create({
        data: {
          equipeId,
          date: new Date(Date.UTC(year, month, day)),
          affaireId: a.id,
          type: a.type === 'contrat_entretien' ? 'ce' : 'chantier',
          label: `${a.client} · ${a.adresse}`,
        },
      });
    }
  }
}

/**
 * Recrée les créneaux chantier/CE d’une affaire à partir de dateDébut / dateFin / équipe.
 * Les anciens créneaux liés sont remplacés → l’agenda /planning se met à jour.
 */
export async function resyncAffaireSlots(affaireId: string) {
  const a = await prisma.affaire.findUnique({ where: { id: affaireId } });
  if (!a?.dateDebut) return { ok: false as const, reason: 'pas_de_debut' };

  let equipeId = a.equipeId;
  if (!equipeId) {
    const eq = await prisma.equipe.findFirst({
      where: { categorie: 'equipe' },
      orderBy: { ordre: 'asc' },
    });
    equipeId = eq?.id ?? null;
  }
  if (!equipeId) return { ok: false as const, reason: 'pas_dequipe' };

  const start = new Date(a.dateDebut);
  start.setUTCHours(12, 0, 0, 0);
  let end = a.dateFin ? new Date(a.dateFin) : new Date(start);
  end.setUTCHours(12, 0, 0, 0);
  if (end < start) end = new Date(start);

  await prisma.planningSlot.deleteMany({
    where: { affaireId, type: { in: ['chantier', 'ce'] } },
  });

  const type = a.type === 'contrat_entretien' ? 'ce' : 'chantier';
  const label = `${a.client} · ${a.adresse}`;
  const cursor = new Date(start);
  let created = 0;

  while (cursor <= end) {
    const y = cursor.getUTCFullYear();
    const m = cursor.getUTCMonth();
    const d = cursor.getUTCDate();
    const dow = cursor.getUTCDay();
    if (dow !== 0 && dow !== 6 && !isFerieUTC(y, m, d)) {
      await prisma.planningSlot.create({
        data: {
          equipeId,
          date: new Date(Date.UTC(y, m, d)),
          affaireId,
          type,
          label,
        },
      });
      created++;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  if (a.equipeId !== equipeId) {
    await prisma.affaire.update({
      where: { id: affaireId },
      data: { equipeId },
    });
  }

  return { ok: true as const, created };
}

