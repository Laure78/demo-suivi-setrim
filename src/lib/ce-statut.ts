/**
 * Statuts d’affichage des contrats d’entretien (exercice 1er juil. → 30 juin).
 * moisContractuel 0 = juillet … 11 = juin.
 *
 * Source de vérité unique : calcul à partir de datePosee + réalisation (etat « done »)
 * + mois contractuel + date du jour. Ne pas recalculer autrement dans l’UI.
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

/** Pastilles : 5 états distincts (liste, fiche, planning, tableau de bord). */
export type CeStatutCle =
  | 'a_programmer'
  | 'programme'
  | 'realise'
  | 'en_retard'
  | 'hors_mois';

export type CeStatutAffichage = {
  cle: CeStatutCle;
  label: string;
  /** Date d’intervention hors du mois contractuel */
  horsMois: boolean;
  /** Mois contractuel dépassé sans intervention */
  alerteRetard: boolean;
};

export const CE_STATUT_LABEL: Record<CeStatutCle, string> = {
  a_programmer: 'À programmer',
  programme: 'Programmé',
  realise: 'Réalisé',
  en_retard: 'En retard',
  hors_mois: 'Hors mois contractuel',
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
  const m = now.getUTCMonth();
  if (y === y0 && m >= 6) return m - 6;
  if (y === y0 + 1 && m <= 5) return m + 6;
  return null;
}

/**
 * Calcul unique du statut CE.
 * Ordre :
 * 1. Réalisé (etat done ou flag realise)
 * 2. Date posée → Programmé, ou Hors mois contractuel
 * 3. Pas de date + mois contractuel dépassé → En retard
 * 4. Sinon → À programmer
 */
export function statutContratAffichage(input: {
  /** Seul usage : « done » = réalisé. Autres valeurs ignorées pour l’affichage. */
  etat?: string | null;
  datePosee: string | Date | null | undefined;
  moisContractuel: number;
  exercice?: string;
  now?: Date;
  /** Ex. affaire au statut soldé */
  realise?: boolean;
}): CeStatutAffichage {
  const exercice = input.exercice ?? '2026-2027';
  const now = input.now ?? new Date();
  const realise = Boolean(input.realise) || input.etat === 'done';

  if (realise) {
    return {
      cle: 'realise',
      label: CE_STATUT_LABEL.realise,
      horsMois: false,
      alerteRetard: false,
    };
  }

  if (input.datePosee) {
    const horsMois = isHorsMoisContractuel(
      input.datePosee,
      input.moisContractuel,
      exercice,
    );
    if (horsMois) {
      return {
        cle: 'hors_mois',
        label: CE_STATUT_LABEL.hors_mois,
        horsMois: true,
        alerteRetard: false,
      };
    }
    return {
      cle: 'programme',
      label: CE_STATUT_LABEL.programme,
      horsMois: false,
      alerteRetard: false,
    };
  }

  const courant = moisContractuelCourant(now, exercice);
  const enRetard = courant != null && input.moisContractuel <= courant;
  if (enRetard) {
    return {
      cle: 'en_retard',
      label: CE_STATUT_LABEL.en_retard,
      horsMois: false,
      alerteRetard: true,
    };
  }

  return {
    cle: 'a_programmer',
    label: CE_STATUT_LABEL.a_programmer,
    horsMois: false,
    alerteRetard: false,
  };
}

/** @deprecated Prefer statut.label / CeStatutPill — conservé pour imports existants. */
export function labelStatutListe(s: CeStatutAffichage): string {
  return s.label;
}

/**
 * Libellé stocké sur le créneau (minimal) — immeuble / syndic lus via affaireId.
 */
export function labelSlotCe(opts: {
  client?: string;
  adresse?: string;
  nbCompagnons?: number;
  duree?: 'demi' | 'jour';
}) {
  const immeuble =
    opts.adresse?.split(',')[0]?.trim() ||
    opts.client?.trim() ||
    'Immeuble';
  const dureeTxt =
    opts.duree === 'jour' ? '1 j' : opts.duree === 'demi' ? '½ j' : '';
  const n = opts.nbCompagnons ?? 0;
  const gars = n > 0 ? ` · ${n} compagnon${n > 1 ? 's' : ''}` : '';
  const dureePart = dureeTxt ? ` · ${dureeTxt}` : '';
  return `Contrat d'entretien · ${immeuble}${dureePart}${gars}`;
}

export function parseDureeCeFromNote(note: string | null | undefined): 'demi' | 'jour' {
  if (!note) return 'demi';
  if (/RDV\s*1\s*j\b/i.test(note) && !/½|1\/2|demi/i.test(note)) return 'jour';
  if (/RDV\s*½|RDV\s*1\/2|RDV\s*demi/i.test(note)) return 'demi';
  return 'demi';
}
