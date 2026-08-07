'use client';

export type PlanningViewMode = 'day' | 'month' | 'year';

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
      <h3 className="agenda-title">{title}</h3>
      <div className="agenda-seg" role="tablist" aria-label="Vue">
        {(['day', 'month', 'year'] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={view === v}
            className={view === v ? 'on' : ''}
            onClick={() => onSetView(v)}
          >
            {v === 'day' ? 'Jour' : v === 'month' ? 'Mois' : 'Année'}
          </button>
        ))}
      </div>
    </div>
  );
}
