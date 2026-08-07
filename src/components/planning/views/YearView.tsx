'use client';

import { DayPasteille } from '@/components/planning/DayPasteille';
import {
  formatMonthName,
  isSameMonth,
  isToday,
  monthGrid,
  toIsoDay,
  yearMonthsCivil,
  yearMonthsExercice,
} from '@/lib/planning/dates';
import type { PlanningEvent } from '@/lib/planning/toCalendarEvents';

/** Vue Année — 12 mini-mois, civil ou exercice CE (juil.→juin). */
export function YearView({
  date,
  eventsByDay,
  mode,
  onModeChange,
  onOpenMonth,
  onOpenDay,
}: {
  date: Date;
  eventsByDay: Map<string, PlanningEvent[]>;
  mode: 'civil' | 'exercice';
  onModeChange: (m: 'civil' | 'exercice') => void;
  onOpenMonth: (d: Date, e?: React.MouseEvent) => void;
  onOpenDay: (d: Date, e?: React.MouseEvent) => void;
}) {
  const months = mode === 'exercice' ? yearMonthsExercice(date) : yearMonthsCivil(date);
  const now = new Date();

  return (
    <div className="agenda-year">
      <div className="agenda-seg" style={{ marginBottom: 12 }}>
        <button
          type="button"
          className={mode === 'civil' ? 'on' : ''}
          onClick={() => onModeChange('civil')}
        >
          Année civile
        </button>
        <button
          type="button"
          className={mode === 'exercice' ? 'on' : ''}
          onClick={() => onModeChange('exercice')}
        >
          Exercice (juil.→juin)
        </button>
      </div>
      <div className="agenda-year-grid">
        {months.map((m) => {
          const cells = monthGrid(m);
          const current = isSameMonth(m, now);
          return (
            <div key={m.toISOString()} className="agenda-mini">
              <button
                type="button"
                className={`agenda-mini-title${current ? ' current' : ''}`}
                onClick={(e) => onOpenMonth(m, e)}
              >
                {formatMonthName(m)}
              </button>
              <div className="agenda-mini-grid" role="grid" aria-label={formatMonthName(m)}>
                {cells.map((d) => {
                  const key = toIsoDay(d);
                  const list = eventsByDay.get(key) ?? [];
                  const n = list.length;
                  const inMonth = isSameMonth(d, m);
                  const today = isToday(d);
                  const alert = list.some((e) => e.isAlert);
                  return (
                    <button
                      key={key}
                      type="button"
                      role="gridcell"
                      disabled={!inMonth}
                      className={`agenda-mini-day${inMonth ? '' : ' out'}${today ? ' today' : ''}${n > 0 ? ' has' : ''}${n >= 3 ? ' busy' : ''}${alert ? ' alert' : ''}`}
                      aria-label={`${d.toLocaleDateString('fr-FR')}, ${n} intervention${n > 1 ? 's' : ''}`}
                      onClick={(e) => onOpenDay(d, e)}
                    >
                      <DayPasteille date={d} className="agenda-mini-num">
                        {d.getDate()}
                      </DayPasteille>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
