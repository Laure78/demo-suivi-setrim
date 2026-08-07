'use client';

import { useMemo, useState } from 'react';
import { useApp } from '@/context/AppStateContext';
import { adresseCourte, getImmeuble, getSyndic } from '@/lib/domain/lookups';
import {
  bandeauCe,
  cellLabel,
  currentExercice,
  hasPreuvePassage,
  indexFromMoisCalendaire,
  isContractMonthOverdue,
  moisCalendaireFromIndex,
  moisHeaderLabel,
  MOIS_EXERCICE_LABELS,
  statutContratLabel,
} from '@/lib/domain/ce-engine';
import type { PassageCE } from '@/lib/domain/types';
import { formatFR, todayISO } from '@/lib/dates';
import { Camera, FileText, X } from 'lucide-react';

const STATUT_CHIP: Record<string, string> = {
  ACTIF: 'bg-emerald-100 text-emerald-900',
  EN_RESILIATION: 'bg-amber-100 text-amber-900',
  RESILIE: 'bg-slate-200 text-slate-600',
  ATTENTE_OS: 'bg-sky-100 text-sky-900',
};

type ModalMode = 'detail' | 'programmer' | 'valider';

export default function PlanningCEPage() {
  const { state, programmerPassageCe, validerPassageCe } = useApp();
  const ex = useMemo(() => currentExercice(), [state.passagesCe, state.contrats]);
  const bandeau = useMemo(() => bandeauCe(state), [state]);

  const [selected, setSelected] = useState<{
    contratId: string;
    passageId: string;
  } | null>(null);
  const [mode, setMode] = useState<ModalMode>('detail');
  const [datePrevue, setDatePrevue] = useState(todayISO());
  const [equipeId, setEquipeId] = useState('');
  const [dateRealisee, setDateRealisee] = useState(todayISO());
  const [bon, setBon] = useState('');
  const [photoData, setPhotoData] = useState('');
  const [compteRendu, setCompteRendu] = useState('');
  const [error, setError] = useState('');

  const rows = useMemo(() => {
    return state.contrats
      .filter((c) => !c.archived)
      .map((ct) => {
        const imm = getImmeuble(state, ct.immeubleId);
        const syn = getSyndic(state, ct.syndicId);
        const passage = state.passagesCe.find(
          (p) => p.contratId === ct.id && p.exercice === ex.label,
        );
        const overdue = isContractMonthOverdue(ct, passage);
        return { ct, imm, syn, passage, overdue };
      })
      .sort((a, b) => {
        if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
        return (a.syn?.nom ?? '').localeCompare(b.syn?.nom ?? '', 'fr');
      });
  }, [state, ex.label]);

  function openCell(contratId: string, passage: PassageCE | undefined) {
    if (!passage) return;
    setSelected({ contratId, passageId: passage.id });
    setMode('detail');
    setDatePrevue(passage.datePrevue ?? todayISO());
    setEquipeId(passage.equipeId ?? state.equipes[0]?.id ?? '');
    setDateRealisee(passage.dateRealisee ?? todayISO());
    setBon(passage.bonIntervention ?? '');
    setPhotoData(passage.photos[0] ?? '');
    setCompteRendu(passage.compteRendu ?? '');
    setError('');
  }

  function submitProgrammer() {
    if (!selected) return;
    const res = programmerPassageCe(selected.passageId, datePrevue, equipeId || undefined);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSelected(null);
  }

  function submitValider() {
    if (!selected) return;
    const photos = photoData.trim() ? [photoData.trim()] : [];
    const res = validerPassageCe({
      passageId: selected.passageId,
      dateRealisee,
      bonIntervention: bon,
      photos,
      compteRendu,
    });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSelected(null);
  }

  const selCt = selected
    ? state.contrats.find((c) => c.id === selected.contratId)
    : undefined;
  const selPass = selected
    ? state.passagesCe.find((p) => p.id === selected.passageId)
    : undefined;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-[var(--navy)] sm:text-2xl">Planning CE</h1>
        <p className="mt-1 text-sm text-slate-600">
          Contrats d&apos;entretien — exercice{' '}
          <strong>
            {formatFR(ex.start)} → {formatFR(ex.end)}
          </strong>{' '}
          ({ex.label}). Le mois de passage est un engagement contractuel.
        </p>
      </div>

      <div className="sticky top-[7.5rem] z-20 grid gap-2 rounded-xl border border-teal-800 bg-teal-700 p-3 text-white shadow-md sm:grid-cols-4 sm:top-[8.5rem]">
        <div>
          <p className="text-[11px] uppercase text-teal-100">Contrats actifs</p>
          <p className="text-xl font-bold">{bandeau.actifs}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase text-teal-100">CA récurrent annuel</p>
          <p className="text-xl font-bold tabular-nums">
            {bandeau.ca.toLocaleString('fr-FR')} € HT
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase text-teal-100">Passages non programmés</p>
          <p className="text-xl font-bold">{bandeau.nonProg}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase text-teal-100">Réalisés non facturés</p>
          <p className="text-xl font-bold">{bandeau.realNonFac}</p>
        </div>
      </div>

      {/* Mobile cards */}
      <ul className="space-y-3 xl:hidden">
        {rows.map(({ ct, imm, syn, passage, overdue }) => (
          <li
            key={ct.id}
            className={`card space-y-2 ${overdue ? 'border-red-400 bg-red-50' : ''}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-bold text-[var(--navy)]">{syn?.nom}</p>
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${STATUT_CHIP[ct.statut]}`}
              >
                {statutContratLabel(ct.statut)}
              </span>
            </div>
            <p className="text-sm text-slate-600">{adresseCourte(imm)}</p>
            <p className="text-xs text-slate-500">{ct.commentaire}</p>
            <div className="flex justify-between text-sm">
              <span>{ct.montantHTAnnuel.toLocaleString('fr-FR')} € HT / an</span>
              <span>
                {ct.nbCompagnons} comp. · {ct.nbJours} j
              </span>
            </div>
            <button
              type="button"
              onClick={() => openCell(ct.id, passage)}
              className={`w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold ${
                overdue
                  ? 'bg-red-600 text-white'
                  : passage?.statut === 'REALISE' || passage?.statut === 'FACTURE'
                    ? 'bg-emerald-600 text-white'
                    : passage?.statut === 'PROGRAMME'
                      ? 'bg-sky-600 text-white'
                      : 'bg-amber-200 text-amber-950'
              }`}
            >
              {MOIS_EXERCICE_LABELS[indexFromMoisCalendaire(ct.moisPassageContractuel)]}{' '}
              — {cellLabel(passage)}
            </button>
          </li>
        ))}
      </ul>

      {/* Desktop grid */}
      <div className="card hidden overflow-x-auto p-0 xl:block">
        <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2 shadow-[2px_0_0_#e2e8f0]">
                Syndic / Adresse
              </th>
              <th className="px-3 py-2">Commentaire</th>
              <th className="px-3 py-2 whitespace-nowrap">Montant HT annuel</th>
              <th className="px-3 py-2 text-center">Comp.</th>
              {MOIS_EXERCICE_LABELS.map((_, i) => (
                <th key={i} className="px-1 py-2 text-center whitespace-nowrap">
                  {moisHeaderLabel(i, ex)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ ct, imm, syn, passage, overdue }) => (
              <tr
                key={ct.id}
                className={`border-b border-slate-100 ${overdue ? 'bg-red-50/70' : ''}`}
              >
                <td className="sticky left-0 z-10 bg-inherit px-3 py-2 shadow-[2px_0_0_#e2e8f0]">
                  <p className="font-semibold">{syn?.nom}</p>
                  <p className="text-xs text-slate-500">{adresseCourte(imm)}</p>
                  <span
                    className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${STATUT_CHIP[ct.statut]}`}
                  >
                    {statutContratLabel(ct.statut)}
                  </span>
                </td>
                <td className="max-w-[160px] truncate px-3 py-2 text-slate-600">
                  {ct.commentaire}
                </td>
                <td className="px-3 py-2 tabular-nums whitespace-nowrap">
                  {ct.montantHTAnnuel.toLocaleString('fr-FR')} €
                </td>
                <td className="px-3 py-2 text-center">{ct.nbCompagnons}</td>
                {MOIS_EXERCICE_LABELS.map((_, i) => {
                  const moisCal = moisCalendaireFromIndex(i);
                  const isContract = moisCal === ct.moisPassageContractuel;
                  if (!isContract) {
                    return (
                      <td key={i} className="px-1 py-2 text-center text-slate-200">
                        ·
                      </td>
                    );
                  }
                  const red = overdue || passage?.statut === 'HORS_DELAI';
                  const done =
                    passage?.statut === 'REALISE' || passage?.statut === 'FACTURE';
                  const prog = passage?.statut === 'PROGRAMME';
                  return (
                    <td key={i} className="px-1 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => openCell(ct.id, passage)}
                        className={`min-h-[3rem] w-full min-w-[4.5rem] rounded-md px-1 py-1 text-[10px] font-bold leading-tight ${
                          red
                            ? 'bg-red-600 text-white'
                            : done
                              ? 'bg-emerald-500 text-white'
                              : prog
                                ? 'bg-sky-500 text-white'
                                : 'bg-amber-200 text-amber-950'
                        }`}
                        title={passage?.statut ?? 'À programmer'}
                      >
                        {cellLabel(passage)}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500">
        Rouge = mois contractuel écoulé sans passage réalisé (HORS_DELAI → alerte bloquante
        dirigeant). Ambre = à programmer. Bleu = programmé. Vert = réalisé / facturé. Validation
        impossible sans bon d&apos;intervention ou photo.
      </p>

      {selected && selCt && selPass ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div
            role="dialog"
            aria-modal
            className="max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:max-w-lg sm:rounded-2xl sm:p-5"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--navy)]">Passage CE</h2>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Fermer"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-slate-600">
              {getSyndic(state, selCt.syndicId)?.nom} —{' '}
              {adresseCourte(getImmeuble(state, selCt.immeubleId))}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Exercice {selPass.exercice} · mois contractuel{' '}
              {MOIS_EXERCICE_LABELS[indexFromMoisCalendaire(selCt.moisPassageContractuel)]} ·{' '}
              {selPass.statut}
            </p>

            {mode === 'detail' ? (
              <div className="mt-4 space-y-3">
                <p className="text-sm">
                  <span className="text-slate-500">Affichage : </span>
                  <strong>{cellLabel(selPass)}</strong>
                </p>
                {selPass.statut === 'HORS_DELAI' ? (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
                    Mois contractuel dépassé — alerte bloquante remontée au dirigeant.
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {selPass.statut !== 'REALISE' && selPass.statut !== 'FACTURE' ? (
                    <>
                      <button
                        type="button"
                        className="rounded-lg bg-sky-600 px-3 py-2.5 text-sm font-semibold text-white"
                        onClick={() => {
                          setMode('programmer');
                          setError('');
                        }}
                      >
                        Programmer
                      </button>
                      <button
                        type="button"
                        className="rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white"
                        onClick={() => {
                          setMode('valider');
                          setError('');
                        }}
                      >
                        Valider le passage
                      </button>
                    </>
                  ) : (
                    <p className="text-sm text-emerald-700">
                      Réalisé le {selPass.dateRealisee ? formatFR(selPass.dateRealisee) : '—'}
                      {hasPreuvePassage(selPass) ? ' · preuve jointe' : ''}
                    </p>
                  )}
                </div>
              </div>
            ) : null}

            {mode === 'programmer' ? (
              <div className="mt-4 space-y-3">
                <label className="block text-sm font-medium">
                  Date prévue
                  <input
                    type="date"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5"
                    value={datePrevue}
                    onChange={(e) => setDatePrevue(e.target.value)}
                  />
                </label>
                <label className="block text-sm font-medium">
                  Équipe
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5"
                    value={equipeId}
                    onChange={(e) => setEquipeId(e.target.value)}
                  >
                    {state.equipes
                      .filter((e) => e.actif)
                      .map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.libelle}
                        </option>
                      ))}
                  </select>
                </label>
                {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="flex-1 rounded-lg border py-3"
                    onClick={() => setMode('detail')}
                  >
                    Retour
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded-lg bg-sky-600 py-3 font-semibold text-white"
                    onClick={submitProgrammer}
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            ) : null}

            {mode === 'valider' ? (
              <div className="mt-4 space-y-3">
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  Preuve d&apos;exécution obligatoire : bon d&apos;intervention signé{' '}
                  <strong>ou</strong> photo.
                </p>
                <label className="block text-sm font-medium">
                  Date de réalisation
                  <input
                    type="date"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5"
                    value={dateRealisee}
                    onChange={(e) => setDateRealisee(e.target.value)}
                  />
                </label>
                <label className="block text-sm font-medium">
                  <span className="inline-flex items-center gap-1">
                    <FileText size={14} /> Bon d&apos;intervention (réf. / fichier)
                  </span>
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5"
                    value={bon}
                    onChange={(e) => setBon(e.target.value)}
                    placeholder="Ex. BI-2026-084.pdf"
                  />
                </label>
                <label className="block text-sm font-medium">
                  <span className="inline-flex items-center gap-1">
                    <Camera size={14} /> Photo (fichier ou URL démo)
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="mt-1 w-full text-sm"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => setPhotoData(String(reader.result ?? ''));
                      reader.readAsDataURL(file);
                    }}
                  />
                  {photoData ? (
                    <p className="mt-1 text-xs text-emerald-700">Photo jointe ✓</p>
                  ) : null}
                </label>
                <label className="block text-sm font-medium">
                  Compte-rendu
                  <textarea
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                    value={compteRendu}
                    onChange={(e) => setCompteRendu(e.target.value)}
                  />
                </label>
                {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="flex-1 rounded-lg border py-3"
                    onClick={() => setMode('detail')}
                  >
                    Retour
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded-lg bg-emerald-600 py-3 font-semibold text-white"
                    onClick={submitValider}
                  >
                    Valider
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
