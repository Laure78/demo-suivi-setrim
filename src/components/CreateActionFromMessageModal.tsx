'use client';

import { useMemo, useState } from 'react';
import { useApp } from '@/context/AppStateContext';
import { todayISO, addDays } from '@/lib/dates';
import { getDevis, getImmeuble } from '@/lib/domain/lookups';
import type { ActionPriorite, Message } from '@/lib/domain/types';
import { ROLE_LABELS } from '@/lib/domain/types';
import { ListTodo, X } from 'lucide-react';

const PRIORITES: { id: ActionPriorite; label: string }[] = [
  { id: 'basse', label: 'Basse' },
  { id: 'normale', label: 'Normale' },
  { id: 'haute', label: 'Haute' },
  { id: 'bloquante', label: 'Bloquante' },
];

export function CreateActionFromMessageModal({
  message,
  onClose,
}: {
  message: Message;
  onClose: () => void;
}) {
  const { state, user, createActionFromMessage } = useApp();
  const defaultAffaire =
    message.affaireId && state.affaires.some((a) => a.id === message.affaireId)
      ? message.affaireId
      : message.threadId.startsWith('aff-')
        ? message.threadId
        : '';

  const [libelle, setLibelle] = useState(
    message.corps.trim() || 'Action depuis message',
  );
  const [echeance, setEcheance] = useState(addDays(todayISO(), 2));
  const [assigneeId, setAssigneeId] = useState(
    user?.id === message.auteurId
      ? state.utilisateurs.find((u) => u.id !== user.id)?.id ?? user?.id ?? ''
      : message.auteurId,
  );
  const [affaireId, setAffaireId] = useState(defaultAffaire);
  const [priorite, setPriorite] = useState<ActionPriorite>(
    message.isImportant ? 'haute' : 'normale',
  );
  const [doneId, setDoneId] = useState<string | null>(null);

  const affairesOptions = useMemo(
    () =>
      state.affaires
        .filter((a) =>
          ['PORTEFEUILLE', 'PLANIFIE', 'EN_COURS', 'SUSPENDU', 'TERMINE'].includes(
            a.statut,
          ),
        )
        .map((a) => {
          const d = getDevis(state, a.devisId);
          const imm = getImmeuble(state, a.immeubleId);
          return {
            id: a.id,
            label: `${d?.numeroBatappli ?? a.id} — ${imm?.adresse ?? ''}`,
          };
        }),
    [state],
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!libelle.trim() || !assigneeId) return;
    const id = createActionFromMessage({
      messageId: message.id,
      libelle: libelle.trim(),
      echeance,
      assigneeId,
      affaireId: affaireId || undefined,
      priorite,
    });
    if (id) setDoneId(id);
  }

  if (doneId) {
    return (
      <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center">
        <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
          <p className="font-bold text-emerald-800">Action créée</p>
          <p className="mt-2 text-sm text-slate-600">
            Elle apparaît chez la personne assignée
            {affaireId ? ' et dans la check-list du chantier' : ''}.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href={`/mes-actions?action=${encodeURIComponent(doneId)}`} className="btn-primary">
              Voir l’action
            </a>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Fermer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
        role="dialog"
        aria-labelledby="create-action-title"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3">
          <h2 id="create-action-title" className="flex items-center gap-2 font-bold text-[var(--navy)]">
            <ListTodo size={18} />
            Créer une action
          </h2>
          <button type="button" className="rounded-lg p-2 hover:bg-slate-100" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3 px-4 py-4">
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Depuis le message : « {message.corps.slice(0, 140) || 'Photo / pièce jointe'}
            {message.corps.length > 140 ? '…' : ''} »
          </p>

          <label className="block text-sm">
            <span className="mb-1 block font-medium">Libellé</span>
            <input
              className="input"
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
              required
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium">Échéance</span>
            <input
              type="date"
              className="input"
              value={echeance}
              onChange={(e) => setEcheance(e.target.value)}
              required
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium">Personne assignée</span>
            <select
              className="input"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              required
            >
              {state.utilisateurs
                .filter((u) => u.actif)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nom} — {ROLE_LABELS[u.role]}
                  </option>
                ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium">
              Chantier rattaché <span className="font-normal text-slate-400">(facultatif)</span>
            </span>
            <select
              className="input"
              value={affaireId}
              onChange={(e) => setAffaireId(e.target.value)}
            >
              <option value="">— Aucun —</option>
              {affairesOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium">Priorité</span>
            <select
              className="input"
              value={priorite}
              onChange={(e) => setPriorite(e.target.value as ActionPriorite)}
            >
              {PRIORITES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex gap-2 pt-2 pb-2">
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn-primary flex-1">
              Créer l’action
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
