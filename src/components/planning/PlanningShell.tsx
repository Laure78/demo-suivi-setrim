'use client';

import { useCallback, useMemo, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { AgendaSidebar } from '@/components/planning/AgendaSidebar';
import { AgendaToolbar, type PlanningViewMode } from '@/components/planning/AgendaToolbar';
import { useZoomBackGestures } from '@/components/planning/useZoomBackGestures';
import { DayView } from '@/components/planning/views/DayView';
import { MonthView } from '@/components/planning/views/MonthView';
import { WeekView } from '@/components/planning/views/WeekView';
import { YearView } from '@/components/planning/views/YearView';
import {
  filterEvents,
  indexEventsByDay,
  toCalendarEvents,
  type EquipeRowInput,
  type PlanningSourceType,
} from '@/lib/planning/toCalendarEvents';
import {
  addMonths,
  addWeeks,
  addYears,
  formatExerciceTitle,
  formatMonthTitle,
  formatWeekTitle,
  formatYearTitle,
  startOfDay,
  startOfExercice,
  startOfMonth,
  startOfYear,
} from '@/lib/planning/dates';

export type { PlanningViewMode };

const ALL_TYPES: PlanningSourceType[] = [
  'chantier',
  'contrat_entretien',
  'presta',
  'absent',
  'tache',
  'ferie',
];

const TAB_VIEWS: PlanningViewMode[] = ['day', 'week', 'month', 'year'];

type ZoomDir = 'in' | 'out' | 'none';

function originFromEvent(e: React.MouseEvent | React.KeyboardEvent): string {
  const el = e.currentTarget as HTMLElement;
  const r = el.getBoundingClientRect();
  const cx = ((r.left + r.width / 2) / window.innerWidth) * 100;
  const cy = ((r.top + r.height / 2) / window.innerHeight) * 100;
  return `${cx}% ${cy}%`;
}

export function PlanningShell({
  year,
  month,
  equipes,
  initialView = 'month',
}: {
  year: number;
  month: number;
  equipes: EquipeRowInput[];
  initialView?: PlanningViewMode;
}) {
  const reduce = useReducedMotion();
  const [view, setView] = useState<PlanningViewMode>(initialView);
  const [selectedDate, setSelectedDate] = useState(() =>
    startOfDay(new Date(year, month, Math.min(new Date().getDate(), 28))),
  );
  const [yearMode, setYearMode] = useState<'civil' | 'exercice'>('civil');
  const [resourceIds, setResourceIds] = useState(() => new Set(equipes.map((e) => e.id)));
  const [sourceTypes, setSourceTypes] = useState(() => new Set(ALL_TYPES));
  const [zoomDir, setZoomDir] = useState<ZoomDir>('none');
  const [transformOrigin, setTransformOrigin] = useState('50% 50%');

  const allEvents = useMemo(() => toCalendarEvents(equipes), [equipes]);
  const events = useMemo(
    () => filterEvents(allEvents, { resourceIds, sourceTypes }),
    [allEvents, resourceIds, sourceTypes],
  );
  const eventsByDay = useMemo(() => indexEventsByDay(events), [events]);
  const visibleEquipes = useMemo(
    () => equipes.filter((e) => resourceIds.has(e.id)),
    [equipes, resourceIds],
  );

  const title =
    view === 'day'
      ? selectedDate.toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        })
      : view === 'week'
        ? formatWeekTitle(selectedDate)
        : view === 'month'
          ? formatMonthTitle(selectedDate)
          : yearMode === 'exercice'
            ? `Exercice ${formatExerciceTitle(selectedDate)}`
            : formatYearTitle(selectedDate);

  const backLabel =
    view === 'day'
      ? 'Semaine'
      : view === 'week'
        ? formatMonthTitle(selectedDate)
        : view === 'month'
          ? String(selectedDate.getFullYear())
          : null;

  const transition = reduce
    ? { duration: 0.12 }
    : { type: 'spring' as const, stiffness: 320, damping: 32 };

  const zoomTo = useCallback((next: PlanningViewMode, dir: ZoomDir, origin = '50% 50%') => {
    setTransformOrigin(origin);
    setZoomDir(dir);
    setView(next);
  }, []);

  const zoomBack = useCallback(() => {
    if (view === 'day') zoomTo('week', 'out');
    else if (view === 'week') zoomTo('month', 'out');
    else if (view === 'month') zoomTo('year', 'out');
  }, [view, zoomTo]);

  useZoomBackGestures(view, zoomBack);

  function goPrev() {
    setZoomDir('none');
    setSelectedDate((d) => {
      if (view === 'day') return startOfDay(new Date(d.getTime() - 86400000));
      if (view === 'week') return startOfDay(addWeeks(d, -1));
      if (view === 'month') return startOfMonth(addMonths(d, -1));
      if (yearMode === 'exercice') return startOfExercice(addYears(startOfExercice(d), -1));
      return startOfYear(addYears(d, -1));
    });
  }

  function goNext() {
    setZoomDir('none');
    setSelectedDate((d) => {
      if (view === 'day') return startOfDay(new Date(d.getTime() + 86400000));
      if (view === 'week') return startOfDay(addWeeks(d, 1));
      if (view === 'month') return startOfMonth(addMonths(d, 1));
      if (yearMode === 'exercice') return startOfExercice(addYears(startOfExercice(d), 1));
      return startOfYear(addYears(d, 1));
    });
  }

  const enterScale = zoomDir === 'in' ? 0.9 : zoomDir === 'out' ? 1.1 : 0.98;
  const exitScale = zoomDir === 'in' ? 1.1 : zoomDir === 'out' ? 0.9 : 1.02;

  return (
    <div className="agenda">
      <AgendaToolbar
        view={view}
        title={title}
        backLabel={backLabel}
        onZoomBack={zoomBack}
        onPrev={goPrev}
        onNext={goNext}
        onToday={() => setSelectedDate(startOfDay(new Date()))}
        onSetView={(v) => {
          setZoomDir('none');
          setView(v);
        }}
      />

      <div className="agenda-body">
        <AgendaSidebar
          equipes={equipes}
          resourceIds={resourceIds}
          sourceTypes={sourceTypes}
          allTypes={ALL_TYPES}
          eventCount={events.length}
          onToggleResource={(id) => {
            setResourceIds((prev) => {
              const n = new Set(prev);
              if (n.has(id)) n.delete(id);
              else n.add(id);
              return n;
            });
          }}
          onToggleType={(t) => {
            setSourceTypes((prev) => {
              const n = new Set(prev);
              if (n.has(t)) n.delete(t);
              else n.add(t);
              return n;
            });
          }}
        />

        <div className="agenda-main">
          <LayoutGroup>
            <AnimatePresence mode="popLayout">
              <motion.div
                key={view}
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: enterScale }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, scale: exitScale }}
                transition={transition}
                style={{ transformOrigin }}
                className="agenda-view"
              >
                {view === 'day' ? (
                  <DayView
                    date={selectedDate}
                    events={events}
                    equipes={visibleEquipes}
                    onSelectDate={setSelectedDate}
                  />
                ) : null}
                {view === 'week' ? (
                  <WeekView
                    date={selectedDate}
                    events={events}
                    equipes={visibleEquipes}
                    onOpenDay={(d, e) => {
                      setSelectedDate(d);
                      zoomTo('day', 'in', e ? originFromEvent(e) : '50% 50%');
                    }}
                  />
                ) : null}
                {view === 'month' ? (
                  <MonthView
                    date={selectedDate}
                    eventsByDay={eventsByDay}
                    selectedDate={selectedDate}
                    onSelectDate={setSelectedDate}
                    onOpenDay={(d, e) => {
                      setSelectedDate(d);
                      zoomTo('day', 'in', e ? originFromEvent(e) : '50% 50%');
                    }}
                  />
                ) : null}
                {view === 'year' ? (
                  <YearView
                    date={selectedDate}
                    eventsByDay={eventsByDay}
                    mode={yearMode}
                    onModeChange={setYearMode}
                    onOpenMonth={(d, e) => {
                      setSelectedDate(startOfMonth(d));
                      zoomTo('month', 'in', e ? originFromEvent(e) : '50% 50%');
                    }}
                    onOpenDay={(d, e) => {
                      setSelectedDate(d);
                      zoomTo('day', 'in', e ? originFromEvent(e) : '50% 50%');
                    }}
                  />
                ) : null}
              </motion.div>
            </AnimatePresence>
          </LayoutGroup>
        </div>
      </div>

      <nav className="agenda-tabbar" aria-label="Vues">
        {TAB_VIEWS.map((v) => (
          <button
            key={v}
            type="button"
            className={view === v ? 'on' : ''}
            onClick={() => {
              setZoomDir('none');
              setView(v);
            }}
          >
            {v === 'day' ? 'Jour' : v === 'week' ? 'Sem.' : v === 'month' ? 'Mois' : 'Année'}
          </button>
        ))}
      </nav>
    </div>
  );
}
