'use client';

import {
  PLANNING_COLORS,
  PLANNING_TYPE_HINT,
  type EquipeRowInput,
  type PlanningSourceType,
} from '@/lib/planning/toCalendarEvents';

const TYPE_LABEL: Record<PlanningSourceType, string> = {
  chantier: 'Chantier',
  contrat_entretien: "Contrat d'entretien",
  presta: 'Prestataire',
  absent: 'Absence',
  tache: 'Tâche',
  ferie: 'Férié',
};

export function AgendaSidebar({
  equipes,
  resourceIds,
  sourceTypes,
  allTypes,
  eventCount,
  onToggleResource,
  onToggleType,
}: {
  equipes: EquipeRowInput[];
  resourceIds: Set<string>;
  sourceTypes: Set<PlanningSourceType>;
  allTypes: PlanningSourceType[];
  eventCount: number;
  onToggleResource: (id: string) => void;
  onToggleType: (t: PlanningSourceType) => void;
}) {
  return (
    <aside className="agenda-sidebar">
      <p className="eyebrow">Code couleurs</p>
      <ul className="agenda-legend" aria-label="Légende des couleurs">
        <li>
          <i style={{ background: PLANNING_COLORS.chantier }} aria-hidden />
          <span>
            <strong>Chantier</strong>
            <small>{PLANNING_TYPE_HINT.chantier}</small>
          </span>
        </li>
        <li>
          <i style={{ background: PLANNING_COLORS.contrat_entretien }} aria-hidden />
          <span>
            <strong>Contrat d&apos;entretien</strong>
            <small>{PLANNING_TYPE_HINT.contrat_entretien}</small>
          </span>
        </li>
      </ul>

      <p className="eyebrow" style={{ marginTop: 16 }}>
        Équipes / prestataires
      </p>
      <ul className="agenda-filters">
        {equipes.map((eq) => (
          <li key={eq.id}>
            <label>
              <input
                type="checkbox"
                checked={resourceIds.has(eq.id)}
                onChange={() => onToggleResource(eq.id)}
              />
              {eq.nom}
            </label>
          </li>
        ))}
      </ul>
      <p className="eyebrow" style={{ marginTop: 14 }}>
        Types
      </p>
      <ul className="agenda-filters">
        {allTypes.map((t) => (
          <li key={t}>
            <label>
              <input
                type="checkbox"
                checked={sourceTypes.has(t)}
                onChange={() => onToggleType(t)}
              />
              <i
                className="agenda-type-swatch"
                style={{ background: PLANNING_COLORS[t] }}
                aria-hidden
              />
              {TYPE_LABEL[t]}
            </label>
          </li>
        ))}
      </ul>
      <p className="hint" style={{ marginTop: 16 }}>
        {eventCount} événement{eventCount > 1 ? 's' : ''}
      </p>
    </aside>
  );
}
