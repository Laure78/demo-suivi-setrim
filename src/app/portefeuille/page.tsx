'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useApp } from '@/context/AppStateContext';
import {
  adresseCourte,
  getDevis,
  getImmeuble,
  getSyndicForImmeuble,
  joursConsommes,
} from '@/lib/domain/lookups';
import type { AffaireStatut, DevisType } from '@/lib/domain/types';
import { formatFR } from '@/lib/dates';

const PORTEFEUILLE_STATUTS: AffaireStatut[] = [
  'PORTEFEUILLE',
  'PLANIFIE',
  'SUSPENDU',
];

const TYPE_COLOR: Record<DevisType, string> = {
  TRAVAUX: 'bg-blue-100 text-blue-900',
  CE: 'bg-teal-100 text-teal-900',
  RESINE: 'bg-violet-100 text-violet-900',
  NETTOYAGE: 'bg-lime-100 text-lime-900',
  DIVERS: 'bg-slate-100 text-slate-800',
};

const STATUT_COLOR: Record<string, string> = {
  PORTEFEUILLE: 'bg-sky-100 text-sky-900',
  PLANIFIE: 'bg-indigo-100 text-indigo-900',
  EN_COURS: 'bg-emerald-100 text-emerald-900',
  SUSPENDU: 'bg-red-100 text-red-800',
};

