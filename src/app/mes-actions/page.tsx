'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppStateContext';
import { myOpenActions, isEscalated } from '@/lib/chantier-helpers';
import { formatFR, isOverdue, daysUntil } from '@/lib/dates';

export default function MesActionsPage() {
  const { state, activeUserId, activeUserName, toggleAction } = useApp();

  const rows = useMemo(
    () => myOpenActions(state.chantiers, activeUserId),
    [state.chantiers, activeUserId],
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-[var(--navy)] sm:text-2xl">Mes actions</h2>
        <p className="mt-1 text-sm text-slate-600">
          À faire pour <strong>{activeUserName}</strong> — tous chantiers, retards en haut.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="card border-emerald-200 bg-emerald-50/60">
          <p className="font-semibold text-emerald-800">Rien en attente</p>
          <p className="mt-1 text-sm text-emerald-700">
            Aucune action ouverte ne vous est assignée.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map(({ chantier, action }) => {
            const late = isOverdue(action.dueDate);
            const esc = isEscalated(action);
            const d = daysUntil(action.dueDate);
            return (
              <li
                key={`${chantier.id}-${action.id}`}
                className={`card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${
                  esc
                    ? 'border-purple-300 bg-purple-50'
                    : late
                      ? 'border-red-200 bg-[var(--danger-bg)]'
                      : ''
                }`}
              >
                <div className="flex min-w-0 items-start gap-3">
                  <input
                    type="checkbox"
                    className="checkbox-lg mt-0.5"
                    checked={false}
                    onChange={() => toggleAction(chantier.id, action.id)}
                    aria-label={action.label}
                  />
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900">{action.label}</p>
                    <p className="text-sm text-slate-600">
                      <Link
                        href={`/chantiers/${chantier.id}`}
                        className="font-semibold text-[var(--navy)] hover:underline"
                      >
                        {chantier.title}
                      </Link>
                      {' · '}
                      Échéance {formatFR(action.dueDate)}
                      {late
                        ? ` · retard ${Math.abs(d)} j`
                        : d === 0
                          ? ' · aujourd’hui'
                          : ` · dans ${d} j`}
                    </p>
                    {esc ? (
                      <span className="mt-1 inline-block rounded-full bg-purple-700 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                        Escalade Dirigeant
                      </span>
                    ) : null}
                  </div>
                </div>
                <Link
                  href={`/chantiers/${chantier.id}`}
                  className="btn-secondary shrink-0 text-xs"
                >
                  Fiche →
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
