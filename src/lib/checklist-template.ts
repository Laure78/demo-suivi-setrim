import type { ActionItem } from './types';
import { addDays, toISODate } from './dates';

/** Modèle d'actions standard créé à la programmation d'un chantier. */
export const DEFAULT_CHECKLIST_LABELS = [
  "Facture d'acompte envoyée",
  'Commande de benne',
  'Location roulotte',
  'Situation n°1',
  'DOE transmis',
] as const;

/**
 * Génère la check-list standard alignée sur les dates du chantier.
 * - acompte : J-7
 * - benne : jour de démarrage
 * - roulotte : J+1
 * - situation : milieu de chantier
 * - DOE : fin + 3 j
 */
export function buildStandardChecklist(
  startDate: string,
  endDate: string,
  idPrefix = 'act',
): ActionItem[] {
  const mid = midDate(startDate, endDate);
  const offsets = [
    addDays(startDate, -7),
    startDate,
    addDays(startDate, 1),
    mid,
    addDays(endDate, 3),
  ];

  return DEFAULT_CHECKLIST_LABELS.map((label, i) => ({
    id: `${idPrefix}-${i + 1}`,
    label,
    dueDate: offsets[i],
    done: false,
  }));
}

function midDate(start: string, end: string): string {
  const a = new Date(start + 'T12:00:00').getTime();
  const b = new Date(end + 'T12:00:00').getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return start;
  return toISODate(new Date((a + b) / 2));
}
