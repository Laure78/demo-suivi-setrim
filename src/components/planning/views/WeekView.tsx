'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DayPasteille } from '@/components/planning/DayPasteille';
import { EventDetailPanel } from '@/components/planning/EventDetailPanel';
import {
  formatShortWeekday,
  isToday,
  toIsoDay,
  weekDays,
} from '@/lib/planning/dates';
import type { EquipeRowInput, PlanningEvent } from '@/lib/planning/toCalendarEvents';

/** Vue Hebdo — 7 colonnes (lun→dim), interventions empilées. */
export function WeekView({
  date,
  events,
  equipes,
  onOpenDay,
}: {
  date: Date;
  events: PlanningEvent[];
  equipes: EquipeRowInput[];
  onOpenDay: (d: Date, e?: React.MouseEvent | React.KeyboardEvent) => void;
}) {
  const router = useRouter();
  const days = weekDays(date);
  const [dragId, setDragId] = useState<string | null>(null);
  const [panel, setPanel] = useState<
    | { kind: 'create'; equipeId: string; date: string }
    | { kind: 'edit'; event: PlanningEvent }
    | null
  >(null);

  const byDay = useMemo(() => {
    const map = new Map<string, PlanningEvent[]>();
    for (const d of days) map.set(toIsoDay(d), []);
    for (const e of events) {
      const key = toIsoDay(e.start);
      const list = map.get(key);
      if (list) list.push(e);
    }
    return map;
  }, [days, events]);

  async function onDrop(dateIso: string) {
    if (!dragId || dragId.startsWith('tache-')) return;
    const ev = events.find((x) => x.id === dragId);
    const equipeId = ev?.resourceId ?? equipes[0]?.id;
    if (!equipeId) return;
    await fetch('/api/planning/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slotId: dragId, equipeId, date: dateIso }),
    });
    setDragId(null);
    router.refresh();
  }

  return (
    <div className="agenda-week">
      <div className="agenda-week-grid" role="grid" aria-label="Semaine">
        {days.map((d) => {
          const key = toIsoDay(d);
          const list = byDay.get(key) ?? [];
          const today = isToday(d);
          const weekend = d.getDay() === 0 || d.getDay() === 6;
          return (
            <div
              key={key}
              role="gridcell"
              className={`agenda-week-col${today ? ' today' : ''}${weekend ? ' weekend' : ''}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => void onDrop(key)}
            >
              <button
                type="button"
                className="agenda-week-head"
                onClick={(e) => onOpenDay(d, e)}
                aria-label={d.toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              >
                <span className="wd">{formatShortWeekday(d)}</span>
                <DayPasteille date={d} className={`dn${today ? ' on' : ''}`}>
                  {d.getDate()}
                </DayPasteille>
              </button>
              <ul className="agenda-week-list">
                {list.map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      className="agenda-week-evt"
                      style={{ borderLeftColor: e.color, background: `${e.color}22` }}
                      draggable={!e.id.startsWith('tache-') && e.sourceType !== 'ferie'}
                      onDragStart={() => setDragId(e.id)}
                      onDragEnd={() => setDragId(null)}
                      onClick={() => setPanel({ kind: 'edit', event: e })}
                      title={e.title}
                    >
                      <span className="t">{e.title}</span>
                      {e.resourceName ? <span className="eq">{e.resourceName}</span> : null}
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="agenda-week-add"
                title="Ajouter un créneau"
                onClick={() =>
                  setPanel({
                    kind: 'create',
                    equipeId: equipes[0]?.id ?? '',
                    date: key,
                  })
                }
              >
                +
              </button>
            </div>
          );
        })}
      </div>

      {panel ? (
        <EventDetailPanel mode={panel} equipes={equipes} onClose={() => setPanel(null)} />
      ) : null}
    </div>
  );
}
