/**
 * Layout vue Jour — fonctions pures.
 * Chevauchements : colonnes (1re libre), largeur = 100 / n, gouttière 2px.
 */

import { minutesFromMidnight } from '@/lib/planning/dates';

export const HOUR_HEIGHT_MOBILE = 56;
export const HOUR_HEIGHT_DESKTOP = 48;
export const DAY_HOURS = 24;
export const DEFAULT_DAY_START_HOUR = 8;
export const DEFAULT_DAY_END_HOUR = 17;
export const GUTTER_PX = 2;
export const MIN_EVENT_HEIGHT = 18;

export type TimedSpan = {
  id: string;
  start: Date;
  end: Date;
};

export type LaidOutSpan = TimedSpan & {
  column: number;
  columnCount: number;
  top: number;
  height: number;
};

export function hourHeight(isDesktop: boolean): number {
  return isDesktop ? HOUR_HEIGHT_DESKTOP : HOUR_HEIGHT_MOBILE;
}

export function dayGridHeight(isDesktop: boolean, fromHour = 0, toHour = 24): number {
  return Math.max(0, toHour - fromHour) * hourHeight(isDesktop);
}

function overlaps(a: TimedSpan, b: TimedSpan): boolean {
  return a.start < b.end && b.start < a.end;
}

export function overlapClusters(events: TimedSpan[]): TimedSpan[][] {
  const sorted = [...events].sort((a, b) => a.start.getTime() - b.start.getTime());
  const clusters: TimedSpan[][] = [];
  for (const ev of sorted) {
    let placed = false;
    for (const cluster of clusters) {
      if (cluster.some((x) => overlaps(x, ev))) {
        cluster.push(ev);
        placed = true;
        break;
      }
    }
    if (!placed) clusters.push([ev]);
  }
  return mergeClusters(clusters);
}

function mergeClusters(clusters: TimedSpan[][]): TimedSpan[][] {
  const result: TimedSpan[][] = [];
  for (const cluster of clusters) {
    let merged = false;
    for (const existing of result) {
      if (cluster.some((a) => existing.some((b) => overlaps(a, b)))) {
        existing.push(...cluster);
        merged = true;
        break;
      }
    }
    if (!merged) result.push([...cluster]);
  }
  return result;
}

export function assignColumns(
  cluster: TimedSpan[],
): Map<string, { column: number; columnCount: number }> {
  const sorted = [...cluster].sort((a, b) => {
    const ds = a.start.getTime() - b.start.getTime();
    if (ds !== 0) return ds;
    return b.end.getTime() - a.end.getTime();
  });

  const colById = new Map<string, number>();
  const active: { end: number; col: number }[] = [];

  for (const ev of sorted) {
    const t = ev.start.getTime();
    for (let i = active.length - 1; i >= 0; i--) {
      if (active[i].end <= t) active.splice(i, 1);
    }
    const used = new Set(active.map((a) => a.col));
    let col = 0;
    while (used.has(col)) col++;
    colById.set(ev.id, col);
    active.push({ end: ev.end.getTime(), col });
  }

  const columnCount = Math.max(1, ...[...colById.values()].map((c) => c + 1));
  const out = new Map<string, { column: number; columnCount: number }>();
  for (const [id, column] of colById) out.set(id, { column, columnCount });
  return out;
}

/** Positions verticales relatives à `fromHour` (ex. 8). */
export function layoutTimedSpans(
  timed: TimedSpan[],
  isDesktop: boolean,
  fromHour = 0,
): LaidOutSpan[] {
  const h = hourHeight(isDesktop);
  const pxPerMinute = h / 60;
  const originMin = fromHour * 60;
  const result: LaidOutSpan[] = [];

  for (const cluster of overlapClusters(timed)) {
    const cols = assignColumns(cluster);
    for (const event of cluster) {
      const meta = cols.get(event.id) ?? { column: 0, columnCount: 1 };
      const startMin = minutesFromMidnight(event.start);
      const endMin = Math.max(startMin + 15, minutesFromMidnight(event.end));
      const top = (startMin - originMin) * pxPerMinute;
      const height = Math.max(MIN_EVENT_HEIGHT, (endMin - startMin) * pxPerMinute);
      result.push({ ...event, column: meta.column, columnCount: meta.columnCount, top, height });
    }
  }
  return result;
}

export function columnStyle(
  column: number,
  columnCount: number,
): { left: string; width: string } {
  const pct = 100 / columnCount;
  return {
    left: `calc(${column * pct}% + ${GUTTER_PX / 2}px)`,
    width: `calc(${pct}% - ${GUTTER_PX}px)`,
  };
}

/** Compte les événements hors plage 8h–17h (pour bandes « avant / après »). */
export function countOutsideDefaultHours(timed: TimedSpan[]): {
  before: number;
  after: number;
} {
  let before = 0;
  let after = 0;
  for (const e of timed) {
    const s = minutesFromMidnight(e.start);
    if (s < DEFAULT_DAY_START_HOUR * 60) before++;
    if (s >= DEFAULT_DAY_END_HOUR * 60) after++;
  }
  return { before, after };
}
