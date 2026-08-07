import { prisma } from '@/lib/prisma';

/** Garantit les 2 prestataires externes SETRIM (échafaudage, bennes). */
export async function ensurePrestataires() {
  await prisma.equipe.upsert({
    where: { id: 'presta-echafaudage' },
    create: {
      id: 'presta-echafaudage',
      nom: 'Prestataire — Échafaudage',
      chef: 'Externe',
      ordre: 20,
      categorie: 'prestataire',
    },
    update: {
      nom: 'Prestataire — Échafaudage',
      categorie: 'prestataire',
      ordre: 20,
    },
  });
  await prisma.equipe.upsert({
    where: { id: 'presta-bennes' },
    create: {
      id: 'presta-bennes',
      nom: 'Prestataire — Bennes / roulottes',
      chef: 'Externe',
      ordre: 21,
      categorie: 'prestataire',
    },
    update: {
      nom: 'Prestataire — Bennes / roulottes',
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
