'use client';

import { useMemo } from 'react';
import { useApp } from '@/context/AppStateContext';
import { formatShortDateTime } from '@/lib/dates';

/** Journal d'activité filtré sur une ou plusieurs entités. */
export function ActivityJournal({
  entitePrefixes,
  title = 'Journal d’activité',
  empty = 'Aucune entrée.',
  limit,
}: {
  /** ex. ['affaire:aff-1', 'facture:fac-'] — match exact ou startsWith si se termine par : */
  entitePrefixes: string[];
  title?: string;
  empty?: string;
  limit?: number;
}) {
  const { state } = useApp();

  const entries = useMemo(() => {
    const list = state.journal.filter((j) =>
      entitePrefixes.some((p) =>
        p.endsWith(':') ? j.entite.startsWith(p) : j.entite === p || j.entite.startsWith(`${p}:`),
      ),
    );
    const sorted = [...list].sort((a, b) => b.horodatage.localeCompare(a.horodatage));
    return limit ? sorted.slice(0, limit) : sorted;
  }, [state.journal, entitePrefixes, limit]);

  return (
    <div className="space-y-2">
      {title ? <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">{title}</h3> : null}
      {entries.length === 0 ? (
        <p className="card text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {entries.map((j) => {
            const u = state.utilisateurs.find((x) => x.id === j.utilisateurId);
            return (
              <li key={j.id} className="card text-sm">
                <p className="font-semibold text-slate-900">
                  {u?.nom ?? j.utilisateurId}{' '}
                  <span className="font-normal text-slate-500">· {j.action}</span>
                </p>
                <p className="text-xs text-slate-500">{formatShortDateTime(j.horodatage)}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">{j.entite}</p>
                {(j.valeurAvant || j.valeurApres) && (
                  <div className="mt-2 grid gap-1 rounded-lg bg-slate-50 px-2 py-1.5 text-xs">
                    {j.valeurAvant ? (
                      <p>
                        <span className="font-semibold text-red-700">Avant :</span> {j.valeurAvant}
                      </p>
                    ) : null}
                    {j.valeurApres ? (
                      <p>
                        <span className="font-semibold text-emerald-700">Après :</span>{' '}
                        {j.valeurApres}
                      </p>
                    ) : null}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
