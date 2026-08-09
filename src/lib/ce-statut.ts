/**
 * Statuts d’affichage des contrats d’entretien (exercice 1er juil. → 30 juin).
 * moisContractuel 0 = juillet … 11 = juin.
 */

export const MOIS_CE_LABELS = [
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
] as const;

export type CeStatutCle = 'a_programmer' | 'programme' | 'realise';

export type CeStatutAffichage = {
  cle: CeStatutCle;
  label: string;
  /** Date d’intervention hors du mois contractuel (obligation) */
  horsMois: boolean;
  /** Non programmé et mois contractuel en cours ou déjà passé */
  alerteRetard: boolean;
};

/** Mois calendaire (0–11) correspondant à l’index exercice. */
export function calendarMonthFromMoisContractuel(moisContractuel: number) {
  return (6 + moisContractuel) % 12;
}

/** Année calendaire du mois contractuel pour un exercice « YYYY-YYYY ». */
export function yearOfMoisContractuel(exercice: string, moisContractuel: number) {
  const [startYear] = exercice.split('-').map(Number);
  const y0 = Number.isFinite(startYear) ? startYear : new Date().getFullYear();
  return moisContractuel <= 5 ? y0 : y0 + 1;
}

export function labelMoisContractuel(moisContractuel: number) {
  return MOIS_CE_LABELS[moisContractuel] ?? '—';
}

/** True si la date posée n’est pas dans le mois contractuel (année d’exercice). */
export function isHorsMoisContractuel(
  date: Date | string | null | undefined,
  moisContractuel: number,
  exercice = '2026-2027',
): boolean {
  if (!date) return false;
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return false;
  const calMonth = calendarMonthFromMoisContractuel(moisContractuel);
  const year = yearOfMoisContractuel(exercice, moisContractuel);
  return d.getUTCFullYear() !== year || d.getUTCMonth() !== calMonth;
}

export function messageHorsMois(moisContractuel: number) {
  const m = labelMoisContractuel(moisContractuel);
  return `Le contrat prévoit un passage en ${m}.`;
}

/** Index mois contractuel « aujourd’hui » dans l’exercice (0–11), ou null hors exercice. */
export function moisContractuelCourant(now = new Date(), exercice = '2026-2027'): number | null {
  const [startYear] = exercice.split('-').map(Number);
  const y0 = Number.isFinite(startYear) ? startYear : now.getUTCFullYear();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth(); // 0–11
  // Exercice : juil. y0 → juin y0+1
  if (y === y0 && m >= 6) return m - 6; // juil=0 … déc=5
  if (y === y0 + 1 && m <= 5) return m + 6; // janv=6 … juin=11
  return null;
}

export function statutContratAffichage(input: {
  etat: string;
  datePosee: string | Date | null;
  moisContractuel: number;
  exercice?: string;
  now?: Date;
}): CeStatutAffichage {
  const exercice = input.exercice ?? '2026-2027';
  const now = input.now ?? new Date();
  const etat = input.etat;
  const hasDate = !!input.datePosee;
  const horsMois = hasDate
    ? isHorsMoisContractuel(input.datePosee, input.moisContractuel, exercice)
    : false;

  if (etat === 'done') {
    return {
      cle: 'realise',
      label: 'Réalisé',
      horsMois,
      alerteRetard: false,
    };
  }

  if (etat === 'pose' || hasDate) {
    return {
      cle: 'programme',
      label: 'Programmé',
      horsMois,
      alerteRetard: false,
    };
  }

  const courant = moisContractuelCourant(now, exercice);
  const alerteRetard =
    courant != null && input.moisContractuel <= courant;

  return {
    cle: 'a_programmer',
    label: 'À programmer',
    horsMois: false,
    alerteRetard: alerteRetard || etat === 'alert',
  };
}

export function labelStatutListe(s: CeStatutAffichage): string {
  if (s.cle === 'realise') return 'Réalisé';
  if (s.cle === 'programme') {
    return s.horsMois ? 'Programmé · Hors mois contractuel' : 'Programmé';
  }
  return s.alerteRetard ? 'À programmer · En retard' : 'À programmer';
}

/** Libellé créneau planning CE. */
export function labelSlotCe(opts: {
  client: string;
  adresse: string;
  nbCompagnons?: number;
  duree?: 'demi' | 'jour';
}) {
  const dureeTxt = opts.duree === 'demi' ? '½ j' : opts.duree === 'jour' ? '1 j' : '½–1 j';
  const n = opts.nbCompagnons ?? 0;
  const gars =
    n > 0 ? ` · ${n} compagnon${n > 1 ? 's' : ''}` : '';
  return `${opts.client} · ${opts.adresse} · Contrat d'entretien · ${dureeTxt}${gars}`;
}

export function parseDureeCeFromNote(note: string | null | undefined): 'demi' | 'jour' {
  if (!note) return 'demi';
  if (/RDV\s*1\s*j\b/i.test(note) && !/½|1\/2|demi/i.test(note)) return 'jour';
  if (/RDV\s*½|RDV\s*1\/2|RDV\s*demi/i.test(note)) return 'demi';
  return 'demi';
}
