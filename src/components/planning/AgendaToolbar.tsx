'use client';

import { AideLabel } from '@/components/AideTip';
import { AIDES } from '@/lib/aides';

export type PlanningViewMode = 'day' | 'week' | 'month' | 'year';

const VIEW_LABEL: Record<PlanningViewMode, string> = {
  day: 'Jour',
  week: 'Semaine',
  month: 'Mois',
  year: 'Année',
};

const VIEWS: PlanningViewMode[] = ['day', 'week', 'month', 'year'];

export function AgendaToolbar({
  view,
  title,
  backLabel,
  onZoomBack,
  onPrev,
  onNext,
  onToday,
  onSetView,
}: {
  view: PlanningViewMode;
  title: string;
  backLabel: string | null;
  onZoomBack: () => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onSetView: (v: PlanningViewMode) => void;
}) {
  return (
    <div className="agenda-toolbar">
      <div className="agenda-toolbar-left">
        {backLabel ? (
          <button type="button" className="btn-note" onClick={onZoomBack}>
            ‹ {backLabel}
          </button>
        ) : null}
        <button type="button" className="btn-note" onClick={onPrev} aria-label="Précédent">
          ‹
        </button>
        <button type="button" className="btn-note" onClick={onNext} aria-label="Suivant">
          ›
        </button>
        <button type="button" className="btn-note" onClick={onToday}>
          Aujourd&apos;hui
        </button>
      </div>
      <AideLabel aide={AIDES.planning} placement="bottom">
        <h3 className="agenda-title">{title}</h3>
      </AideLabel>
      <div className="agenda-seg" role="tablist" aria-label="Vue">
        {VIEWS.map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={view === v}
            className={view === v ? 'on' : ''}
            onClick={() => onSetView(v)}
            title={
              v === 'day'
                ? 'Détail horaire du jour par équipe'
                : v === 'week'
                  ? 'Semaine complète'
                  : v === 'month'
                    ? 'Vue mois'
                    : 'Vue année / exercice'
            }
          >
            {VIEW_LABEL[v]}
          </button>
        ))}
      </div>
    </div>
  );
}
