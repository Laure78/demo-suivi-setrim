'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Archive,
  ChevronDown,
  ChevronUp,
  GripVertical,
  History,
  ListPlus,
  Pencil,
  Plus,
  X,
} from 'lucide-react';
import { useApp } from '@/context/AppStateContext';
import { formatFR, formatShortDateTime, todayISO } from '@/lib/dates';
import { ROLE_LABELS, type ChecklistItem } from '@/lib/domain/types';

export function EditableChecklist({
  checklistId,
  affaireId,
}: {
  checklistId: string;
  affaireId: string;
}) {
  const {
    state,
    user,
    toggleChecklistItem,
    addChecklistItem,
    updateChecklistItem,
    reorderChecklistItems,
    archiveChecklistItem,
    restoreChecklistItem,
    addChecklistItemToModele,
  } = useApp();

  const [showArchived, setShowArchived] = useState(false);
  const [adding, setAdding] = useState(false);
  const [quickLabel, setQuickLabel] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const [archiveMotif, setArchiveMotif] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [modeleMsg, setModeleMsg] = useState('');

  const items = useMemo(() => {
    return state.checklistItems
      .filter((i) => i.checklistId === checklistId)
      .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
  }, [state.checklistItems, checklistId]);

  const active = items.filter((i) => !i.archived);
  const archived = items.filter((i) => i.archived);

  function submitQuickAdd(e?: React.FormEvent) {
    e?.preventDefault();
    if (!quickLabel.trim()) return;
    addChecklistItem({
      checklistId,
      libelle: quickLabel.trim(),
      echeance: todayISO(),
      obligatoire: false,
      assigneeId: user?.id,
    });
    setQuickLabel('');
    setAdding(false);
  }

  function onDrop(targetId: string) {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      return;
    }
    const ids = active.map((i) => i.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) {
      setDragId(null);
      return;
    }
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, dragId);
    reorderChecklistItems(checklistId, next);
    setDragId(null);
  }

  function move(itemId: string, dir: -1 | 1) {
    const ids = active.map((i) => i.id);
    const idx = ids.indexOf(itemId);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= ids.length) return;
    const next = [...ids];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    reorderChecklistItems(checklistId, next);
  }

  return (
    <div className="space-y-3">
      {/* Ajout mobile en 2 clics */}
      {!adding ? (
        <button
          type="button"
          className="btn-primary w-full sm:w-auto"
          onClick={() => setAdding(true)}
        >
          <Plus size={18} />
          Ajouter un item
        </button>
      ) : (
        <form
          onSubmit={submitQuickAdd}
          className="card flex flex-col gap-2 border-[var(--navy)] bg-[var(--navy-soft)] sm:flex-row sm:items-center"
        >
          <input
            className="input flex-1"
            autoFocus
            placeholder="Libellé de l’action…"
            value={quickLabel}
            onChange={(e) => setQuickLabel(e.target.value)}
          />
          <div className="flex gap-2">
            <button type="submit" className="btn-primary flex-1" disabled={!quickLabel.trim()}>
              OK
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setAdding(false);
                setQuickLabel('');
              }}
            >
              <X size={16} />
            </button>
          </div>
        </form>
      )}

      {modeleMsg ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{modeleMsg}</p>
      ) : null}

      <ul className="space-y-2">
        {active.map((it, index) => {
          const late = !it.fait && it.echeance < todayISO();
          const assignee = it.assigneeId
            ? state.utilisateurs.find((u) => u.id === it.assigneeId)
            : undefined;
          const editing = editId === it.id;
          const showHist = historyId === it.id;

          return (
            <li
              key={it.id}
              draggable
              onDragStart={() => setDragId(it.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(it.id)}
              className={`card ${late ? 'border-red-300 bg-red-50' : ''} ${
                it.fait ? 'opacity-80' : ''
              } ${dragId === it.id ? 'opacity-50' : ''}`}
            >
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  className="mt-1 cursor-grab touch-none text-slate-400 active:cursor-grabbing"
                  aria-label="Glisser pour réordonner"
                  title="Glisser pour réordonner"
                >
                  <GripVertical size={18} />
                </button>

                <input
                  type="checkbox"
                  className="checkbox-lg mt-0.5"
                  checked={it.fait}
                  onChange={() => toggleChecklistItem(it.id)}
                  aria-label={it.libelle}
                />

                <div className="min-w-0 flex-1 space-y-2">
                  {!editing ? (
                    <>
                      <p className={`font-medium ${it.fait ? 'line-through text-slate-500' : ''}`}>
                        {it.libelle}
                        {it.obligatoire ? (
                          <span className="ml-2 text-[10px] font-bold uppercase text-red-600">
                            Obligatoire
                          </span>
                        ) : null}
                        {it.manuel ? (
                          <span className="ml-2 rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-800">
                            Manuel
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-slate-500">
                        Échéance {formatFR(it.echeance)}
                        {assignee ? ` · ${assignee.nom}` : ''}
                        {it.fait && it.dateFait
                          ? ` · Fait le ${formatShortDateTime(it.dateFait)} par ${it.faitPar}`
                          : null}
                      </p>
                    </>
                  ) : (
                    <EditForm
                      item={it}
                      onCancel={() => setEditId(null)}
                      onSave={(patch) => {
                        updateChecklistItem(it.id, patch);
                        setEditId(null);
                      }}
                    />
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    {!editing ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700"
                        onClick={() => setEditId(it.id)}
                      >
                        <Pencil size={12} /> Modifier
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700"
                      onClick={() => setHistoryId(showHist ? null : it.id)}
                    >
                      <History size={12} /> Historique
                      {(it.history?.length ?? 0) > 0 ? ` (${it.history!.length})` : ''}
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 sm:hidden"
                      onClick={() => move(it.id, -1)}
                      disabled={index === 0}
                    >
                      <ChevronUp size={12} />
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 sm:hidden"
                      onClick={() => move(it.id, 1)}
                      disabled={index === active.length - 1}
                    >
                      <ChevronDown size={12} />
                    </button>
                    {it.manuel ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-800"
                        onClick={() => {
                          const res = addChecklistItemToModele(it.id);
                          setModeleMsg(
                            res.ok
                              ? `« ${it.libelle} » ajouté au modèle pour les futurs chantiers.`
                              : res.error ?? 'Échec',
                          );
                        }}
                      >
                        <ListPlus size={12} /> Ajouter cette action au modèle
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-900"
                      onClick={() => {
                        setArchiveId(it.id);
                        setArchiveMotif('');
                      }}
                    >
                      <Archive size={12} /> Archiver
                    </button>
                    {it.messageId ? (
                      <Link
                        href={`/messagerie?thread=${encodeURIComponent(
                          state.messages.find((m) => m.id === it.messageId)?.threadId ??
                            affaireId,
                        )}&msg=${encodeURIComponent(it.messageId)}`}
                        className="inline-flex text-[11px] font-semibold text-[var(--navy)] underline"
                      >
                        Message d’origine
                      </Link>
                    ) : null}
                  </div>

                  {showHist ? <HistoryPanel item={it} /> : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {archived.length > 0 ? (
        <div>
          <button
            type="button"
            className="text-sm font-semibold text-slate-600 underline"
            onClick={() => setShowArchived((v) => !v)}
          >
            {showArchived ? 'Masquer' : 'Voir'} les items archivés ({archived.length})
          </button>
          {showArchived ? (
            <ul className="mt-2 space-y-2">
              {archived.map((it) => (
                <li key={it.id} className="card opacity-70">
                  <p className="font-medium line-through">{it.libelle}</p>
                  <p className="text-xs text-slate-500">
                    Motif : {it.archiveMotif} · par {it.archivedBy}
                    {it.archivedAt ? ` le ${formatShortDateTime(it.archivedAt)}` : ''}
                  </p>
                  <button
                    type="button"
                    className="mt-2 text-xs font-semibold text-[var(--navy)] underline"
                    onClick={() => restoreChecklistItem(it.id)}
                  >
                    Restaurer
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {archiveId ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <form
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
            onSubmit={(e) => {
              e.preventDefault();
              if (!archiveMotif.trim()) return;
              archiveChecklistItem(archiveId, archiveMotif.trim());
              setArchiveId(null);
              setArchiveMotif('');
            }}
          >
            <h3 className="font-bold text-[var(--navy)]">Archiver l’item</h3>
            <p className="mt-1 text-sm text-slate-600">
              Pas de suppression définitive — indiquez le motif.
            </p>
            <textarea
              className="input mt-3 min-h-[80px]"
              required
              placeholder="Ex. : plus nécessaire suite à décision syndic"
              value={archiveMotif}
              onChange={(e) => setArchiveMotif(e.target.value)}
              autoFocus
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="btn-secondary flex-1"
                onClick={() => setArchiveId(null)}
              >
                Annuler
              </button>
              <button type="submit" className="btn-primary flex-1">
                Archiver
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function EditForm({
  item,
  onCancel,
  onSave,
}: {
  item: ChecklistItem;
  onCancel: () => void;
  onSave: (
    patch: Partial<
      Pick<ChecklistItem, 'libelle' | 'echeance' | 'obligatoire' | 'assigneeId'>
    >,
  ) => void;
}) {
  const { state } = useApp();
  const [libelle, setLibelle] = useState(item.libelle);
  const [echeance, setEcheance] = useState(item.echeance);
  const [obligatoire, setObligatoire] = useState(item.obligatoire);
  const [assigneeId, setAssigneeId] = useState(item.assigneeId ?? '');

  return (
    <form
      className="space-y-2 rounded-xl border border-slate-200 bg-white p-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          libelle: libelle.trim(),
          echeance,
          obligatoire,
          assigneeId: assigneeId || undefined,
        });
      }}
    >
      <input
        className="input py-2"
        value={libelle}
        onChange={(e) => setLibelle(e.target.value)}
        required
      />
      <input
        type="date"
        className="input py-2"
        value={echeance}
        onChange={(e) => setEcheance(e.target.value)}
        required
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={obligatoire}
          onChange={(e) => setObligatoire(e.target.checked)}
        />
        Obligatoire
      </label>
      <select
        className="input py-2"
        value={assigneeId}
        onChange={(e) => setAssigneeId(e.target.value)}
      >
        <option value="">— Non assigné —</option>
        {state.utilisateurs
          .filter((u) => u.actif)
          .map((u) => (
            <option key={u.id} value={u.id}>
              {u.nom} — {ROLE_LABELS[u.role]}
            </option>
          ))}
      </select>
      <div className="flex gap-2">
        <button type="button" className="btn-secondary flex-1 py-2" onClick={onCancel}>
          Annuler
        </button>
        <button type="submit" className="btn-primary flex-1 py-2">
          Enregistrer
        </button>
      </div>
    </form>
  );
}

function HistoryPanel({ item }: { item: ChecklistItem }) {
  const entries = item.history ?? [];
  if (!entries.length) {
    return <p className="text-xs text-slate-400">Aucun historique pour le moment.</p>;
  }
  return (
    <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto rounded-lg bg-slate-50 p-2 text-[11px] text-slate-600">
      {entries.map((h) => (
        <li key={h.id} className="border-b border-slate-100 pb-1 last:border-0">
          <span className="font-semibold text-slate-800">{h.userName}</span>
          {' · '}
          {formatShortDateTime(h.at)}
          {' — '}
          <span className="uppercase text-slate-400">{h.kind}</span>
          {': '}
          {h.detail}
          {h.kind === 'uncheck' && h.previousDateFait ? (
            <span className="block text-amber-800">
              Horodatage précédent conservé : {formatShortDateTime(h.previousDateFait)}
              {h.previousFaitPar ? ` par ${h.previousFaitPar}` : ''}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
