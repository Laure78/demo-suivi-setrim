/**
 * Projection lecture seule : entités planning → PlanningEvent.
 * Aucune écriture. Les ids d'origine sont conservés dans sourceId / raw.
 */

import { addDays, startOfDay } from 'date-fns';
import { toIsoDay } from '@/lib/planning/dates';

export type PlanningSourceType =
  | 'chantier'
  | 'contrat_entretien'
  | 'presta'
  | 'absent'
  | 'tache'
  | 'ferie';

export type PlanningEvent = {
  id: string;
  sourceType: PlanningSourceType;
  /** Id entité d'origine (slot id, tache id, ou clé férié) */
  sourceId: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  resourceId?: string;
  resourceName?: string;
  color: string;
  /** Alerte retard (tâche niveau urgent / échéance dépassée) */
  isAlert?: boolean;
  affaireId?: string | null;
  raw: unknown;
};

/** Couleurs planning — chantier (travaux) vs CE (½ j → 1 j) */
export const PLANNING_COLORS: Record<PlanningSourceType, string> = {
  chantier: '#1F7A45', // vert — travaux / multi-jours
  contrat_entretien: '#0A6EA8', // bleu — CE, intervention courte (½ j à 1 j)
  presta: '#7B4B9A',
  absent: '#9AA19A',
  tache: '#D9A81F',
  ferie: '#8B948E',
};

export const PLANNING_TYPE_HINT: Partial<Record<PlanningSourceType, string>> = {
  chantier: 'Travaux — plusieurs jours possibles',
  contrat_entretien: 'Entretien — ½ journée à 1 journée',
};

export type SlotInput = {
  id: string;
  type: string;
  label: string | null;
  affaireId?: string | null;
  niveau?: number;
  affaire?: {
    id?: string;
    client: string;
    numeroDevis: string;
    adresse: string;
  } | null;
};

export type EquipeDayInput = {
  date: string;
  day: number;
  weekend: boolean;
  ferie: boolean;
  slots: SlotInput[];
};

export type EquipeRowInput = {
  id: string;
  nom: string;
  categorie: string;
  ordre?: number;
  days: EquipeDayInput[];
};

function mapSlotType(type: string): PlanningSourceType {
  if (type === 'ce') return 'contrat_entretien';
  if (type === 'presta') return 'presta';
  if (type === 'absent') return 'absent';
  if (type === 'tache' || type === 'task') return 'tache';
  return 'chantier';
}

function slotTitle(slot: SlotInput, sourceType: PlanningSourceType): string {
  if (sourceType === 'contrat_entretien') {
    // Titre court : syndic / immeuble (le détail CE est dans le meta)
    if (slot.affaire?.client) {
      const adr = slot.affaire.adresse?.split(',')[0]?.trim();
      return adr ? `${slot.affaire.client} · ${adr}` : slot.affaire.client;
    }
    if (slot.label) {
      // « Client · Adresse · Contrat d'entretien · … »
      const parts = slot.label.split('·').map((p) => p.trim());
      if (parts.length >= 2) return `${parts[0]} · ${parts[1]}`;
      return parts[0] || slot.label;
    }
  }
  if (slot.affaire?.client) {
    return slot.affaire.client;
  }
  if (slot.label) {
    return slot.label.split('·')[0]?.trim() || slot.label;
  }
  if (sourceType === 'absent') return 'Absence';
  if (sourceType === 'tache') return 'Tâche';
  return 'Intervention';
}

function dayBounds(isoDate: string): { start: Date; end: Date } {
  const start = startOfDay(new Date(isoDate + 'T12:00:00'));
  return { start, end: addDays(start, 1) };
}

/** Transforme la structure actuelle (équipes × jours × slots) en liste plate. */
export function toCalendarEvents(equipes: EquipeRowInput[]): PlanningEvent[] {
  const events: PlanningEvent[] = [];
  const ferieDone = new Set<string>();

  for (const eq of equipes) {
    for (const day of eq.days) {
      if (day.ferie && !ferieDone.has(day.date)) {
        ferieDone.add(day.date);
        const { start, end } = dayBounds(day.date);
        events.push({
          id: `ferie-${day.date}`,
          sourceType: 'ferie',
          sourceId: day.date,
          title: 'Férié',
          start,
          end,
          allDay: true,
          color: PLANNING_COLORS.ferie,
          raw: { date: day.date, ferie: true },
        });
      }

      for (const slot of day.slots) {
        const sourceType = mapSlotType(slot.type);
        const { start, end } = dayBounds(day.date);
        const isSyntheticTache = slot.id.startsWith('tache-');
        const late =
          sourceType === 'tache' &&
          startOfDay(start).getTime() < startOfDay(new Date()).getTime();
        events.push({
          id: slot.id,
          sourceType,
          sourceId: isSyntheticTache ? slot.id.replace(/^tache-/, '') : slot.id,
          title: slotTitle(slot, sourceType),
          start,
          end,
          allDay: true,
          resourceId: eq.id,
          resourceName: eq.nom,
          color:
            sourceType === 'tache' && (slot.niveau ?? 2) >= 3
              ? '#C0392B'
              : PLANNING_COLORS[sourceType],
          isAlert: sourceType === 'tache' && ((slot.niveau ?? 2) >= 3 || late),
          affaireId: slot.affaireId ?? slot.affaire?.id ?? null,
          raw: { slot, equipe: { id: eq.id, nom: eq.nom, categorie: eq.categorie }, day },
        });
      }
    }
  }

  return events;
}

/** Index ISO → événements (pour vues Mois / Année). */
export function indexEventsByDay(events: PlanningEvent[]): Map<string, PlanningEvent[]> {
  const map = new Map<string, PlanningEvent[]>();
  for (const ev of events) {
    const key = toIsoDay(ev.start);
    const list = map.get(key) ?? [];
    list.push(ev);
    map.set(key, list);
  }
  for (const [, list] of map) {
    list.sort((a, b) => {
      if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
      return a.start.getTime() - b.start.getTime();
    });
  }
  return map;
}

export function filterEvents(
  events: PlanningEvent[],
  opts: {
    resourceIds?: Set<string>;
    sourceTypes?: Set<PlanningSourceType>;
  },
): PlanningEvent[] {
  return events.filter((ev) => {
    if (opts.sourceTypes && !opts.sourceTypes.has(ev.sourceType)) return false;
    if (opts.resourceIds && ev.resourceId && !opts.resourceIds.has(ev.resourceId)) {
      return false;
    }
    if (opts.resourceIds && !ev.resourceId && ev.sourceType !== 'ferie') return false;
    return true;
  });
}
