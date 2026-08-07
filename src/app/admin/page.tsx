'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/context/AppStateContext';
import { canAdmin } from '@/lib/domain/permissions';
import {
  DEFAULT_COLOR_CODES,
  DEFAULT_COMMANDE_TYPE_LABELS,
  ROLE_LABELS,
  type AlertDelais,
  type ChecklistModeleItem,
  type ColorCodes,
  type Role,
} from '@/lib/domain/types';
import { ActivityJournal } from '@/components/ActivityJournal';
import { formatFR } from '@/lib/dates';
import { Archive, RotateCcw } from 'lucide-react';

type Tab =
  | 'users'
  | 'delais'
  | 'modeles'
  | 'equipes'
  | 'refs'
  | 'archives'
  | 'journal';

const DELAI_LABELS: { key: keyof AlertDelais; label: string }[] = [
  { key: 'acompteNonRecu', label: 'Acompte non reçu' },
  { key: 'affaireDormante', label: 'Affaire dormante' },
  { key: 'suspensionRelance', label: 'Relance affaire suspendue' },
  { key: 'termineNonFacture', label: 'Terminé non facturé' },
  { key: 'factureImpaye1', label: 'Impayé — relance niveau 1' },
  { key: 'factureImpaye2', label: 'Impayé — relance niveau 2' },
  { key: 'factureImpaye3', label: 'Impayé — mise en demeure' },
  { key: 'passageCeJ45', label: 'CE à programmer J-45' },
  { key: 'passageCeJ15', label: 'CE à programmer J-15' },
  { key: 'ceAFacturer', label: 'CE réalisé non facturé' },
  { key: 'reconductionJ90', label: 'Reconduction / préavis J-90' },
  { key: 'commandeAvantBesoin', label: 'Commande avant date besoin' },
  { key: 'demandePrixSansReponse', label: 'Demande de prix sans réponse' },
];

const COLOR_LABELS: { key: keyof ColorCodes; label: string }[] = [
  { key: 'en_cours', label: 'En cours' },
  { key: 'divers', label: 'Divers' },
  { key: 'resine', label: 'Résine' },
  { key: 'nettoyage', label: 'Nettoyage' },
  { key: 'bloque', label: 'Bloqué' },
];

