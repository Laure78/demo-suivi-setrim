/**
 * Écran « Mes alertes du jour » — uniquement les notas OUVERT
 * du responsable = utilisateur connecté (pas d'escalade dirigeant).
 */

import type { PersistedState } from './types';
import { daysUntil, todayISO } from '@/lib/dates';
import { formatNotaSubtitle, hrefForEntite } from './nota-engine';

export type AlertBucket = 'aujourdhui' | 'retard' | 'semaine';

export type DayAlert = {
  id: string;
  notaId: string;
  bucket: AlertBucket;
  title: string;
  subtitle: string;
  href: string;
  priorite: 'normale' | 'haute' | 'bloquante';
  type: 'AUTO' | 'MANUEL';
  bloquePlanification?: boolean;
};

function bucketFromEcheance(echeance: string, from = todayISO()): AlertBucket {
  const d = daysUntil(echeance, from);
  if (d < 0) return 'retard';
  if (d === 0) return 'aujourdhui';
  if (d <= 7) return 'semaine';
  return 'semaine';
}

/** Alertes du jour pour l'utilisateur connecté uniquement. */
export function buildMesAlertes(state: PersistedState, userId: string): DayAlert[] {
  const t = todayISO();
  const alerts: DayAlert[] = [];

  for (const n of state.notas) {
    if (n.statut !== 'OUVERT' || n.archived) continue;
    if (n.responsableId !== userId) continue;

    // « Cette semaine » = échéance dans les 7 jours (hors aujourd'hui / retard)
    const d = daysUntil(n.echeance, t);
    if (d > 7) continue;

    alerts.push({
      id: `nota-${n.id}`,
      notaId: n.id,
      bucket: bucketFromEcheance(n.echeance, t),
      title: n.objet,
      subtitle: formatNotaSubtitle(n),
      href: hrefForEntite(state, n.entiteLiee),
      priorite: n.priorite === 'basse' ? 'normale' : n.priorite,
      type: n.type,
      bloquePlanification: n.bloquePlanification,
    });
  }

  const rank = { bloquante: 0, haute: 1, normale: 2 };
  const bucketRank = { retard: 0, aujourdhui: 1, semaine: 2 };
  return alerts.sort(
    (a, b) =>
      bucketRank[a.bucket] - bucketRank[b.bucket] ||
      rank[a.priorite] - rank[b.priorite] ||
      a.title.localeCompare(b.title, 'fr'),
  );
}
