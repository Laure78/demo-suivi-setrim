'use client';

import { useRef, useState } from 'react';
import type { ActionItem, UserId } from '@/lib/types';
import { formatDoneDate, formatFR, isOverdue } from '@/lib/dates';
import { useApp } from '@/context/AppStateContext';
import { fileToCompressedDataUrl, isEscalated } from '@/lib/chantier-helpers';
import { getUser, USERS } from '@/lib/users';
import { Camera, X } from 'lucide-react';

export function ActionChecklist({
  chantierId,
  actions,
}: {
  chantierId: string;
  actions: ActionItem[];
}) {
  const { toggleAction, addAction, addActionPhoto, removeActionPhoto, activeUserId } =
    useApp();
  const [label, setLabel] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assigneeId, setAssigneeId] = useState<UserId>(activeUserId);
  const [open, setOpen] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  async function onPickPhoto(actionId: string, file: File | undefined) {
    if (!file || !file.type.startsWith('image/')) return;
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      addActionPhoto(chantierId, actionId, dataUrl);
    } catch {
      alert('Impossible d’ajouter cette photo.');
    }
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {actions.map((a) => {
          const late = !a.done && isOverdue(a.dueDate);
          const escalated = isEscalated(a);
          const assignee = getUser(a.assigneeId);
          return (
            <li
              key={a.id}
              className={`rounded-xl border px-3 py-3.5 ${
                a.done
                  ? 'border-emerald-200 bg-[var(--ok-bg)]'
                  : escalated
                    ? 'border-purple-300 bg-purple-50'
                    : late
                      ? 'border-red-200 bg-[var(--danger-bg)]'
                      : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="checkbox-lg mt-0.5"
                  checked={a.done}
                  onChange={() => toggleAction(chantierId, a.id)}
                  aria-label={a.label}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className={`text-base font-semibold ${
                        a.done
                          ? 'text-emerald-900 line-through decoration-emerald-700/50'
                          : 'text-slate-900'
                      }`}
                    >
                      {a.label}
                    </p>
                    {escalated ? (
                      <span className="rounded-full bg-purple-700 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                        Escalade
                      </span>
                    ) : late ? (
                      <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                        En retard
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    Échéance : {formatFR(a.dueDate)} · Responsable :{' '}
                    <strong>{assignee.name}</strong>
                  </p>
                  {a.done && a.doneAt ? (
                    <p className="mt-1 text-sm font-medium text-emerald-800">
                      Fait le {formatDoneDate(a.doneAt)}
                      {a.doneBy ? ` par ${a.doneBy}` : ''}
                    </p>
                  ) : null}

                  {/* Photos */}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {(a.photos ?? []).map((ph) => (
                      <div key={ph.id} className="group relative">
                        <button
                          type="button"
                          className="block overflow-hidden rounded-lg border border-slate-200"
                          onClick={() => setLightbox(ph.dataUrl)}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={ph.dataUrl}
                            alt="Photo action"
                            className="h-14 w-14 object-cover"
                          />
                        </button>
                        <button
                          type="button"
                          className="absolute -right-1.5 -top-1.5 rounded-full bg-slate-800 p-0.5 text-white opacity-80"
                          onClick={() => removeActionPhoto(chantierId, a.id, ph.id)}
                          aria-label="Supprimer la photo"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      ref={(el) => {
                        fileRefs.current[a.id] = el;
                      }}
                      onChange={(e) => {
                        onPickPhoto(a.id, e.target.files?.[0]);
                        e.target.value = '';
                      }}
                    />
                    <button
                      type="button"
                      className="btn-secondary px-3 py-2 text-xs"
                      onClick={() => fileRefs.current[a.id]?.click()}
                    >
                      <Camera size={14} />
                      Photo
                    </button>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {!open ? (
        <button
          type="button"
          className="btn-secondary w-full sm:w-auto"
          onClick={() => setOpen(true)}
        >
          + Ajouter une action
        </button>
      ) : (
        <form
          className="card space-y-3 border-[var(--navy)]/20 bg-[var(--navy-soft)]"
          onSubmit={(e) => {
            e.preventDefault();
            if (!label.trim() || !dueDate) return;
            addAction(chantierId, label, dueDate, assigneeId);
            setLabel('');
            setDueDate('');
            setOpen(false);
          }}
        >
          <p className="text-sm font-bold text-[var(--navy)]">Nouvelle action</p>
          <input
            className="input"
            placeholder="Libellé (ex. Relance fournisseur)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
          />
          <label className="block text-sm text-slate-700">
            Échéance
            <input
              type="date"
              className="input mt-1"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm text-slate-700">
            Responsable
            <select
              className="input mt-1"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value as UserId)}
            >
              {USERS.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn-primary">
              Enregistrer
            </button>
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
              Annuler
            </button>
          </div>
        </form>
      )}

      {lightbox ? (
        <button
          type="button"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
          aria-label="Fermer"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="Aperçu"
            className="max-h-[90dvh] max-w-full rounded-xl object-contain"
          />
        </button>
      ) : null}
    </div>
  );
}
