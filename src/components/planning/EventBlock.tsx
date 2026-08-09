'use client';

import type { PlanningEvent } from '@/lib/planning/toCalendarEvents';
import { columnStyle } from '@/lib/planning/layout';

function hexAlpha(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}

export function EventBlock({
  event,
  top,
  height,
  column,
  columnCount,
  showTeam,
  onClick,
  onDragStart,
}: {
  event: PlanningEvent;
  top: number;
  height: number;
  column: number;
  columnCount: number;
  showTeam?: boolean;
  onClick: () => void;
  onDragStart?: () => void;
}) {
  const pos = columnStyle(column, columnCount);
  const showTime = height >= 40;

  return (
    <button
      type="button"
      className="agenda-evt"
      style={{
        top,
        height,
        left: pos.left,
        width: pos.width,
        background: hexAlpha(event.color, 0.15),
        borderLeftColor: event.color,
      }}
      onClick={onClick}
      draggable={!!onDragStart && !event.id.startsWith('tache-') && event.sourceType !== 'ferie'}
      onDragStart={onDragStart}
      title={event.title}
    >
      <span className="agenda-evt-title">{event.title}</span>
      {showTime ? (
        <span className="agenda-evt-meta">
          {showTeam && event.resourceName ? `${event.resourceName} · ` : ''}
          {event.sourceType === 'contrat_entretien'
            ? ceMeta(event)
            : event.sourceType === 'chantier'
              ? 'Chantier'
              : event.sourceType === 'presta'
                ? 'presta'
                : event.allDay
                  ? 'journée'
                  : ''}
        </span>
      ) : null}
    </button>
  );
}

function ceMeta(event: PlanningEvent): string {
  const raw = event.raw as { slot?: { label?: string | null } } | null;
  const label = raw?.slot?.label ?? '';
  const gars = label.match(/(\d+)\s+compagnon/);
  const duree = /½\s*j/.test(label) ? '½ j' : /1\s*j/.test(label) ? '1 j' : '½–1 j';
  if (gars) return `Contrat d'entretien · ${duree} · ${gars[1]} compagnon${Number(gars[1]) > 1 ? 's' : ''}`;
  return `Contrat d'entretien · ${duree}`;
}
