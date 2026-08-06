'use client';

import Link from 'next/link';
import { useApp } from '@/context/AppStateContext';
import { formatFR } from '@/lib/dates';
import { getDevis } from '@/lib/domain/lookups';

export default function CommandesPage() {
  const { state } = useApp();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-[var(--navy)] sm:text-2xl">
          Commandes & demandes de prix
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Benne, roulotte, nacelle, échafaudage, matériaux — hors boîte mail.
        </p>
      </div>

      <h2 className="font-semibold text-slate-800">Commandes</h2>
      <ul className="space-y-2">
        {state.commandes.map((c) => {
          const aff = state.affaires.find((a) => a.id === c.affaireId);
          const devis = aff ? getDevis(state, aff.devisId) : undefined;
          return (
            <li key={c.id} className="card flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-bold">
                  {c.type} — {c.fournisseur} · {c.statut}
                </p>
                <p className="text-sm text-slate-600">
                  Besoin {formatFR(c.dateBesoin)}
                  {c.dateCommande ? ` · commandé ${formatFR(c.dateCommande)}` : ''}
                  {devis ? ` · ${devis.numeroBatappli}` : ''} · {c.montant} €
                </p>
              </div>
              <Link href={`/affaires/${c.affaireId}`} className="btn-secondary py-2 text-xs">
                Affaire
              </Link>
            </li>
          );
        })}
      </ul>

      <h2 className="font-semibold text-slate-800">Demandes de prix</h2>
      <ul className="space-y-2">
        {state.demandesPrix.map((d) => (
          <li key={d.id} className="card text-sm">
            <p className="font-bold">
              {d.fournisseur} — {d.objet} · {d.statut}
            </p>
            <p>
              Demandé le {formatFR(d.dateDemande)}
              {d.dateReponse ? ` · réponse ${formatFR(d.dateReponse)}` : ''}
            </p>
            <Link
              href={`/affaires/${d.affaireId}`}
              className="mt-2 inline-block text-[var(--navy)] underline"
            >
              Voir l’affaire
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
