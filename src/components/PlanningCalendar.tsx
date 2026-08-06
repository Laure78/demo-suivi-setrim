'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Chantier } from '@/lib/types';
import { getTeam, TEAMS } from '@/lib/users';
import {
  addDays,
  eachDay,
  endOfMonth,
  formatFR,
  monthLabel,
  rangesOverlap,
  startOfMonth,
  startOfWeek,
  todayISO,
  weekdayShort,
} from '@/lib/dates';
import { getChantierStatus } from '@/lib/chantier-helpers';

type ViewMode = 'week' | 'month';

type LayoutBlock = {
  chantier: Chantier;
  /** Index jour de début dans la grille (0-based) */
  colStart: number;
  /** Nombre de colonnes couvertes */
  span: number;
  row: number;
};

function layoutBlocks(
  chantiers: Chantier[],
  days: string[],
): LayoutBlock[] {
  if (!days.length) return [];
  const rangeStart = days[0];
  const rangeEnd = days[days.length - 1];
  const dayIndex = new Map(days.map((d, i) => [d, i]));

  const visible = chantiers
    .filter((c) => rangesOverlap(c.startDate, c.endDate, rangeStart, rangeEnd))
    .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.title.localeCompare(b.title));

  const rowEnds: string[] = []; // fin exclusive occupée par ligne
  const result: LayoutBlock[] = [];

  for (const c of visible) {
    const clippedStart = c.startDate < rangeStart ? rangeStart : c.startDate;
    const clippedEnd = c.endDate > rangeEnd ? rangeEnd : c.endDate;
    const colStart = dayIndex.get(clippedStart) ?? 0;
    const colEnd = dayIndex.get(clippedEnd) ?? days.length - 1;
    const span = colEnd - colStart + 1;

    let row = 0;
    while (row < rowEnds.length && rowEnds[row] > clippedStart) row++;
    if (row === rowEnds.length) rowEnds.push(addDays(clippedEnd, 1));
    else rowEnds[row] = addDays(clippedEnd, 1);

    result.push({ chantier: c, colStart, span, row });
  }

  return result;
}

export function PlanningCalendar({ chantiers }: { chantiers: Chantier[] }) {
  const [mode, setMode] = useState<ViewMode>('week');
  const [anchor, setAnchor] = useState(todayISO());

  const days = useMemo(() => {
    if (mode === 'week') {
      const start = startOfWeek(anchor);
      return eachDay(start, addDays(start, 6));
    }
    const start = startOfMonth(anchor);
    const end = endOfMonth(anchor);
    // Grille mois : du lundi avant au dimanche après
    const gridStart = startOfWeek(start);
    const lastWeekStart = startOfWeek(end);
    const gridEnd = addDays(lastWeekStart, 6);
    return eachDay(gridStart, gridEnd);
  }, [mode, anchor]);

  const blocks = useMemo(() => layoutBlocks(chantiers, days), [chantiers, days]);
  const maxRow = blocks.reduce((m, b) => Math.max(m, b.row), 0);
  const rowCount = Math.max(1, maxRow + 1);
  const today = todayISO();

  const title =
    mode === 'week'
      ? `Semaine du ${formatFR(days[0] ?? anchor)}`
      : monthLabel(anchor);

  function goPrev() {
    setAnchor((a) => (mode === 'week' ? addDays(a, -7) : addDays(startOfMonth(a), -1)));
  }

  function goNext() {
    setAnchor((a) =>
      mode === 'week' ? addDays(a, 7) : addDays(endOfMonth(a), 1),
    );
  }

  function goToday() {
    setAnchor(todayISO());
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button type="button" className="btn-secondary px-3 py-2" onClick={goPrev} aria-label="Précédent">
            <ChevronLeft size={18} />
          </button>
          <button type="button" className="btn-secondary px-3 py-2" onClick={goToday}>
            Aujourd’hui
          </button>
          <button type="button" className="btn-secondary px-3 py-2" onClick={goNext} aria-label="Suivant">
            <ChevronRight size={18} />
          </button>
        </div>
        <h3 className="text-base font-bold capitalize text-[var(--navy)] sm:text-lg">{title}</h3>
        <div className="flex rounded-xl border border-slate-200 bg-white p-1">
          {(['week', 'month'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                mode === m
                  ? 'bg-[var(--navy)] text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {m === 'week' ? 'Semaine' : 'Mois'}
            </button>
          ))}
        </div>
      </div>

      {/* Légende équipes */}
      <div className="flex flex-wrap gap-3 text-xs">
        {TEAMS.map((t) => (
          <span key={t.id} className="inline-flex items-center gap-1.5 font-medium text-slate-700">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ background: t.color }}
            />
            {t.shortLabel}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5 text-slate-500">
          <span className="inline-block h-3 w-3 rounded-sm border-2 border-dashed border-slate-400" />
          Programmé
        </span>
      </div>

      <div className="card overflow-x-auto p-2 sm:p-3">
        <div
          className="min-w-[640px]"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`,
            gap: '2px',
          }}
        >
          {/* En-têtes jours */}
          {days.map((d) => {
            const inMonth = mode === 'week' || d.slice(0, 7) === anchor.slice(0, 7);
            const isToday = d === today;
            return (
              <div
                key={`h-${d}`}
                className={`rounded-lg px-1 py-2 text-center ${
                  isToday ? 'bg-[var(--navy-soft)]' : ''
                } ${inMonth ? '' : 'opacity-40'}`}
              >
                <p className="text-[10px] font-semibold uppercase text-slate-500">
                  {weekdayShort(d)}
                </p>
                <p
                  className={`text-sm font-bold ${
                    isToday ? 'text-[var(--navy)]' : 'text-slate-800'
                  }`}
                >
                  {d.slice(8)}
                </p>
              </div>
            );
          })}

          {/* Zone des blocs */}
          <div
            className="relative col-span-full mt-1"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${rowCount}, minmax(2.75rem, auto))`,
              gap: '4px 2px',
              minHeight: `${rowCount * 2.9}rem`,
            }}
          >
            {/* Fond colonnes */}
            {days.map((d, i) => (
              <div
                key={`bg-${d}`}
                className={`rounded-md ${
                  d === today ? 'bg-blue-50/80' : i % 2 === 0 ? 'bg-slate-50' : 'bg-white'
                }`}
                style={{ gridColumn: i + 1, gridRow: `1 / span ${rowCount}` }}
              />
            ))}

            {blocks.map((b) => {
              const team = getTeam(b.chantier.teamId);
              const status = getChantierStatus(b.chantier);
              const programmed = status === 'programme';
              return (
                <Link
                  key={b.chantier.id}
                  href={`/chantiers/${b.chantier.id}`}
                  title={`${b.chantier.title} · ${formatFR(b.chantier.startDate)} → ${formatFR(b.chantier.endDate)}`}
                  className="z-10 flex items-center overflow-hidden rounded-lg px-2 py-1.5 text-left text-xs font-bold text-white shadow-sm transition hover:brightness-110 active:scale-[0.99]"
                  style={{
                    gridColumn: `${b.colStart + 1} / span ${b.span}`,
                    gridRow: b.row + 1,
                    background: team.color,
                    opacity: programmed ? 0.85 : 1,
                    outline: programmed ? '2px dashed rgba(255,255,255,0.7)' : undefined,
                    outlineOffset: programmed ? '-2px' : undefined,
                  }}
                >
                  <span className="truncate">
                    {b.chantier.title}
                    <span className="ml-1 font-normal opacity-80">
                      · {programmed ? 'Programmé' : 'En cours'}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
