/** Helpers date-fns — locale fr, semaine = lundi (planning SETRIM) */

import {
  addDays,
  addMonths,
  addYears,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  getHours,
  getMinutes,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns';
import { fr } from 'date-fns/locale';

export const WEEK_STARTS_ON = 1 as const;

/** Exercice CE SETRIM : 1er juillet → 30 juin */
export function startOfExercice(date: Date): Date {
  const y = date.getFullYear();
  const m = date.getMonth(); // 0-11
  // Si avant juillet → exercice commencé l'année précédente
  const startYear = m < 6 ? y - 1 : y;
  return new Date(startYear, 6, 1); // 1er juillet
}

export function yearMonthsCivil(date: Date): Date[] {
  const y = startOfYear(date);
  return Array.from({ length: 12 }, (_, i) => addMonths(y, i));
}

/** 12 mois à partir de juillet (exercice) */
export function yearMonthsExercice(date: Date): Date[] {
  const start = startOfExercice(date);
  return Array.from({ length: 12 }, (_, i) => addMonths(start, i));
}

export function toIsoDay(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export function formatDayLabel(d: Date): string {
  return format(d, 'EEEE d MMMM', { locale: fr });
}

export function formatMonthTitle(d: Date): string {
  return format(d, 'MMMM yyyy', { locale: fr });
}

export function formatYearTitle(d: Date): string {
  return format(d, 'yyyy', { locale: fr });
}

export function formatExerciceTitle(d: Date): string {
  const start = startOfExercice(d);
  const endYear = start.getFullYear() + 1;
  return `${start.getFullYear()}-${endYear}`;
}

export function formatShortWeekday(d: Date): string {
  return format(d, 'EEEEEE', { locale: fr });
}

export function formatDayNumber(d: Date): string {
  return format(d, 'd');
}

export function formatMonthName(d: Date): string {
  return format(d, 'MMMM', { locale: fr });
}

export function formatHour(d: Date): string {
  return format(d, 'HH:mm');
}

export function weekDays(date: Date): Date[] {
  const start = startOfWeek(date, { weekStartsOn: WEEK_STARTS_ON });
  return eachDayOfInterval({
    start,
    end: endOfWeek(date, { weekStartsOn: WEEK_STARTS_ON }),
  });
}

/** Grille mois : 6 × 7 = 42 cellules, lundi en tête */
export function monthGrid(date: Date): Date[] {
  const monthStart = startOfMonth(date);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: WEEK_STARTS_ON });
  return eachDayOfInterval({ start: gridStart, end: addDays(gridStart, 41) });
}

export function minutesFromMidnight(d: Date): number {
  return getHours(d) * 60 + getMinutes(d);
}

export {
  addDays,
  addMonths,
  addYears,
  endOfMonth,
  endOfYear,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfYear,
};
