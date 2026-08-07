'use client';

import { EventBlock } from '@/components/planning/EventBlock';
import {
  dayGridHeight,
  hourHeight,
  layoutTimedSpans,
  type LaidOutSpan,
} from '@/lib/planning/layout';
import type { PlanningEvent } from '@/lib/planning/toCalendarEvents';
import { toIsoDay } from '@/lib/planning/dates';

function asWorkdaySpans(
  events: PlanningEvent[],
  fromHour: number,
  toHour: number,
): { event: PlanningEvent; span: { id: string; start: Date; end: Date } }[] {
  return events.map((e) => {
    if (!e.allDay) {
      return { event: e, span: { id: e.id, start: e.start, end: e.end } };
    }
    const day = new Date(e.start);
    day.setHours(0, 0, 0, 0);
    const startH = Math.min(Math.max(fromHour, 8), Math.max(toHour - 1, fromHour));
    const endH = Math.max(startH + 1, Math.min(toHour, 17));
    const start = new Date(day);
    start.setHours(startH, 0, 0, 0);
    const end = new Date(day);
    end.setHours(endH, 0, 0, 0);
    return { event: e, span: { id: e.id, start, end } };
  });
}

export function DayTeamColumn({
  equipeId,
  equipeNom,
  date,
  events,
  fromHour,
  toHour,
  isDesktop,
  onSelect,
  onCreate,
  onDrop,
  dragId,
  setDragId,
}: {
  equipeId: string;
  equipeNom: string;
  date: Date;
  events: PlanningEvent[];
  fromHour: number;
  toHour: number;
  isDesktop: boolean;
  onSelect: (e: PlanningEvent) => void;
  onCreate: () => void;
  onDrop: (equipeId: string, dateIso: string) => void;
  dragId: string | null;
  setDragId: (id: string | null) => void;
}) {
  const work = events.filter((e) =>
    ['chantier', 'contrat_entretien', 'presta'].includes(e.sourceType),
  );
  const pairs = asWorkdaySpans(work, fromHour, toHour);
  const laid = layoutTimedSpans(
    pairs.map((p) => p.span),
    isDesktop,
    fromHour,
  );
  const byId = new Map(pairs.map((p) => [p.event.id, p.event]));
  const h = hourHeight(isDesktop);
  const hours = Array.from({ length: toHour - fromHour }, (_, i) => fromHour + i);
  const iso = toIsoDay(date);

  return (
    <div
      className="agenda-col"
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => {
        if (dragId) onDrop(equipeId, iso);
        setDragId(null);
      }}
    >
      {isDesktop ? <div className="agenda-col-head">{equipeNom}</div> : null}
      <div className="agenda-col-grid" style={{ height: dayGridHeight(isDesktop, fromHour, toHour) }}>
        {hours.map((hr) => (
          <div key={hr} className="agenda-hourline" style={{ height: h }}>
            {!isDesktop && hr === fromHour ? (
              <span className="agenda-col-mobile-label">{equipeNom}</span>
            ) : null}
          </div>
        ))}
        {laid.map((lay: LaidOutSpan) => {
          const event = byId.get(lay.id);
          if (!event) return null;
          return (
            <EventBlock
              key={lay.id}
              event={event}
              top={lay.top}
              height={lay.height}
              column={lay.column}
              columnCount={lay.columnCount}
              showTeam={!isDesktop}
              onClick={() => onSelect(event)}
              onDragStart={() => setDragId(event.id)}
            />
          );
        })}
        <button
          type="button"
          className="agenda-col-add"
          title="Ajouter un créneau"
          onClick={onCreate}
        >
          +
        </button>
      </div>
    </div>
  );
}
