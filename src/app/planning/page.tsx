'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useApp } from '@/context/AppStateContext';
import { addDays, formatFR, startOfWeek, todayISO, weekdayShort } from '@/lib/dates';
import { getDevis, getImmeuble } from '@/lib/domain/lookups';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function PlanningPage() {
  const { state, updateAffaire } = useApp();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(todayISO()));

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const cells = useMemo(() => {
    const map = new Map<string, typeof state.affectations>();
    for (const a of state.affectations) {
      const key = `${a.equipeId}|${a.date}`;
      const list = map.get(key) ?? [];
      list.push(a);
      map.set(key, list);
    }
    return map;
  }, [state]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--navy)] sm:text-2xl">Planning chantiers</h1>
          <p className="mt-1 text-sm text-slate-600">
            Équipes × jours — ABSENT / CONGÉS / FÉRIÉ / INTEMPÉRIE gérés nativement.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-secondary py-2"
            onClick={() => setWeekStart(addDays(weekStart, -7))}
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold">
            Semaine du {formatFR(weekStart)}
          </span>
          <button
            type="button"
            className="btn-secondary py-2"
            onClick={() => setWeekStart(addDays(weekStart, 7))}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Mobile : liste par jour */}
      <div className="space-y-4 lg:hidden">
        {days.map((day) => (
          <section key={day} className="card">
            <h2 className="mb-2 font-bold capitalize">
              {weekdayShort(day)} {formatFR(day)}
            </h2>
            <ul className="space-y-2">
              {state.equipes.map((eq) => {
                const items = cells.get(`${eq.id}|${day}`) ?? [];
                return (
                  <li key={eq.id} className="text-sm">
                    <p className="font-semibold" style={{ color: eq.color }}>
                      {eq.libelle}
                    </p>
                    {items.length === 0 ? (
                      <p className="text-slate-400">—</p>
                    ) : (
                      items.map((it) => {
                        const aff = it.affaireId
                          ? state.affaires.find((a) => a.id === it.affaireId)
                          : undefined;
                        const devis = aff ? getDevis(state, aff.devisId) : undefined;
                        const imm = aff ? getImmeuble(state, aff.immeubleId) : undefined;
                        return (
                          <div
                            key={it.id}
                            className="mt-1 rounded-lg px-2 py-1.5 text-xs"
                            style={{ background: eq.bg, color: eq.color }}
                          >
                            {it.type !== 'CHANTIER' ? (
                              <strong>{it.type}</strong>
                            ) : (
                              <Link href={`/affaires/${it.affaireId}`}>
                                {devis?.numeroBatappli} · {imm?.adresse}
                              </Link>
                            )}
                          </div>
                        );
                      })
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {/* Desktop grille */}
      <div className="card hidden overflow-x-auto p-0 lg:block">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left">Équipe</th>
              {days.map((d) => (
                <th key={d} className="px-2 py-2 text-center">
                  {weekdayShort(d)}
                  <br />
                  {formatFR(d).slice(0, 5)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {state.equipes.map((eq) => (
              <tr key={eq.id} className="border-t border-slate-100">
                <td className="px-3 py-2 font-semibold" style={{ color: eq.color }}>
                  {eq.libelle}
                  <p className="text-[10px] font-normal text-slate-400">
                    {eq.compagnons.length} compagnons
                  </p>
                </td>
                {days.map((d) => {
                  const items = cells.get(`${eq.id}|${d}`) ?? [];
                  return (
                    <td key={d} className="px-1 py-1 align-top">
                      {items.map((it) => {
                        const aff = it.affaireId
                          ? state.affaires.find((a) => a.id === it.affaireId)
                          : undefined;
                        const devis = aff ? getDevis(state, aff.devisId) : undefined;
                        const imm = aff ? getImmeuble(state, aff.immeubleId) : undefined;
                        return (
                          <div
                            key={it.id}
                            className="mb-1 rounded-md px-1.5 py-1 text-[11px] leading-tight"
                            style={{ background: eq.bg, color: eq.color }}
                          >
                            {it.type !== 'CHANTIER' ? (
                              <strong>{it.type}</strong>
                            ) : (
                              <Link href={`/affaires/${it.affaireId}`} className="hover:underline">
                                <strong>{devis?.numeroBatappli}</strong>
                                <br />
                                {imm?.adresse}
                              </Link>
                            )}
                          </div>
                        );
                      })}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500">
        Planifier une affaire portefeuille la fait passer en PLANIFIÉ (à brancher au
        glisser-déposer desktop — étape suivante).
      </p>
      {/* keep updateAffaire available for next iteration */}
      <span className="hidden">{String(!!updateAffaire)}</span>
    </div>
  );
}
