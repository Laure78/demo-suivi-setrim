'use client';

import { useApp } from '@/context/AppStateContext';
import { daysUntil, formatFR, isOverdue, isSoon } from '@/lib/dates';
import type { Contrat, ContratStatus } from '@/lib/types';

function contratAlert(ct: Contrat): 'red' | 'orange' | null {
  if (ct.status === 'fait') return null;
  if (isOverdue(ct.anniversaryDate)) return 'red';
  if (isSoon(ct.anniversaryDate, 7)) return 'orange';
  return null;
}

function statusLabel(s: ContratStatus): string {
  if (s === 'fait') return 'Fait';
  if (s === 'a_venir') return 'À venir';
  return 'À facturer';
}

export default function ContratsPage() {
  const { state, setContratStatus } = useApp();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[var(--navy)] sm:text-2xl">
          Contrats d’entretien
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Facturation en un clic — l’échéance N+1 se crée automatiquement.
        </p>
      </div>

      <ul className="space-y-3">
        {state.contrats.map((ct) => {
          const alert = contratAlert(ct);
          const d = daysUntil(ct.anniversaryDate);

          return (
            <li
              key={ct.id}
              className={`card ${
                alert === 'red'
                  ? 'border-red-200 bg-[var(--danger-bg)]'
                  : alert === 'orange'
                    ? 'border-orange-200 bg-[var(--warn-bg)]'
                    : ct.status === 'fait'
                      ? 'opacity-75'
                      : ''
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-[var(--navy)] sm:text-lg">
                      {ct.client}
                    </h3>
                    {alert === 'red' ? (
                      <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                        Anniversaire dépassé
                      </span>
                    ) : null}
                    {alert === 'orange' ? (
                      <span className="rounded-full bg-orange-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                        Bientôt
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-slate-700">
                    Date anniversaire : <strong>{formatFR(ct.anniversaryDate)}</strong>
                    {ct.status !== 'fait' && d < 0
                      ? ` · en retard de ${Math.abs(d)} jour${Math.abs(d) > 1 ? 's' : ''}`
                      : null}
                    {ct.status !== 'fait' && d >= 0 && d <= 7
                      ? ` · dans ${d} jour${d > 1 ? 's' : ''}`
                      : null}
                  </p>
                  <p className="mt-1 text-sm">
                    Statut :{' '}
                    <span
                      className={`font-semibold ${
                        ct.status === 'fait'
                          ? 'text-emerald-700'
                          : ct.status === 'a_venir'
                            ? 'text-[var(--navy)]'
                            : 'text-slate-800'
                      }`}
                    >
                      {statusLabel(ct.status)}
                    </span>
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {ct.status === 'a_facturer' || ct.status === 'a_venir' ? (
                    <>
                      {ct.status === 'a_venir' ? (
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => setContratStatus(ct.id, 'a_facturer')}
                        >
                          Passer à facturer
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => setContratStatus(ct.id, 'fait')}
                      >
                        Marquer facturé
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setContratStatus(ct.id, 'a_facturer')}
                    >
                      Remettre à facturer
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
