'use client';

import Link from 'next/link';
import { useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppStateContext';
import {
  adresseCourte,
  getDevis,
  getImmeuble,
  getSyndicForImmeuble,
  joursConsommes,
} from '@/lib/domain/lookups';
import type { Affaire, AffaireStatut, DevisType } from '@/lib/domain/types';
import { DEFAULT_COLOR_CODES } from '@/lib/domain/types';
import { addDays, formatFR, todayISO } from '@/lib/dates';
import { AlertTriangle, Plus, X } from 'lucide-react';

/** Affaires signées non encore réalisées */
const PORTEFEUILLE_STATUTS: AffaireStatut[] = [
  'PORTEFEUILLE',
  'PLANIFIE',
  'EN_COURS',
  'SUSPENDU',
];

const STATUT_LABEL: Record<string, string> = {
  PORTEFEUILLE: 'Portefeuille',
  PLANIFIE: 'Planifié',
  EN_COURS: 'En cours',
  SUSPENDU: 'Bloqué',
};

/** Codes couleur métier (filtre + pastille) */
export type CouleurPortefeuille =
  | 'en_cours'
  | 'divers'
  | 'resine'
  | 'nettoyage'
  | 'bloque';

const COULEUR_META: Record<
  CouleurPortefeuille,
  { label: string; chip: string; row: string }
> = {
  en_cours: {
    label: 'En cours',
    chip: 'bg-blue-100 text-blue-900',
    row: 'border-l-4',
  },
  divers: {
    label: 'Divers',
    chip: 'bg-slate-200 text-slate-800',
    row: 'border-l-4',
  },
  resine: {
    label: 'Résine',
    chip: 'bg-violet-100 text-violet-900',
    row: 'border-l-4',
  },
  nettoyage: {
    label: 'Nettoyage',
    chip: 'bg-lime-100 text-lime-900',
    row: 'border-l-4',
  },
  bloque: {
    label: 'Bloqué',
    chip: 'bg-red-100 text-red-800',
    row: 'border-l-4 bg-red-50/80',
  },
};

function couleurOf(statut: AffaireStatut, type: DevisType): CouleurPortefeuille {
  if (statut === 'SUSPENDU') return 'bloque';
  if (type === 'DIVERS') return 'divers';
  if (type === 'RESINE') return 'resine';
  if (type === 'NETTOYAGE') return 'nettoyage';
  return 'en_cours'; // TRAVAUX / CE
}

function PortefeuilleInner() {
  const { state, updateAffaire, createAffaire } = useApp();
  const searchParams = useSearchParams();
  const q = (searchParams.get('q') ?? '').toLowerCase();
  const colorCodes = { ...DEFAULT_COLOR_CODES, ...state.settings.colorCodes };

  const [filterSyndic, setFilterSyndic] = useState('');
  const [filterStatut, setFilterStatut] = useState<AffaireStatut | ''>('');
  const [filterCouleur, setFilterCouleur] = useState<CouleurPortefeuille | ''>('');
  const [chargeError, setChargeError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createDevisId, setCreateDevisId] = useState('');
  const [createJours, setCreateJours] = useState('');
  const [createAcompte, setCreateAcompte] = useState('');
  const [createComment, setCreateComment] = useState('');
  const [createError, setCreateError] = useState('');

  const devisSansAffaire = useMemo(
    () =>
      state.devis.filter(
        (d) =>
          !d.archived &&
          (d.statut === 'EN_ATTENTE' || d.statut === 'SIGNE') &&
          !state.affaires.some((a) => a.devisId === d.id && !a.archived),
      ),
    [state],
  );

  const rows = useMemo(() => {
    return state.affaires
      .filter((a) => !a.archived && PORTEFEUILLE_STATUTS.includes(a.statut))
      .map((a) => {
        const devis = getDevis(state, a.devisId)!;
        const imm = getImmeuble(state, a.immeubleId);
        const syndic = getSyndicForImmeuble(state, a.immeubleId);
        const conso = joursConsommes(state, a.id);
        const couleur = couleurOf(a.statut, devis.type);
        const ecart =
          a.joursChargeEstimes != null ? conso - a.joursChargeEstimes : null;
        return { a, devis, imm, syndic, conso, couleur, ecart };
      })
      .filter(({ devis, imm, syndic, a, couleur }) => {
        if (filterSyndic && syndic?.id !== filterSyndic) return false;
        if (filterStatut && a.statut !== filterStatut) return false;
        if (filterCouleur && couleur !== filterCouleur) return false;
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
  }, [state, q, filterSyndic, filterStatut, filterCouleur]);

  /** CA / charge / CA·jour — se recalcule dès qu'une ligne change (state) */
  const totaux = useMemo(() => {
    const avecCharge = rows.filter((r) => (r.a.joursChargeEstimes ?? 0) > 0);
    const ca = rows.reduce((s, r) => s + r.devis.montantHT, 0);
    const jours = avecCharge.reduce((s, r) => s + (r.a.joursChargeEstimes ?? 0), 0);
    const caJour = jours > 0 ? ca / jours : 0;
    return { ca, jours, caJour, exclus: rows.length - avecCharge.length };
  }, [rows]);

  function setJoursCharge(a: Affaire, raw: string) {
    const v = Number(raw.replace(',', '.'));
    if (!raw.trim() || !Number.isFinite(v) || v <= 0) {
      setChargeError('Les jours de charge sont obligatoires (nombre > 0).');
      return;
    }
    const res = updateAffaire(a.id, { joursChargeEstimes: v });
    if (!res.ok) setChargeError(res.error);
    else setChargeError(null);
  }

  function submitCreate() {
    setCreateError('');
    if (!createDevisId) {
      setCreateError('Choisissez un devis.');
      return;
    }
    const jours = Number(createJours.replace(',', '.'));
    if (!createJours.trim() || !Number.isFinite(jours) || jours <= 0) {
      setCreateError('Impossible d’enregistrer sans jours de charge.');
      return;
    }
    const acompte = Number(createAcompte.replace(',', '.')) || 0;
    const res = createAffaire({
      devisId: createDevisId,
      joursChargeEstimes: jours,
      acompteAttendu: acompte,
      commentaire: createComment,
    });
    if (!res.ok) {
      setCreateError(res.error);
      return;
    }
    setCreateOpen(false);
    setCreateDevisId('');
    setCreateJours('');
    setCreateAcompte('');
    setCreateComment('');
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--navy)] sm:text-2xl">Portefeuille</h1>
          <p className="mt-1 text-sm text-slate-600">
            Affaires signées non encore réalisées — plan de charge.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setCreateError('');
            setCreateOpen(true);
            setCreateDevisId(devisSansAffaire[0]?.id ?? '');
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--navy)] px-3 py-2.5 text-sm font-semibold text-white"
        >
          <Plus size={16} />
          Nouvelle affaire
        </button>
      </div>

      {/* Bandeau permanent plan de charge */}
      <div className="sticky top-[7.5rem] z-20 grid gap-2 rounded-xl border border-[var(--navy)] bg-[var(--navy)] p-3 text-white shadow-md sm:grid-cols-3 sm:top-[8.5rem]">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-blue-100">CA total portefeuille</p>
          <p className="text-xl font-bold tabular-nums">
            {totaux.ca.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} € HT
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-blue-100">
            Jours de charge cumulés
          </p>
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
          <p className="text-[11px] uppercase tracking-wide text-blue-100">
            CA moyen / jour
          </p>
          <p className="text-xl font-bold tabular-nums">
            {totaux.caJour.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
          </p>
          <p className="text-[11px] text-blue-200">CA total ÷ jours cumulés</p>
        </div>
      </div>

      {chargeError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {chargeError}
        </p>
      ) : null}

      {/* Légende couleurs */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold text-slate-600">Couleurs :</span>
        {(Object.keys(COULEUR_META) as CouleurPortefeuille[]).map((k) => (
          <span
            key={k}
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 font-medium ${COULEUR_META[k].chip}`}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: colorCodes[k] }}
            />
            {COULEUR_META[k].label}
          </span>
        ))}
      </div>

      {/* Filtres */}
      <div className="card grid gap-3 sm:grid-cols-3">
        <label className="block text-sm font-medium text-slate-700">
          Syndic
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={filterSyndic}
            onChange={(e) => setFilterSyndic(e.target.value)}
          >
            <option value="">Tous</option>
            {state.syndics
              .filter((s) => !s.archived)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nom}
                </option>
              ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Statut
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value as AffaireStatut | '')}
          >
            <option value="">Tous</option>
            {PORTEFEUILLE_STATUTS.map((s) => (
              <option key={s} value={s}>
                {STATUT_LABEL[s] ?? s}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Couleur
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={filterCouleur}
            onChange={(e) => setFilterCouleur(e.target.value as CouleurPortefeuille | '')}
          >
            <option value="">Toutes</option>
            {(Object.keys(COULEUR_META) as CouleurPortefeuille[]).map((k) => (
              <option key={k} value={k}>
                {COULEUR_META[k].label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="text-sm text-slate-500">
        {rows.length} affaire{rows.length > 1 ? 's' : ''}
      </p>

      {/* Mobile */}
      <ul className="space-y-3 lg:hidden">
        {rows.map(({ a, devis, imm, syndic, conso, couleur, ecart }) => (
          <li
            key={a.id}
            className={`card space-y-2 ${COULEUR_META[couleur].row}`}
            style={{ borderLeftColor: colorCodes[couleur] }}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/affaires/${a.id}`}
                className="font-bold text-[var(--navy)] hover:underline"
              >
                {devis.numeroBatappli}
              </Link>
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${COULEUR_META[couleur].chip}`}>
                {COULEUR_META[couleur].label}
              </span>
              <span className="text-xs text-slate-500">{formatFR(devis.date)}</span>
            </div>
            <p className="text-sm font-medium">{syndic?.nom}</p>
            <p className="text-sm text-slate-600">{adresseCourte(imm)}</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-slate-500">Acompte TTC / reçu</p>
                <p>
                  {a.acompteAttendu.toLocaleString('fr-FR')} /{' '}
                  <span className={a.acompteRecu < a.acompteAttendu ? 'font-bold text-red-700' : ''}>
                    {a.acompteRecu.toLocaleString('fr-FR')} €
                  </span>
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Montant HT</p>
                <p className="font-semibold">{devis.montantHT.toLocaleString('fr-FR')} €</p>
              </div>
            </div>
            <ChargeEditor
              a={a}
              conso={conso}
              ecart={ecart}
              onSave={(raw) => setJoursCharge(a, raw)}
            />
            {a.statut === 'SUSPENDU' ? (
              <SuspendBanner a={a} />
            ) : null}
            <CommentEditor
              value={a.commentaire}
              onSave={(v) => updateAffaire(a.id, { commentaire: v })}
            />
          </li>
        ))}
      </ul>

      {/* Desktop */}
      <div className="card hidden overflow-x-auto p-0 lg:block">
        <table className="w-full min-w-[1200px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">N° de devis</th>
              <th className="px-3 py-2">Syndic</th>
              <th className="px-3 py-2">Adresse chantier</th>
              <th className="px-3 py-2">Acompte TTC</th>
              <th className="px-3 py-2">Acompte reçu</th>
              <th className="px-3 py-2">Jours de charge</th>
              <th className="px-3 py-2">Montant</th>
              <th className="px-3 py-2">Statut</th>
              <th className="px-3 py-2">Commentaire</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ a, devis, imm, syndic, conso, couleur, ecart }) => (
              <tr
                key={a.id}
                className={`border-b border-slate-100 hover:bg-slate-50/80 ${COULEUR_META[couleur].row}`}
                style={{ borderLeftColor: colorCodes[couleur] }}
              >
                <td className="px-3 py-2 whitespace-nowrap">{formatFR(devis.date)}</td>
                <td className="px-3 py-2">
                  <Link
                    href={`/affaires/${a.id}`}
                    className="font-semibold text-[var(--navy)] hover:underline"
                  >
                    {devis.numeroBatappli}
                  </Link>
                </td>
                <td className="px-3 py-2">{syndic?.nom}</td>
                <td className="px-3 py-2">{adresseCourte(imm)}</td>
                <td className="px-3 py-2 tabular-nums">
                  {a.acompteAttendu.toLocaleString('fr-FR')} €
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    className={`w-24 rounded border px-1.5 py-1 tabular-nums ${
                      a.acompteRecu < a.acompteAttendu
                        ? 'border-red-300 font-bold text-red-700'
                        : 'border-slate-200'
                    }`}
                    defaultValue={a.acompteRecu}
                    key={`ac-${a.id}-${a.acompteRecu}`}
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (Number.isFinite(v) && v !== a.acompteRecu) {
                        updateAffaire(a.id, { acompteRecu: Math.max(0, v) });
                      }
                    }}
                  />
                </td>
                <td className="px-3 py-2">
                  <ChargeEditor
                    a={a}
                    conso={conso}
                    ecart={ecart}
                    compact
                    onSave={(raw) => setJoursCharge(a, raw)}
                  />
                </td>
                <td className="px-3 py-2 tabular-nums font-medium whitespace-nowrap">
                  {devis.montantHT.toLocaleString('fr-FR')} €
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${COULEUR_META[couleur].chip}`}
                  >
                    {COULEUR_META[couleur].label}
                  </span>
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    {STATUT_LABEL[a.statut] ?? a.statut}
                  </p>
                  {a.statut === 'SUSPENDU' ? <SuspendBanner a={a} compact /> : null}
                </td>
                <td className="px-3 py-2">
                  <CommentEditor
                    value={a.commentaire}
                    onSave={(v) => updateAffaire(a.id, { commentaire: v })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 ? (
        <p className="card text-sm text-slate-600">Aucune affaire pour ces filtres.</p>
      ) : null}

      {createOpen ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div
            role="dialog"
            aria-modal
            className="max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:max-w-md sm:rounded-2xl sm:p-5"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--navy)]">
                Enregistrer une affaire
              </h2>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Fermer"
              >
                <X size={20} />
              </button>
            </div>
            <p className="mb-3 text-sm text-slate-600">
              À la signature du devis, les jours de charge sont obligatoires.
            </p>
            <div className="space-y-3">
              <label className="block text-sm font-medium">
                Devis
                <select
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5"
                  value={createDevisId}
                  onChange={(e) => {
                    setCreateDevisId(e.target.value);
                    const d = state.devis.find((x) => x.id === e.target.value);
                    if (d) setCreateAcompte(String(Math.round(d.montantTTC * 0.3)));
                  }}
                >
                  <option value="">— Choisir —</option>
                  {devisSansAffaire.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.numeroBatappli} · {d.montantHT.toLocaleString('fr-FR')} € HT
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium">
                Jours de charge <span className="text-red-600">*</span>
                <input
                  type="number"
                  min={0.5}
                  step={0.5}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5"
                  value={createJours}
                  onChange={(e) => setCreateJours(e.target.value)}
                  placeholder="Obligatoire"
                />
              </label>
              <label className="block text-sm font-medium">
                Acompte TTC attendu
                <input
                  type="number"
                  min={0}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5"
                  value={createAcompte}
                  onChange={(e) => setCreateAcompte(e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium">
                Commentaire
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5"
                  value={createComment}
                  onChange={(e) => setCreateComment(e.target.value)}
                />
              </label>
              {createError ? (
                <p className="text-sm font-medium text-red-600">{createError}</p>
              ) : null}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="flex-1 rounded-lg border border-slate-300 py-3 font-medium"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={submitCreate}
                  className="flex-1 rounded-lg bg-[var(--navy)] py-3 font-semibold text-white"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ChargeEditor({
  a,
  conso,
  ecart,
  onSave,
  compact,
}: {
  a: Affaire;
  conso: number;
  ecart: number | null;
  onSave: (raw: string) => void;
  compact?: boolean;
}) {
  const missing = a.joursChargeEstimes == null || a.joursChargeEstimes <= 0;
  return (
    <div className={compact ? '' : 'rounded-lg bg-slate-50 p-2'}>
      <div className={`flex flex-wrap items-center gap-1.5 ${compact ? '' : 'text-sm'}`}>
        <input
          type="number"
          min={0.5}
          step={0.5}
          className={`w-16 rounded border px-1.5 py-1 tabular-nums font-semibold ${
            missing ? 'border-red-400 bg-red-50' : 'border-slate-200'
          }`}
          defaultValue={a.joursChargeEstimes ?? ''}
          key={`j-${a.id}-${a.joursChargeEstimes}`}
          title="Jours de charge (estimé) — obligatoire"
          onBlur={(e) => {
            if (e.target.value === String(a.joursChargeEstimes ?? '')) return;
            onSave(e.target.value);
          }}
        />
        <span className="text-slate-500">estimé</span>
        <span className="text-slate-400">·</span>
        <span className="tabular-nums">
          <strong>{conso}</strong> conso
        </span>
        {ecart != null && ecart !== 0 ? (
          <span
            className={`text-xs font-semibold ${
              ecart > 0 ? 'text-red-600' : 'text-emerald-600'
            }`}
          >
            écart {ecart > 0 ? '+' : ''}
            {ecart}
          </span>
        ) : null}
      </div>
      {missing ? (
        <p className="mt-1 text-[11px] font-medium text-red-700">Saisie obligatoire</p>
      ) : null}
    </div>
  );
}

function CommentEditor({
  value,
  onSave,
}: {
  value: string;
  onSave: (v: string) => void;
}) {
  return (
    <input
      className="w-full max-w-[220px] truncate rounded border border-transparent px-1 py-0.5 text-xs text-slate-600 hover:border-slate-200 focus:border-slate-300"
      defaultValue={value}
      key={value}
      onBlur={(e) => {
        if (e.target.value !== value) onSave(e.target.value);
      }}
    />
  );
}

function SuspendBanner({ a, compact }: { a: Affaire; compact?: boolean }) {
  const next =
    a.dateMotif != null ? addDays(a.dateMotif, 15) : addDays(a.dateDerniereAction, 15);
  const overdue = next <= todayISO();
  if (compact) {
    return (
      <p className="mt-1 max-w-[160px] text-[10px] leading-snug text-red-800">
        {a.motifSuspension ?? 'Suspendu'}
        {a.dateMotif ? ` · ${formatFR(a.dateMotif)}` : ''}
        <br />
        Relance {formatFR(next)}
        {overdue ? ' ⚠' : ''}
      </p>
    );
  }
  return (
    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-900">
      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
      <div>
        <p className="font-semibold">{a.motifSuspension ?? 'Affaire bloquée'}</p>
        <p>
          Depuis {a.dateMotif ? formatFR(a.dateMotif) : '—'} · relance auto tous les 15 j
          (prochaine {formatFR(next)}
          {overdue ? ' — due' : ''})
        </p>
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
