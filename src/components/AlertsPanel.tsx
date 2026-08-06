'use client';

import Link from 'next/link';
import type { DayAlert } from '@/lib/chantier-helpers';

const STYLES = {
  escalate: {
    border: 'border-purple-300 bg-purple-50',
    title: 'text-purple-900',
    badge: 'Escalade Denis',
  },
  red: {
    border: 'border-red-200 bg-[var(--danger-bg)]',
    title: 'text-red-800',
    badge: 'En retard',
  },
  orange: {
    border: 'border-orange-200 bg-[var(--warn-bg)]',
    title: 'text-orange-900',
    badge: 'Sous 7 jours',
  },
} as const;

export function AlertsPanel({ alerts }: { alerts: DayAlert[] }) {
  if (!alerts.length) {
    return (
      <div className="card border-emerald-200 bg-emerald-50/60">
        <p className="font-semibold text-emerald-800">Aucune alerte du jour</p>
        <p className="mt-1 text-sm text-emerald-700">Tout est à jour pour le moment.</p>
      </div>
    );
  }

  const esc = alerts.filter((a) => a.severity === 'escalate').length;
  const red = alerts.filter((a) => a.severity === 'red').length;
  const orange = alerts.filter((a) => a.severity === 'orange').length;

  return (
    <section className="card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold text-[var(--navy)]">Alertes du jour</h2>
        <p className="text-xs font-medium text-slate-500">
          {esc ? `${esc} escalade${esc > 1 ? 's' : ''} · ` : null}
          {red} retard{red > 1 ? 's' : ''} · {orange} sous 7 j
        </p>
      </div>
      <ul className="mt-3 space-y-2">
        {alerts.map((a) => {
          const st = STYLES[a.severity];
          return (
            <li key={a.id}>
              <Link
                href={a.href}
                className={`flex flex-col rounded-xl border px-3 py-3.5 transition hover:opacity-95 sm:flex-row sm:items-center sm:justify-between ${st.border}`}
              >
                <div>
                  <p className={`text-sm font-bold sm:text-base ${st.title}`}>
                    {st.badge} — {a.title}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-700 sm:text-sm">{a.subtitle}</p>
                </div>
                <span className="mt-2 text-sm font-semibold text-[var(--navy)] sm:mt-0">
                  Voir →
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
