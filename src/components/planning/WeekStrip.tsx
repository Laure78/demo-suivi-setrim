'use client';

import { DayPasteille } from '@/components/planning/DayPasteille';
import { formatDayLabel, isToday, toIsoDay, weekDays } from '@/lib/planning/dates';

export function WeekStrip({
  date,
  onSelectDate,
}: {
  date: Date;
  onSelectDate: (d: Date) => void;
}) {
  const week = weekDays(date);
  const iso = toIsoDay(date);

  return (
    <div className="agenda-weekstrip" role="tablist" aria-label="Semaine">
      {week.map((d) => {
        const on = toIsoDay(d) === iso;
        const today = isToday(d);
        return (
          <button
            key={d.toISOString()}
            type="button"
            className={`agenda-weekday${on ? ' on' : ''}${today ? ' today' : ''}`}
            onClick={() => onSelectDate(d)}
            aria-label={formatDayLabel(d)}
            aria-selected={on}
          >
            <span className="wd">{d.toLocaleDateString('fr-FR', { weekday: 'narrow' })}</span>
            <DayPasteille date={d} className="dn">
              {d.getDate()}
            </DayPasteille>
          </button>
        );
      })}
    </div>
  );
}
