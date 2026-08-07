'use client';

import { useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useApp } from '@/context/AppStateContext';
import { todayISO, addDays } from '@/lib/dates';
import type { NotaPriorite } from '@/lib/domain/types';

/**
 * Création de nota en deux clics (FAB) — accessible depuis n'importe quel écran, y compris mobile.
 * Clic 1 : ouvrir · Clic 2 : enregistrer.
 */
export function QuickNotaFab() {
  const { user, state, createNota } = useApp();
  const [open, setOpen] = useState(false);
  const [objet, setObjet] = useState('');
  const [echeance, setEcheance] = useState(addDays(todayISO(), 1));
  const [responsableId, setResponsableId] = useState(user?.id ?? '');
  const [priorite, setPriorite] = useState<NotaPriorite>('normale');
  const [entiteType, setEntiteType] = useState<'affaire' | 'facture' | 'commande' | 'contrat'>(
    'affaire',
  );
  const [entiteId, setEntiteId] = useState('');
  const [error, setError] = useState('');

  const options = useMemo(() => {
    if (entiteType === 'affaire') {
      return state.affaires
        .filter((a) => !a.archived)
        .map((a) => {
          const d = state.devis.find((x) => x.id === a.devisId);
          return { id: a.id, label: d?.numeroBatappli ?? a.id };
        });
    }
    if (entiteType === 'facture') {
      return state.factures
        .filter((f) => !f.archived)
        .map((f) => ({ id: f.id, label: f.numero }));
    }
    if (entiteType === 'commande') {
      return state.commandes.map((c) => ({
        id: c.id,
        label: `${c.type} — ${c.fournisseur}`,
      }));
    }
    return state.contrats
      .filter((c) => !c.archived)
      .map((c) => {
        const imm = state.immeubles.find((i) => i.id === c.immeubleId);
        return { id: c.id, label: imm ? `${imm.adresse}, ${imm.ville}` : c.id };
      });
  }, [entiteType, state]);

  if (!user) return null;

  function reset() {
    setObjet('');
    setEcheance(addDays(todayISO(), 1));
    setResponsableId(user!.id);
    setPriorite('normale');
    setEntiteType('affaire');
    setEntiteId('');
    setError('');
  }

  function submit() {
    if (!objet.trim()) {
      setError('Saisissez un objet.');
      return;
    }
    if (!entiteId) {
      setError('Choisissez une entité liée.');
      return;
    }
    createNota({
      objet: objet.trim(),
      echeance,
      responsableId: responsableId || user!.id,
      priorite,
      entiteLiee: `${entiteType}:${entiteId}`,
    });
    reset();
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          reset();
          setResponsableId(user.id);
          setOpen(true);
        }}
        className="fixed bottom-5 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--navy)] text-white shadow-lg transition hover:scale-105 active:scale-95 sm:bottom-8 sm:right-8"
        title="Nouveau nota"
        aria-label="Créer un nota"
      >
        <Plus size={28} strokeWidth={2.5} />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div
            role="dialog"
            aria-modal
            aria-labelledby="quick-nota-title"
            className="max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:max-w-md sm:rounded-2xl sm:p-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 id="quick-nota-title" className="text-lg font-bold text-[var(--navy)]">
                Nouveau nota
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Fermer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">
                Objet
                <input
                  autoFocus
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base"
                  value={objet}
                  onChange={(e) => setObjet(e.target.value)}
                  placeholder="Ex. Relancer le syndic pour l'acompte"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-medium text-slate-700">
                  Échéance
                  <input
                    type="date"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5"
                    value={echeance}
                    onChange={(e) => setEcheance(e.target.value)}
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Priorité
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5"
                    value={priorite}
                    onChange={(e) => setPriorite(e.target.value as NotaPriorite)}
                  >
                    <option value="basse">Basse</option>
                    <option value="normale">Normale</option>
                    <option value="haute">Haute</option>
                    <option value="bloquante">Bloquante</option>
                  </select>
                </label>
              </div>

              <label className="block text-sm font-medium text-slate-700">
                Responsable
                <select
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5"
                  value={responsableId}
                  onChange={(e) => setResponsableId(e.target.value)}
                >
                  {state.utilisateurs
                    .filter((u) => u.actif)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nom}
                      </option>
                    ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-medium text-slate-700">
                  Type d&apos;entité
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5"
                    value={entiteType}
                    onChange={(e) => {
                      setEntiteType(e.target.value as typeof entiteType);
                      setEntiteId('');
                    }}
                  >
                    <option value="affaire">Affaire</option>
                    <option value="contrat">Contrat</option>
                    <option value="facture">Facture</option>
                    <option value="commande">Commande</option>
                  </select>
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Entité liée
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5"
                    value={entiteId}
                    onChange={(e) => setEntiteId(e.target.value)}
                  >
                    <option value="">— Choisir —</option>
                    {options.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-lg border border-slate-300 py-3 font-medium text-slate-700"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={submit}
                  className="flex-1 rounded-lg bg-[var(--navy)] py-3 font-semibold text-white"
                >
                  Créer
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
