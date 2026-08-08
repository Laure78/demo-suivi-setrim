/** Point d'entrée @/lib/planning — compat + modules agenda */

export {
  ensurePrestataires,
  moisLabel,
  daysInMonth,
  isoDateUTC,
  isWeekendUTC,
  isFerieUTC,
  MOIS_FR,
  syncChantiersAuPlanning,
  resyncAffaireSlots,
} from '@/lib/planning/core';

export * from '@/lib/planning/dates';
export * from '@/lib/planning/layout';
export * from '@/lib/planning/toCalendarEvents';
export { loadPlanningMonth } from '@/lib/planning/loadMonth';
export type { PlanningMonthData } from '@/lib/planning/loadMonth';
