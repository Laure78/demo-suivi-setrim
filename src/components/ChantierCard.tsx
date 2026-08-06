'use client';

import Link from 'next/link';
import type { Chantier } from '@/lib/types';
import { chantierProgress, getChantierStatus, hasOverdue, statusLabel } from '@/lib/chantier-helpers';
import { getTeam } from '@/lib/users';
import { formatFR } from '@/lib/dates';

export function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
      <div
        className="h-full rounded-full bg-[var(--navy)] transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function ChantierCard({ chantier }: { chantier: Chantier }) {
  const { done, total, pct } = chantierProgress(chantier);
  const overdue = hasOverdue(chantier);
  const team = getTeam(chantier.teamId);
  const status = getChantierStatus(chantier);

  return (
    <Link
      href={`/chantiers/${chantier.id}`}
      className="card block transition hover:border-[var(--navy)]/30 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-bold text-[var(--navy)]">
              {chantier.title}
            </h3>
            {overdue ? (
              <span
                className="inline-flex h-3.5 w-3.5 rounded-full bg-red-600 ring-2 ring-red-100"
                title="Actions en retard"
                aria-label="Actions en retard"
              />
            ) : null}
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
              style={{ background: team.bg, color: team.color }}
            >
              {team.shortLabel}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                status === 'en_cours'
                  ? 'bg-emerald-100 text-emerald-800'
                  : status === 'programme'
                    ? 'bg-slate-200 text-slate-700'
                    : 'bg-slate-100 text-slate-500'
              }`}
            >
              {statusLabel(status)}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-slate-600">{chantier.client}</p>
          <p className="text-xs text-slate-500">{chantier.address}</p>
          <p className="mt-1 text-xs text-slate-500">
            {formatFR(chantier.startDate)} → {formatFR(chantier.endDate)}
          </p>
        </div>
        <p className="shrink-0 text-sm font-bold tabular-nums text-slate-700">
          {done}/{total}
        </p>
      </div>
      <div className="mt-3">
        <ProgressBar pct={pct} />
      </div>
    </Link>
  );
}