export default function AdminPage() {
  const {
    user,
    state,
    resetDemo,
    updateAlertDelai,
    updateUser,
    updateEquipe,
    updateChecklistModele,
    updateJoursFeries,
    updateColorCodes,
    updateCommandeTypeLabel,
    archiveAffaire,
    restoreAffaire,
    archiveContrat,
    restoreContrat,
  } = useApp();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('delais');
  const [ferieInput, setFerieInput] = useState('');
  const [archiveMotif, setArchiveMotif] = useState('');
  const [archiveTarget, setArchiveTarget] = useState<{
    kind: 'affaire' | 'contrat';
    id: string;
  } | null>(null);
  const [editingModele, setEditingModele] = useState<string | null>(null);

  useEffect(() => {
    if (user && !canAdmin(user)) router.replace('/');
  }, [user, router]);

  const colors = state.settings.colorCodes ?? DEFAULT_COLOR_CODES;
  const cmdLabels = {
    ...DEFAULT_COMMANDE_TYPE_LABELS,
    ...state.settings.commandeTypeLabels,
  };

  const archivedAffaires = useMemo(
    () => state.affaires.filter((a) => a.archived),
    [state.affaires],
  );
  const archivedContrats = useMemo(
    () => state.contrats.filter((c) => c.archived),
    [state.contrats],
  );

  if (!user || !canAdmin(user)) return null;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'delais', label: 'Délais alertes' },
    { id: 'users', label: 'Utilisateurs' },
    { id: 'modeles', label: 'Modèles check-list' },
    { id: 'equipes', label: 'Équipes' },
    { id: 'refs', label: 'Référentiels' },
    { id: 'archives', label: 'Archives' },
    { id: 'journal', label: 'Journal global' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-[var(--navy)] sm:text-2xl">Administration</h1>
        <p className="mt-1 text-sm text-slate-600">
          Accès Dirigeant & Responsable — aucun délai codé en dur, pas de suppression
          définitive (archivage uniquement).
        </p>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium ${
              tab === t.id
                ? 'bg-[var(--navy)] text-white'
                : 'bg-white text-slate-700 ring-1 ring-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'delais' ? (
        <section className="card space-y-3">
          <h2 className="font-bold">Tous les délais d&apos;alerte (jours)</h2>
          <p className="text-xs text-slate-500">
            Toute modification est prise en compte immédiatement par le moteur de notas (sans
            redéploiement).
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {DELAI_LABELS.map(({ key, label }) => (
              <li key={key} className="flex items-center justify-between gap-2 text-sm">
                <label htmlFor={key} className="min-w-0 flex-1">
                  {label}
                </label>
                <input
                  id={key}
                  type="number"
                  min={0}
                  className="input w-20 py-2 text-center"
                  value={state.settings.alertDelais[key]}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (!Number.isNaN(v) && v >= 0) updateAlertDelai(key, v);
                  }}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {tab === 'users' ? (
        <section className="card space-y-3">
          <h2 className="font-bold">Utilisateurs & rôles</h2>
          <ul className="divide-y">
            {state.utilisateurs.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center gap-2 py-3 text-sm">
                <div className="min-w-[10rem] flex-1">
                  <input
                    className="input w-full py-1.5 font-semibold"
                    defaultValue={u.nom}
                    onBlur={(e) => {
                      if (e.target.value.trim() && e.target.value !== u.nom) {
                        updateUser(u.id, { nom: e.target.value.trim() });
                      }
                    }}
                  />
                  <p className="mt-0.5 text-xs text-slate-500">{u.email}</p>
                </div>
                <select
                  className="rounded border border-slate-300 px-2 py-1.5"
                  value={u.role}
                  onChange={(e) => updateUser(u.id, { role: e.target.value as Role })}
                >
                  {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-1.5 text-xs">
                  <input
                    type="checkbox"
                    checked={u.actif}
                    onChange={(e) => updateUser(u.id, { actif: e.target.checked })}
                  />
                  Actif
                </label>
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500">
            Désactiver = archivage du compte (pas de suppression). Permissions admin : Dirigeant
            & Responsable uniquement.
          </p>
        </section>
      ) : null}

      {tab === 'modeles' ? (
        <section className="space-y-3">
          <h2 className="font-bold">Modèles de check-list par type de chantier</h2>
          {state.checklistModeles.map((m) => (
            <div key={m.id} className="card space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <input
                  className="input flex-1 font-semibold"
                  defaultValue={m.libelle}
                  onBlur={(e) => {
                    if (e.target.value.trim() && e.target.value !== m.libelle) {
                      updateChecklistModele(m.id, { libelle: e.target.value.trim() });
                    }
                  }}
                />
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase">
                  {m.typeChantier}
                </span>
                <button
                  type="button"
                  className="btn-secondary py-1 text-xs"
                  onClick={() =>
                    setEditingModele(editingModele === m.id ? null : m.id)
                  }
                >
                  {editingModele === m.id ? 'Fermer' : 'Éditer items'}
                </button>
              </div>
              {editingModele === m.id ? (
                <ModeleEditor
                  items={m.items}
                  onSave={(items) => updateChecklistModele(m.id, { items })}
                />
              ) : (
                <ol className="ml-4 list-decimal text-sm text-slate-600">
                  {m.items.map((it) => (
                    <li key={it.ordre}>
                      {it.libelle}
                      {it.obligatoire ? ' *' : ''} — J+{it.delaiJours}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ))}
        </section>
      ) : null}

      {tab === 'equipes' ? (
        <section className="space-y-3">
          <h2 className="font-bold">Équipes & compagnons</h2>
          {state.equipes.map((e) => (
            <div key={e.id} className="card space-y-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="color"
                  value={e.color}
                  onChange={(ev) =>
                    updateEquipe(e.id, {
                      color: ev.target.value,
                      bg: e.bg,
                    })
                  }
                  title="Couleur"
                />
                <input
                  className="input flex-1 font-semibold"
                  style={{ color: e.color }}
                  defaultValue={e.libelle}
                  onBlur={(ev) => {
                    if (ev.target.value.trim() && ev.target.value !== e.libelle) {
                      updateEquipe(e.id, { libelle: ev.target.value.trim() });
                    }
                  }}
                />
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={e.actif}
                    onChange={(ev) => updateEquipe(e.id, { actif: ev.target.checked })}
                  />
                  Active
                </label>
              </div>
              <label className="block text-xs text-slate-600">
                Compagnons (séparés par virgule)
                <textarea
                  className="input mt-1 w-full text-sm"
                  rows={2}
                  defaultValue={e.compagnons.join(', ')}
                  onBlur={(ev) => {
                    const list = ev.target.value
                      .split(',')
                      .map((x) => x.trim())
                      .filter(Boolean);
                    if (list.join(',') !== e.compagnons.join(',')) {
                      updateEquipe(e.id, { compagnons: list });
                    }
                  }}
                />
              </label>
            </div>
          ))}
          <p className="text-xs text-slate-500">
            Organisation : 5 bureau · 15 compagnons / chefs · 2 prestataires.
          </p>
        </section>
      ) : null}

      {tab === 'refs' ? (
        <div className="space-y-4">
          <section className="card space-y-3">
            <h2 className="font-bold">Types de commandes (libellés)</h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {Object.keys(DEFAULT_COMMANDE_TYPE_LABELS).map((t) => (
                <li key={t} className="flex items-center gap-2 text-sm">
                  <span className="w-28 text-xs font-bold text-slate-500">{t}</span>
                  <input
                    className="input flex-1 py-1.5"
                    value={cmdLabels[t] ?? t}
                    onChange={(e) => updateCommandeTypeLabel(t, e.target.value)}
                  />
                </li>
              ))}
            </ul>
          </section>

          <section className="card space-y-3">
            <h2 className="font-bold">Codes couleur portefeuille</h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {COLOR_LABELS.map(({ key, label }) => (
                <li key={key} className="flex items-center gap-2 text-sm">
                  <input
                    type="color"
                    value={colors[key]}
                    onChange={(e) => updateColorCodes({ [key]: e.target.value })}
                  />
                  <span className="font-medium">{label}</span>
                  <code className="text-xs text-slate-500">{colors[key]}</code>
                </li>
              ))}
            </ul>
          </section>

          <section className="card space-y-3">
            <h2 className="font-bold">Jours fériés</h2>
            <div className="flex flex-wrap gap-2">
              <input
                type="date"
                className="input py-2"
                value={ferieInput}
                onChange={(e) => setFerieInput(e.target.value)}
              />
              <button
                type="button"
                className="btn-primary py-2 text-sm"
                onClick={() => {
                  if (!ferieInput) return;
                  if (state.settings.joursFeries.includes(ferieInput)) return;
                  updateJoursFeries([...state.settings.joursFeries, ferieInput]);
                  setFerieInput('');
                }}
              >
                Ajouter
              </button>
            </div>
            <ul className="flex flex-wrap gap-2">
              {[...state.settings.joursFeries]
                .filter((d) => d.startsWith('2026') || d.startsWith('2025') || d.startsWith('2027'))
                .slice(0, 40)
                .map((d) => (
                  <li key={d}>
                    <button
                      type="button"
                      className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium hover:bg-red-100"
                      title="Retirer"
                      onClick={() =>
                        updateJoursFeries(state.settings.joursFeries.filter((x) => x !== d))
                      }
                    >
                      {formatFR(d)} ×
                    </button>
                  </li>
                ))}
            </ul>
            <p className="text-xs text-slate-500">
              {state.settings.joursFeries.length} jours en base — clic pour retirer (archivage
              logique de la date).
            </p>
          </section>
        </div>
      ) : null}

      {tab === 'archives' ? (
        <div className="space-y-4">
          <section className="card space-y-2">
            <h2 className="font-bold">Affaires actives — archiver</h2>
            <ul className="max-h-48 space-y-1 overflow-auto text-sm">
              {state.affaires
                .filter((a) => !a.archived)
                .slice(0, 20)
                .map((a) => {
                  const d = state.devis.find((x) => x.id === a.devisId);
                  return (
                    <li key={a.id} className="flex items-center justify-between gap-2">
                      <Link href={`/affaires/${a.id}`} className="text-[var(--navy)] underline">
                        {d?.numeroBatappli ?? a.id}
                      </Link>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-xs text-amber-800"
                        onClick={() => setArchiveTarget({ kind: 'affaire', id: a.id })}
                      >
                        <Archive size={12} /> Archiver
                      </button>
                    </li>
                  );
                })}
            </ul>
          </section>
          <section className="card space-y-2">
            <h2 className="font-bold">Archives affaires ({archivedAffaires.length})</h2>
            {archivedAffaires.length === 0 ? (
              <p className="text-sm text-slate-500">Aucune.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {archivedAffaires.map((a) => {
                  const d = state.devis.find((x) => x.id === a.devisId);
                  return (
                    <li key={a.id} className="flex justify-between gap-2">
                      <span>
                        {d?.numeroBatappli} — {a.archivedMotif}
                      </span>
                      <button
                        type="button"
                        className="text-xs font-semibold text-emerald-700"
                        onClick={() => restoreAffaire(a.id)}
                      >
                        Restaurer
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          <section className="card space-y-2">
            <h2 className="font-bold">Contrats CE — archiver / restaurer</h2>
            <ul className="space-y-1 text-sm">
              {state.contrats
                .filter((c) => !c.archived)
                .map((c) => (
                  <li key={c.id} className="flex justify-between">
                    <span>{c.id} · {c.commentaire || c.statut}</span>
                    <button
                      type="button"
                      className="text-xs text-amber-800"
                      onClick={() => setArchiveTarget({ kind: 'contrat', id: c.id })}
                    >
                      Archiver
                    </button>
                  </li>
                ))}
            </ul>
            {archivedContrats.map((c) => (
              <div key={c.id} className="flex justify-between text-sm text-slate-500">
                <span>{c.id} (archivé)</span>
                <button
                  type="button"
                  className="text-xs font-semibold text-emerald-700"
                  onClick={() => restoreContrat(c.id)}
                >
                  Restaurer
                </button>
              </div>
            ))}
          </section>
        </div>
      ) : null}

      {tab === 'journal' ? (
        <ActivityJournal
          entitePrefixes={[
            'affaire:',
            'settings:',
            'utilisateur:',
            'equipe:',
            'modele:',
            'contrat:',
            'facture:',
            'commande:',
            'import:',
          ]}
          title="Journal d’activité global"
          limit={80}
        />
      ) : null}

      <button
        type="button"
        className="btn-secondary inline-flex items-center gap-2"
        onClick={() => {
          if (confirm('Réinitialiser toute la démo ?')) resetDemo();
        }}
      >
        <RotateCcw size={14} />
        Réinitialiser la démo
      </button>

      {archiveTarget ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl">
            <h3 className="font-bold text-[var(--navy)]">Archiver — motif obligatoire</h3>
            <textarea
              className="input mt-3 w-full"
              rows={3}
              value={archiveMotif}
              onChange={(e) => setArchiveMotif(e.target.value)}
              placeholder="Motif…"
              autoFocus
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-lg border py-2"
                onClick={() => {
                  setArchiveTarget(null);
                  setArchiveMotif('');
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                className="flex-1 rounded-lg bg-amber-600 py-2 font-semibold text-white"
                onClick={() => {
                  if (!archiveMotif.trim()) return;
                  if (archiveTarget.kind === 'affaire') {
                    archiveAffaire(archiveTarget.id, archiveMotif);
                  } else {
                    archiveContrat(archiveTarget.id, archiveMotif);
                  }
                  setArchiveTarget(null);
                  setArchiveMotif('');
                }}
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ModeleEditor({
  items,
  onSave,
}: {
  items: ChecklistModeleItem[];
  onSave: (items: ChecklistModeleItem[]) => void;
}) {
  const [local, setLocal] = useState(items);

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
      {local.map((it, idx) => (
        <div key={idx} className="flex flex-wrap gap-2 text-xs">
          <input
            className="input flex-1 py-1"
            value={it.libelle}
            onChange={(e) => {
              const next = [...local];
              next[idx] = { ...it, libelle: e.target.value };
              setLocal(next);
            }}
          />
          <input
            type="number"
            className="input w-16 py-1"
            title="J+"
            value={it.delaiJours}
            onChange={(e) => {
              const next = [...local];
              next[idx] = { ...it, delaiJours: Number(e.target.value) || 0 };
              setLocal(next);
            }}
          />
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={it.obligatoire}
              onChange={(e) => {
                const next = [...local];
                next[idx] = { ...it, obligatoire: e.target.checked };
                setLocal(next);
              }}
            />
            *
          </label>
        </div>
      ))}
      <div className="flex gap-2">
        <button
          type="button"
          className="btn-secondary py-1 text-xs"
          onClick={() =>
            setLocal([
              ...local,
              {
                ordre: local.length + 1,
                libelle: 'Nouvel item',
                obligatoire: false,
                delaiJours: 0,
              },
            ])
          }
        >
          + Item
        </button>
        <button
          type="button"
          className="btn-primary py-1 text-xs"
          onClick={() =>
            onSave(local.map((it, i) => ({ ...it, ordre: i + 1 })))
          }
        >
          Enregistrer le modèle
        </button>
      </div>
    </div>
  );
}
