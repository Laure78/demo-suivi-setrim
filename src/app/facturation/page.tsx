'use client';

import Link from 'next/link';
import { useApp } from '@/context/AppStateContext';
import { formatFR } from '@/lib/dates';
import { getDevis } from '@/lib/domain/lookups';

export default function FacturationPage() {
  const { state } = useApp();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-[var(--navy)] sm:text-2xl">Facturation</h1>
        <p className="mt-1 text-sm text-slate-600">
          Acomptes, situations, soldes, CE — qui a fait quoi, quand.
        </p>
      </div>
      <ul className="space-y-2">
        {state.factures.map((f) => {
          const aff = f.affaireId
            ? state.affaires.find((a) => a.id === f.affaireId)
            : undefined;
          const devis = aff ? getDevis(state, aff.devisId) : undefined;
          return (
            <li key={f.id} className="card flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-bold">
                  {f.numero} · {f.type} ·{' '}
                  <span
                    className={
                      f.statut === 'EMISE' || f.statut === 'RELANCEE'
                        ? 'text-red-700'
                        : 'text-emerald-700'
                    }
                  >
                    {f.statut}
                  </span>
                </p>
                <p className="text-sm text-slate-600">
                  {formatFR(f.dateEmission)} · {f.montant.toLocaleString('fr-FR')} €
                  {devis ? ` · ${devis.numeroBatappli}` : ''}
                </p>
              </div>
              {f.affaireId ? (
                <Link href={`/affaires/${f.affaireId}`} className="btn-secondary py-2 text-xs">
                  Affaire
                </Link>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
