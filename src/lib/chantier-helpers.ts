import type { ActionItem, Chantier, ChantierStatus, Contrat, Message } from './types';
import { daysUntil, formatFR, isOverdue, isSoon, todayISO } from './dates';

export function chantierProgress(c: Chantier): { done: number; total: number; pct: number } {
  const total = c.actions.length;
  const done = c.actions.filter((a) => a.done).length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

export function overdueActions(c: Chantier): ActionItem[] {
  return c.actions.filter((a) => !a.done && isOverdue(a.dueDate));
}

export function soonActions(c: Chantier, within = 7): ActionItem[] {
  return c.actions.filter((a) => !a.done && isSoon(a.dueDate, within));
}

export function hasOverdue(c: Chantier): boolean {
  return overdueActions(c).length > 0;
}

/** Statut dérivé des dates — une seule source de vérité. */
export function getChantierStatus(c: Chantier, today = todayISO()): ChantierStatus {
  if (c.startDate > today) return 'programme';
  if (c.endDate < today) return 'termine';
  return 'en_cours';
}

export function statusLabel(status: ChantierStatus): string {
  if (status === 'en_cours') return 'En cours';
  if (status === 'programme') return 'Programmé';
  return 'Terminé';
}

export type DayAlert = {
  id: string;
  severity: 'red' | 'orange';
  title: string;
  subtitle: string;
  href: string;
};

/** Alertes tableau de bord : retards, échéances ≤ 7 j, messages importants. */
export function buildDashboardAlerts(
  chantiers: Chantier[],
  contrats: Contrat[],
  messages: Message[] = [],
): DayAlert[] {
  const alerts: DayAlert[] = [];

  for (const c of chantiers) {
    for (const a of overdueActions(c)) {
      alerts.push({
        id: `ov-${c.id}-${a.id}`,
        severity: 'red',
        title: `${c.title} — ${a.label}`,
        subtitle: `Échéance dépassée (${formatFR(a.dueDate)})`,
        href: `/chantiers/${c.id}`,
      });
    }
    for (const a of soonActions(c)) {
      const d = daysUntil(a.dueDate);
      alerts.push({
        id: `soon-${c.id}-${a.id}`,
        severity: 'orange',
        title: `${c.title} — ${a.label}`,
        subtitle: d === 0 ? "Échéance aujourd'hui" : `Dans ${d} jour${d > 1 ? 's' : ''}`,
        href: `/chantiers/${c.id}`,
      });
    }
  }

  for (const ct of contrats) {
    if (ct.status !== 'a_facturer') continue;
    const d = daysUntil(ct.anniversaryDate);
    if (d < 0) {
      alerts.push({
        id: `ct-${ct.id}`,
        severity: 'red',
        title: `Contrat — ${ct.client}`,
        subtitle: `Anniversaire dépassé (${formatFR(ct.anniversaryDate)}) — à facturer`,
        href: '/contrats',
      });
    } else if (d <= 7) {
      alerts.push({
        id: `ct-${ct.id}`,
        severity: 'orange',
        title: `Contrat — ${ct.client}`,
        subtitle: `Anniversaire dans ${d} j — à facturer`,
        href: '/contrats',
      });
    }
  }

  for (const m of messages.filter((x) => x.isImportant)) {
    const chantier = chantiers.find((c) => c.id === m.threadId);
    const threadLabel = chantier
      ? chantier.title
      : m.threadId === 'general'
        ? 'Équipe'
        : m.threadId;
    alerts.push({
      id: `msg-${m.id}`,
      severity: 'red',
      title: `Alerte messagerie — ${m.authorName}`,
      subtitle: `${threadLabel} : ${m.text}`,
      href: `/messagerie?thread=${encodeURIComponent(m.threadId)}`,
    });
  }

  const rank = { red: 0, orange: 1 };
  return alerts.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
