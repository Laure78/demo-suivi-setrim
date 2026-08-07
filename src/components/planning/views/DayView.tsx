'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DayTeamColumn } from '@/components/planning/DayTeamColumn';
import { EventDetailPanel } from '@/components/planning/EventDetailPanel';
import { NowIndicator } from '@/components/planning/NowIndicator';
import { WeekStrip } from '@/components/planning/WeekStrip';
import {
  DEFAULT_DAY_END_HOUR,
  DEFAULT_DAY_START_HOUR,
  dayGridHeight,
  hourHeight,
} from '@/lib/planning/layout';
import { isToday, minutesFromMidnight, toIsoDay } from '@/lib/planning/dates';
import type { EquipeRowInput, PlanningEvent } from '@/lib/planning/toCalendarEvents';

export function DayView({
  date,
  events,
  equipes,
  onSelectDate,
}: {
  date: Date;
  events: PlanningEvent[];
  equipes: EquipeRowInput[];
  onSelectDate: (d: Date) => void;
}) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);
  const [panel, setPanel] = useState<
    | { kind: 'create'; equipeId: string; date: string }
    | { kind: 'edit'; event: PlanningEvent }
    | null
  >(null);

  const fromHour = expanded ? 0 : DEFAULT_DAY_START_HOUR;
  const toHour = expanded ? 24 : DEFAULT_DAY_END_HOUR;
  const iso = toIsoDay(date);

  const dayEvents = useMemo(
    () => events.filter((e) => toIsoDay(e.start) === iso),
    [events, iso],
  );

  const allDay = dayEvents.filter((e) =>
    ['ferie', 'tache', 'absent'].includes(e.sourceType),
  );
  const timedLike = dayEvents.filter((e) =>
    ['chantier', 'contrat_entretien', 'presta'].includes(e.sourceType),
  );
  const before = timedLike.filter((e) => !e.allDay && minutesFromMidnight(e.start) < 8 * 60);
  const after = timedLike.filter((e) => !e.allDay && minutesFromMidnight(e.start) >= 17 * 60);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const apply = () => setIsDesktop(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const hh = hourHeight(isDesktop);
    const targetHour = isToday(date) ? new Date().getHours() : DEFAULT_DAY_START_HOUR;
    const clamped = Math.max(fromHour, Math.min(toHour - 1, targetHour));
    el.scrollTop = Math.max(0, (clamped - fromHour) * hh - 40);
  }, [date, fromHour, toHour, isDesktop]);

  async function onDrop(equipeId: string, dateIso: string) {
    if (!dragId || dragId.startsWith('tache-')) return;
    await fetch('/api/planning/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slotId: dragId, equipeId, date: dateIso }),
    });
    setDragId(null);
    router.refresh();
  }

  const hours = Array.from({ length: toHour - fromHour }, (_, i) => fromHour + i);
  const hh = hourHeight(isDesktop);
  const gridH = dayGridHeight(isDesktop, fromHour, toHour);

  return (
    <div className="agenda-day">
      <WeekStrip date={date} onSelectDate={onSelectDate} />

      {!expanded && (before.length > 0 || after.length > 0) ? (
        <div className="agenda-range-hints">
          {before.length > 0 ? (
            <button type="button" onClick={() => setExpanded(true)}>
              {before.length} avant 8h
            </button>
          ) : null}
          {after.length > 0 ? (
            <button type="button" onClick={() => setExpanded(true)}>
              {after.length} après 17h
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="agenda-allday">
        <span className="eyebrow">Journée</span>
        <div className="agenda-allday-chips">
          {allDay.length === 0 ? (
            <span className="hint">Aucun jalon</span>
          ) : (
            allDay.map((e) => (
              <button
                key={e.id}
                type="button"
                className="agenda-chip"
                style={{ borderLeftColor: e.color }}
                onClick={() => setPanel({ kind: 'edit', event: e })}
              >
                {e.title}
              </button>
            ))
          )}
        </div>
        <button type="button" className="btn-note" onClick={() => setExpanded((x) => !x)}>
          {expanded ? 'Plage 8h–17h' : 'Afficher toute la journée'}
        </button>
      </div>

      <div className="agenda-day-scroll" ref={scrollRef}>
        <div className="agenda-day-grid">
          <div className="agenda-gutter" style={{ height: gridH }}>
            {hours.map((hr) => (
              <div key={hr} className="agenda-gutter-h" style={{ height: hh }}>
                <span>{String(hr).padStart(2, '0')}h</span>
              </div>
            ))}
          </div>

          <div className={`agenda-cols${isDesktop ? ' desk' : ' mob'}`}>
            {isDesktop ? (
              equipes.map((eq) => (
                <DayTeamColumn
                  key={eq.id}
                  equipeId={eq.id}
                  equipeNom={eq.nom}
                  date={date}
                  events={dayEvents.filter((e) => e.resourceId === eq.id)}
                  fromHour={fromHour}
                  toHour={toHour}
                  isDesktop
                  onSelect={(e) => setPanel({ kind: 'edit', event: e })}
                  onCreate={() => setPanel({ kind: 'create', equipeId: eq.id, date: iso })}
                  onDrop={onDrop}
                  dragId={dragId}
                  setDragId={setDragId}
                />
              ))
            ) : (
              <DayTeamColumn
                equipeId={equipes[0]?.id ?? ''}
                equipeNom="Toutes les équipes"
                date={date}
                events={dayEvents.filter((e) =>
                  ['chantier', 'contrat_entretien', 'presta'].includes(e.sourceType),
                )}
                fromHour={fromHour}
                toHour={toHour}
                isDesktop={false}
                onSelect={(e) => setPanel({ kind: 'edit', event: e })}
                onCreate={() =>
                  setPanel({ kind: 'create', equipeId: equipes[0]?.id ?? '', date: iso })
                }
                onDrop={onDrop}
                dragId={dragId}
                setDragId={setDragId}
              />
            )}
          </div>
          <div className="agenda-now-overlay" style={{ height: gridH }}>
            <NowIndicator date={date} fromHour={fromHour} toHour={toHour} isDesktop={isDesktop} />
          </div>
        </div>
      </div>

      {panel ? (
        <EventDetailPanel mode={panel} equipes={equipes} onClose={() => setPanel(null)} />
      ) : null}
    </div>
  );
}
