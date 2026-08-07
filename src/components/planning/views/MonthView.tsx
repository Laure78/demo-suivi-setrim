'use client';

import { DayPasteille } from '@/components/planning/DayPasteille';
import {
  formatHour,
  isSameMonth,
  isToday,
  monthGrid,
  toIsoDay,
} from '@/lib/planning/dates';
import type { PlanningEvent } from '@/lib/planning/toCalendarEvents';

function timeLabel(e: PlanningEvent): string {
  if (e.allDay) return 'Journée';
  return formatHour(e.start);
}

/** Vue Mois — pastilles mobile, lignes desktop, liste du jour (mobile). */
export function MonthView({
  date,
  eventsByDay,
  selectedDate,
  onSelectDate,
  onOpenDay,
}: {
  date: Date;
  eventsByDay: Map<string, PlanningEvent[]>;
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  onOpenDay: (d: Date, e?: React.MouseEvent | React.KeyboardEvent) => void;
}) {
  const cells = monthGrid(date);
  const weekLabels = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const selectedKey = toIsoDay(selectedDate);
  const selectedList = eventsByDay.get(selectedKey) ?? [];

  return (
    <div className="agenda-month">
      <div className="agenda-month-head" aria-hidden>
        {weekLabels.map((w, i) => (
          <span key={`${w}-${i}`}>{w}</span>
        ))}
      </div>
      <div className="agenda-month-grid" role="grid" aria-label="Mois">
        {cells.map((d) => {
          const key = toIsoDay(d);
          const list = eventsByDay.get(key) ?? [];
          const inMonth = isSameMonth(d, date);
          const selected = key === selectedKey;
          const today = isToday(d);
          const hasAlert = list.some((e) => e.isAlert);
          const overflow = Math.max(0, list.length - 3);
          const label = `${d.toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}, ${list.length} intervention${list.length > 1 ? 's' : ''}`;

          return (
            <div
              key={key}
              role="gridcell"
              tabIndex={0}
              aria-label={label}
              aria-selected={selected}
              className={`agenda-cell${inMonth ? '' : ' out'}${today ? ' today' : ''}${selected ? ' selected' : ''}`}
              onClick={(ev) => {
                if (selected) onOpenDay(d, ev);
                else onSelectDate(d);
              }}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') {
                  ev.preventDefault();
                  if (selected) onOpenDay(d, ev);
                  else onSelectDate(d);
                }
              }}
            >
              <DayPasteille date={d} className="agenda-cell-num">
                {d.getDate()}
              </DayPasteille>
              {hasAlert ? <span className="agenda-alert-dot" aria-hidden /> : null}
              <span className="agenda-dots" aria-hidden>
                {list.slice(0, 3).map((e) => (
                  <i key={e.id} style={{ background: e.color }} />
                ))}
              </span>
              <ul className="agenda-cell-lines" aria-hidden>
                {list.slice(0, 3).map((e) => (
                  <li key={e.id} className="agenda-cell-line" style={{ borderColor: e.color }}>
                    {e.title}
                  </li>
                ))}
                {overflow > 0 ? <li className="agenda-cell-more">+{overflow}</li> : null}
              </ul>
            </div>
          );
        })}
      </div>
      <div className="agenda-day-list">
        <p className="eyebrow">
          {selectedDate.toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </p>
        <ul className="agenda-skel-list">
          {selectedList.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                className="agenda-skel-item"
                onClick={() => onOpenDay(selectedDate)}
              >
                <i style={{ background: e.color }} />
                <span>
                  <b>{e.title}</b>
                  <small>
                    {timeLabel(e)}
                    {e.resourceName ? ` · ${e.resourceName}` : ''}
                  </small>
                </span>
              </button>
            </li>
          ))}
          {selectedList.length === 0 ? <li className="hint">Aucune intervention.</li> : null}
        </ul>
      </div>
    </div>
  );
}
