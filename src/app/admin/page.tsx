'use client';

import { useApp } from '@/context/AppStateContext';
import { canAdmin, canEditAlertDelais } from '@/lib/domain/permissions';
import { ROLE_LABELS, type AlertDelais } from '@/lib/domain/types';
import { loadState, saveState } from '@/lib/domain/storage';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const DELAI_LABELS: { key: keyof AlertDelais; label: string }[] = [
  { key: 'acompteNonRecu', label: 'Acompte non reçu (jours)' },
  { key: 'affaireDormante', label: 'Affaire dormante' },
  { key: 'termineNonFacture', label: 'Terminé non facturé' },
  { key: 'factureImpaye1', label: 'Impayé relance 1' },
  { key: 'factureImpaye2', label: 'Impayé relance 2' },
  { key: 'factureImpaye3', label: 'Mise en demeure' },
  { key: 'commandeAvantBesoin', label: 'Commande avant date besoin' },
  { key: 'demandePrixSansReponse', label: 'Demande de prix sans réponse' },
  { key: 'passageCeJ45', label: 'CE à programmer J-45' },
  { key: 'ceAFacturer', label: 'CE à facturer' },
  { key: 'reconductionJ90', label: 'Reconduction / préavis J-90' },
];

export default function AdminPage() {
  const { user, state, resetDemo } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (user && !canAdmin(user)) router.replace('/');
  }, [user, router]);

  if (!user || !canAdmin(user)) return null;

  function updateDelai(key: keyof AlertDelais, value: number) {
    const s = loadState();
    s.settings.alertDelais = { ...s.settings.alertDelais, [key]: value };
    // Force via full state replace through reset pattern — use localStorage then reload
    // Better: expose updateSettings in context. Quick path:
    saveState({
      ...state,
      settings: {
        ...state.settings,
        alertDelais: { ...state.settings.alertDelais, [key]: value },
      },
    });
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--navy)] sm:text-2xl">Administration</h1>
        <p className="mt-1 text-sm text-slate-600">
          Utilisateurs, délais d’alerte, modèles — rien de codé en dur.
        </p>
      </div>

      <section className="card">
        <h2 className="mb-3 font-bold">Utilisateurs & rôles</h2>
        <ul className="divide-y">
          {state.utilisateurs.map((u) => (
            <li key={u.id} className="flex justify-between py-2 text-sm">
              <span>
                <strong>{u.nom}</strong> · {u.email}
              </span>
              <span className="text-slate-500">{ROLE_LABELS[u.role]}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-slate-500">
          Permissions : tout le monde lit tout. Seuls Dirigeant et Responsable
          paramètrent et suppriment.
        </p>
      </section>

      <section className="card">
        <h2 className="mb-3 font-bold">Équipes & compagnons</h2>
        <ul className="space-y-2">
          {state.equipes.map((e) => (
            <li key={e.id} className="text-sm">
              <strong style={{ color: e.color }}>{e.libelle}</strong>
              <span className="text-slate-600"> — {e.compagnons.join(', ')}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-slate-500">
          Organisation : 5 bureau · 15 compagnons / chefs de chantier · 2 prestataires.
        </p>
      </section>

      {canEditAlertDelais(user) ? (
        <section className="card">
          <h2 className="mb-3 font-bold">Délais d’alerte (paramétrables)</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {DELAI_LABELS.map(({ key, label }) => (
              <li key={key} className="flex items-center justify-between gap-2 text-sm">
                <label htmlFor={key}>{label}</label>
                <input
                  id={key}
                  type="number"
                  min={0}
                  className="input w-20 py-2 text-center"
                  defaultValue={state.settings.alertDelais[key]}
                  onBlur={(e) => {
                    const v = Number(e.target.value);
                    if (!Number.isNaN(v) && v !== state.settings.alertDelais[key]) {
                      updateDelai(key, v);
                    }
                  }}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="card">
        <h2 className="mb-3 font-bold">Modèles de check-list</h2>
        <ul className="space-y-3">
          {state.checklistModeles.map((m) => (
            <li key={m.id}>
              <p className="font-semibold">
                {m.libelle}{' '}
                <span className="text-xs font-normal text-slate-500">({m.typeChantier})</span>
              </p>
              <ol className="ml-4 list-decimal text-sm text-slate-600">
                {m.items.map((it) => (
                  <li key={it.ordre}>
                    {it.libelle}
                    {it.obligatoire ? ' *' : ''} — J+{it.delaiJours}
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ul>
      </section>

      <button type="button" className="btn-secondary" onClick={() => resetDemo()}>
        Réinitialiser toutes les données démo
      </button>
    </div>
  );
}
