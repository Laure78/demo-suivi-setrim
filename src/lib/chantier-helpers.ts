import type {
  ActionItem,
  Chantier,
  ChantierStatus,
  Contrat,
  Message,
  UserId,
} from './types';
import { daysUntil, formatFR, isOverdue, isSoon, todayISO } from './dates';
import { getUser } from './users';

export const ESCALADE_DAYS = 5;

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

/** Retard > 5 jours → escalade Dirigeant */
export function isEscalated(a: ActionItem, from = todayISO()): boolean {
  if (a.done) return false;
  return daysUntil(a.dueDate, from) < -ESCALADE_DAYS;
}

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
  severity: 'escalate' | 'red' | 'orange';
  title: string;
  subtitle: string;
  href: string;
};

export function buildDashboardAlerts(
  chantiers: Chantier[],
  contrats: Contrat[],
  messages: Message[] = [],
): DayAlert[] {
  const alerts: DayAlert[] = [];

  for (const c of chantiers) {
    for (const a of c.actions) {
      if (a.done) continue;
      if (isEscalated(a)) {
        const resp = getUser(a.assigneeId).name;
        const daysLate = Math.abs(daysUntil(a.dueDate));
        alerts.push({
          id: `esc-${c.id}-${a.id}`,
          severity: 'escalate',
          title: `Escalade Dirigeant — ${c.title} : ${a.label}`,
          subtitle: `Retard de ${daysLate} j · Responsable : ${resp}`,
          href: `/chantiers/${c.id}`,
        });
      } else if (isOverdue(a.dueDate)) {
        alerts.push({
          id: `ov-${c.id}-${a.id}`,
          severity: 'red',
          title: `${c.title} — ${a.label}`,
          subtitle: `Échéance dépassée (${formatFR(a.dueDate)}) · ${getUser(a.assigneeId).name}`,
          href: `/chantiers/${c.id}`,
        });
      } else if (isSoon(a.dueDate)) {
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
  }

  for (const ct of contrats) {
    if (ct.status === 'fait') continue;
    const d = daysUntil(ct.anniversaryDate);
    const label =
      ct.status === 'a_venir' ? 'À venir' : 'À facturer';
    if (d < 0) {
      alerts.push({
        id: `ct-${ct.id}`,
        severity: 'red',
        title: `Contrat — ${ct.client}`,
        subtitle: `Anniversaire dépassé (${formatFR(ct.anniversaryDate)}) — ${label}`,
        href: '/contrats',
      });
    } else if (d <= 7) {
      alerts.push({
        id: `ct-${ct.id}`,
        severity: 'orange',
        title: `Contrat — ${ct.client}`,
        subtitle: `Anniversaire dans ${d} j — ${label}`,
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

  const rank = { escalate: 0, red: 1, orange: 2 };
  return alerts.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

/** Actions à faire pour un utilisateur, retards en tête puis échéance. */
export function myOpenActions(
  chantiers: Chantier[],
  userId: UserId,
): { chantier: Chantier; action: ActionItem }[] {
  const rows: { chantier: Chantier; action: ActionItem }[] = [];
  for (const c of chantiers) {
    for (const a of c.actions) {
      if (!a.done && a.assigneeId === userId) rows.push({ chantier: c, action: a });
    }
  }
  return rows.sort((x, y) => {
    const ox = isOverdue(x.action.dueDate) ? 0 : 1;
    const oy = isOverdue(y.action.dueDate) ? 0 : 1;
    if (ox !== oy) return ox - oy;
    return x.action.dueDate.localeCompare(y.action.dueDate);
  });
}

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Compresse une image File → data URL JPEG (démo localStorage). */
export function fileToCompressedDataUrl(file: File, maxW = 900, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Lecture impossible'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Image invalide'));
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
