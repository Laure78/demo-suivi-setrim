/**
 * Helpers Planning chantiers (équipes × jours).
 */

import type { AffectationType, AffaireStatut, PersistedState } from './types';
import { parseISODate } from '@/lib/dates';

export const TYPE_LABELS: Record<AffectationType, string> = {
  CHANTIER: 'Chantier',
  ABSENT: 'Absent',
  CONGES: 'Congés',
  FERIE: 'Férié',
  INTEMPERIE: 'Intempérie',
  RDV: 'RDV',
  FORMATION: 'Formation',
};

export const TYPE_STYLES: Record<AffectationType, { bg: string; fg: string }> = {
  CHANTIER: { bg: '#dbeafe', fg: '#1e3a8a' },
  ABSENT: { bg: '#f1f5f9', fg: '#475569' },
  CONGES: { bg: '#fce7f3', fg: '#9d174d' },
  FERIE: { bg: '#e2e8f0', fg: '#64748b' },
  INTEMPERIE: { bg: '#e0f2fe', fg: '#0369a1' },
  RDV: { bg: '#fef3c7', fg: '#92400e' },
  FORMATION: { bg: '#ede9fe', fg: '#5b21b6' },
};

export const STATUT_AFFAIRE_COLOR: Record<string, string> = {
  PORTEFEUILLE: '#0284c7',
  PLANIFIE: '#4f46e5',
  EN_COURS: '#059669',
  SUSPENDU: '#dc2626',
  TERMINE: '#64748b',
  FACTURE: '#64748b',
  SOLDE: '#64748b',
};

/** Jours fériés France métropolitaine (dates fixes + mobiles 2025–2027) */
export const JOURS_FERIES_FR: string[] = [
  // 2025
  '2025-01-01',
  '2025-04-21',
  '2025-05-01',
  '2025-05-08',
  '2025-05-29',
  '2025-06-09',
  '2025-07-14',
  '2025-08-15',
  '2025-11-01',
  '2025-11-11',
  '2025-12-25',
  // 2026
  '2026-01-01',
  '2026-04-06',
  '2026-05-01',
  '2026-05-08',
  '2026-05-14',
  '2026-05-25',
  '2026-07-14',
  '2026-08-15',
  '2026-11-01',
  '2026-11-11',
  '2026-12-25',
  // 2027
  '2027-01-01',
  '2027-03-29',
  '2027-05-01',
  '2027-05-08',
  '2027-05-06',
  '2027-05-17',
  '2027-07-14',
  '2027-08-15',
  '2027-11-01',
  '2027-11-11',
  '2027-12-25',
];

export function isJourFerie(state: PersistedState, isoDate: string): boolean {
  const set = new Set([...(state.settings.joursFeries ?? []), ...JOURS_FERIES_FR]);
  return set.has(isoDate);
}

export function isWeekend(isoDate: string): boolean {
  const d = parseISODate(isoDate).getDay();
  return d === 0 || d === 6;
}

export function planifiableStatuts(): AffaireStatut[] {
  return ['PORTEFEUILLE', 'PLANIFIE', 'EN_COURS', 'SUSPENDU'];
}