function PortefeuilleInner() {
  const { state } = useApp();
  const searchParams = useSearchParams();
  const q = (searchParams.get('q') ?? '').toLowerCase();

  const rows = useMemo(() => {
    return state.affaires
      .filter((a) => !a.archived && PORTEFEUILLE_STATUTS.includes(a.statut))
      .map((a) => {
        const devis = getDevis(state, a.devisId)!;
        const imm = getImmeuble(state, a.immeubleId);
        const syndic = getSyndicForImmeuble(state, a.immeubleId);
        const conso = joursConsommes(state, a.id);
        return { a, devis, imm, syndic, conso };
      })
      .filter(({ devis, imm, syndic, a }) => {
        if (!q) return true;
        return (
          devis.numeroBatappli.toLowerCase().includes(q) ||
          (imm?.adresse.toLowerCase().includes(q) ?? false) ||
          (imm?.ville.toLowerCase().includes(q) ?? false) ||
          (syndic?.nom.toLowerCase().includes(q) ?? false) ||
          a.commentaire.toLowerCase().includes(q)
        );
      })
      .sort((x, y) => y.devis.date.localeCompare(x.devis.date));
  }, [state, q]);

  const totaux = useMemo(() => {
    const avecCharge = rows.filter((r) => r.a.joursChargeEstimes != null);
    const ca = rows.reduce((s, r) => s + r.devis.montantHT, 0);
    const jours = avecCharge.reduce((s, r) => s + (r.a.joursChargeEstimes ?? 0), 0);
    const caJour = jours > 0 ? ca / jours : 0;
    return { ca, jours, caJour, exclus: rows.length - avecCharge.length };
  }, [rows]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-[var(--navy)] sm:text-2xl">Portefeuille</h1>
        <p className="mt-1 text-sm text-slate-600">
          Affaires signées non encore réalisées — indicateur de plan de charge.
        </p>
      </div>

      <div className="sticky top-[7.5rem] z-20 grid gap-2 rounded-xl border border-[var(--navy)] bg-[var(--navy)] p-3 text-white shadow-md sm:grid-cols-3 sm:top-[8.5rem]">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-blue-100">CA portefeuille</p>
          <p className="text-xl font-bold tabular-nums">
            {totaux.ca.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} € HT
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-blue-100">Jours de charge</p>
          <p className="text-xl font-bold tabular-nums">
            {totaux.jours.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} j
            {totaux.exclus > 0 ? (
              <span className="ml-2 text-sm font-normal text-amber-200">
                ({totaux.exclus} sans charge)
              </span>
            ) : null}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-blue-100">CA moyen / jour</p>
          <p className="text-xl font-bold tabular-nums">
            {totaux.caJour.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
          </p>
        </div>
      </div>

      {/* Mobile cards */}
      <ul className="space-y-3 lg:hidden">
        {rows.map(({ a, devis, imm, syndic, conso }) => (
          <li key={a.id}>
            <Link href={`/affaires/${a.id}`} className="card block space-y-2 active:scale-[0.99]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-[var(--navy)]">{devis.numeroBatappli}</span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${TYPE_COLOR[devis.type]}`}>
                  {devis.type}
                </span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${STATUT_COLOR[a.statut]}`}>
                  {a.statut}
                </span>
              </div>
              <p className="text-sm font-medium">{syndic?.nom}</p>
              <p className="text-sm text-slate-600">{adresseCourte(imm)}</p>
              <div className="flex justify-between text-sm">
                <span>
                  Charge :{' '}
                  <strong>
                    {a.joursChargeEstimes ?? '—'} j
                  </strong>
                  {a.joursChargeEstimes != null ? (
                    <span className="text-slate-500"> / conso {conso}</span>
                  ) : null}
                </span>
                <strong>{devis.montantHT.toLocaleString('fr-FR')} € HT</strong>
              </div>
              <p className="text-xs text-slate-500">
                Acompte {a.acompteRecu.toLocaleString('fr-FR')} / {a.acompteAttendu.toLocaleString('fr-FR')} €
              </p>
              {a.commentaire ? <p className="text-xs italic text-slate-600">{a.commentaire}</p> : null}
            </Link>
          </li>
        ))}
      </ul>

      {/* Desktop table */}
      <div className="card hidden overflow-x-auto p-0 lg:block">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Devis</th>
              <th className="px-3 py-2">Syndic</th>
              <th className="px-3 py-2">Adresse chantier</th>
              <th className="px-3 py-2">Acompte TTC</th>
              <th className="px-3 py-2">Reçu</th>
              <th className="px-3 py-2">Jours charge</th>
              <th className="px-3 py-2">Montant HT</th>
              <th className="px-3 py-2">Statut</th>
              <th className="px-3 py-2">Commentaire</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ a, devis, imm, syndic, conso }) => {
              const ecart =
                a.joursChargeEstimes != null ? conso - a.joursChargeEstimes : null;
              return (
                <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 whitespace-nowrap">{formatFR(devis.date)}</td>
                  <td className="px-3 py-2">
                    <Link href={`/affaires/${a.id}`} className="font-semibold text-[var(--navy)] hover:underline">
                      {devis.numeroBatappli}
                    </Link>
                    <span className={`ml-2 rounded px-1 text-[10px] font-bold ${TYPE_COLOR[devis.type]}`}>
                      {devis.type}
                    </span>
                  </td>
                  <td className="px-3 py-2">{syndic?.nom}</td>
                  <td className="px-3 py-2">{adresseCourte(imm)}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {a.acompteAttendu.toLocaleString('fr-FR')} €
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    <span className={a.acompteRecu < a.acompteAttendu ? 'font-bold text-red-700' : ''}>
                      {a.acompteRecu.toLocaleString('fr-FR')} €
                    </span>
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {a.joursChargeEstimes == null ? (
                      <span className="font-bold text-red-700">Non saisi</span>
                    ) : (
                      <>
                        <strong>{a.joursChargeEstimes}</strong>
                        <span className="text-slate-500"> / {conso}</span>
                        {ecart != null && ecart !== 0 ? (
                          <span className={`ml-1 text-xs ${ecart > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            ({ecart > 0 ? '+' : ''}
                            {ecart})
                          </span>
                        ) : null}
                      </>
                    )}
                  </td>
                  <td className="px-3 py-2 tabular-nums font-medium">
                    {devis.montantHT.toLocaleString('fr-FR')} €
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${STATUT_COLOR[a.statut]}`}>
                      {a.statut}
                    </span>
                  </td>
                  <td className="max-w-[200px] truncate px-3 py-2 text-slate-600">{a.commentaire}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function PortefeuillePage() {
  return (
    <Suspense fallback={<div className="card text-sm text-slate-500">Chargement…</div>}>
      <PortefeuilleInner />
    </Suspense>
  );
}
