'use client';

import { useMemo } from 'react';
import { useApp } from '@/context/AppStateContext';
import { adresseCourte, getImmeuble, getSyndic } from '@/lib/domain/lookups';

const MOIS = ['Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'];
/** Index 0 = juillet (mois calendaire 7) … index 11 = juin */
function moisCalendaireFromIndex(i: number): number {
  return i < 6 ? i + 7 : i - 5;
}

export default function PlanningCEPage() {
  const { state } = useApp();
  const now = new Date();
  const currentMonth = now.getMonth() + 1;

  const bandeau = useMemo(() => {
    const actifs = state.contrats.filter((c) => c.statut === 'ACTIF' || c.statut === 'ATTENTE_OS');
    const ca = actifs.reduce((s, c) => s + c.montantHTAnnuel, 0);
    const nonProg = state.passagesCe.filter((p) => p.statut === 'A_PROGRAMMER').length;
    const realNonFac = state.passagesCe.filter((p) => p.statut === 'REALISE').length;
    return { actifs: actifs.length, ca, nonProg, realNonFac };
  }, [state]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-[var(--navy)] sm:text-2xl">Planning CE</h1>
        <p className="mt-1 text-sm text-slate-600">
          Exercice glissant 01/07 → 30/06 — le mois de passage est un engagement contractuel.
        </p>
      </div>

      <div className="grid gap-2 rounded-xl border border-teal-700 bg-teal-700 p-3 text-white sm:grid-cols-4">
        <div>
          <p className="text-[11px] uppercase text-teal-100">Contrats actifs</p>
          <p className="text-xl font-bold">{bandeau.actifs}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase text-teal-100">CA récurrent annuel</p>
          <p className="text-xl font-bold">{bandeau.ca.toLocaleString('fr-FR')} € HT</p>
        </div>
        <div>
          <p className="text-[11px] uppercase text-teal-100">Non programmés</p>
          <p className="text-xl font-bold">{bandeau.nonProg}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase text-teal-100">Réalisés non facturés</p>
          <p className="text-xl font-bold">{bandeau.realNonFac}</p>
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Syndic / Adresse</th>
              <th className="px-3 py-2">Commentaire</th>
              <th className="px-3 py-2">Montant HT</th>
              <th className="px-3 py-2">Comp.</th>
              {MOIS.map((m) => (
                <th key={m} className="px-1 py-2 text-center">
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {state.contrats.map((ct) => {
              const imm = getImmeuble(state, ct.immeubleId);
              const syn = getSyndic(state, ct.syndicId);
              const passage = state.passagesCe.find((p) => p.contratId === ct.id);
              return (
                <tr key={ct.id} className="border-b border-slate-100">
                  <td className="px-3 py-2">
                    <p className="font-semibold">{syn?.nom}</p>
                    <p className="text-xs text-slate-500">{adresseCourte(imm)}</p>
                    <p className="text-[10px] font-bold uppercase text-slate-400">{ct.statut}</p>
                  </td>
                  <td className="max-w-[140px] truncate px-3 py-2 text-slate-600">
                    {ct.commentaire}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {ct.montantHTAnnuel.toLocaleString('fr-FR')} €
                  </td>
                  <td className="px-3 py-2 text-center">{ct.nbCompagnons}</td>
                  {MOIS.map((_, i) => {
                    const moisCal = moisCalendaireFromIndex(i);
                    const isContract = moisCal === ct.moisPassageContractuel;
                    const horsDelai =
                      isContract &&
                      (passage?.statut === 'HORS_DELAI' ||
                        (moisCal < currentMonth &&
                          passage?.statut !== 'REALISE' &&
                          passage?.statut !== 'FACTURE' &&
                          passage?.statut !== 'PROGRAMME'));
                    const programme =
                      isContract &&
                      (passage?.statut === 'PROGRAMME' || passage?.statut === 'REALISE');
                    return (
                      <td key={i} className="px-1 py-2 text-center">
                        {isContract ? (
                          <span
                            className={`inline-block h-8 w-8 rounded-md text-xs font-bold leading-8 ${
                              horsDelai
                                ? 'bg-red-600 text-white'
                                : programme
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-amber-200 text-amber-900'
                            }`}
                            title={passage?.statut ?? 'À programmer'}
                          >
                            {ct.nbJours}j
                          </span>
                        ) : (
                          <span className="text-slate-200">·</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">
        Rouge = mois contractuel écoulé sans passage réalisé (HORS_DELAI). Vert = programmé /
        réalisé. Un passage n’est validable qu’avec bon d’intervention ou photo.
      </p>
    </div>
  );
}
