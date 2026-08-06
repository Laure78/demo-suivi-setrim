/** Helpers dates — la démo reste parlante quel que soit le jour du lancement. */

export function todayISO(): string {
  return toISODate(new Date());
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(isoDate: string, days: number): string {
  const d = parseISODate(isoDate);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function addYears(isoDate: string, years: number): string {
  const d = parseISODate(isoDate);
  d.setFullYear(d.getFullYear() + years);
  return toISODate(d);
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Affichage FR : 12/02/2026 */
export function formatFR(isoDate: string): string {
  const d = parseISODate(isoDate);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Extrait la date (sans heure) d'un ISO datetime pour l'affichage « Fait le … ». */
export function formatDoneDate(isoDatetime: string): string {
  return formatFR(toISODate(new Date(isoDatetime)));
}

/** Heure courte pour bulles de messagerie : 08:10 */
export function formatTime(isoDatetime: string): string {
  return new Date(isoDatetime).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Date + heure courte : 05/08 16:20 */
export function formatShortDateTime(isoDatetime: string): string {
  const d = new Date(isoDatetime);
  const date = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  const time = formatTime(isoDatetime);
  return `${date} ${time}`;
}

export function daysUntil(isoDate: string, from = todayISO()): number {
  const a = parseISODate(from).getTime();
  const b = parseISODate(isoDate).getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

export function isOverdue(isoDate: string, from = todayISO()): boolean {
  return daysUntil(isoDate, from) < 0;
}

/** Échéance dans les N jours à venir (aujourd'hui inclus), pas encore dépassée. */
export function isSoon(isoDate: string, withinDays = 7, from = todayISO()): boolean {
  const d = daysUntil(isoDate, from);
  return d >= 0 && d <= withinDays;
}

export function startOfWeek(isoDate: string): string {
  const d = parseISODate(isoDate);
  const day = d.getDay(); // 0 = dimanche
  const diff = day === 0 ? -6 : 1 - day; // lundi
  d.setDate(d.getDate() + diff);
  return toISODate(d);
}

export function startOfMonth(isoDate: string): string {
  const d = parseISODate(isoDate);
  d.setDate(1);
  return toISODate(d);
}

export function endOfMonth(isoDate: string): string {
  const d = parseISODate(isoDate);
  d.setMonth(d.getMonth() + 1, 0);
  return toISODate(d);
}

export function eachDay(from: string, to: string): string[] {
  const out: string[] = [];
  let cur = from;
  while (cur <= to) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

const WEEKDAY_SHORT = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'];

export function weekdayShort(isoDate: string): string {
  const d = parseISODate(isoDate);
  const i = d.getDay();
  return WEEKDAY_SHORT[i === 0 ? 6 : i - 1];
}

export function monthLabel(isoDate: string): string {
  const d = parseISODate(isoDate);
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

/** Chevauchement [start, end] avec la plage [rangeStart, rangeEnd] (inclus). */
export function rangesOverlap(
  start: string,
  end: string,
  rangeStart: string,
  rangeEnd: string,
): boolean {
  return start <= rangeEnd && end >= rangeStart;
}
