'use client';

import { useState } from 'react';
import type { ActionItem } from '@/lib/types';
import { formatDoneDate, formatFR, isOverdue } from '@/lib/dates';
import { useApp } from '@/context/AppStateContext';

export function ActionChecklist({
  chantierId,
  actions,
}: {
  chantierId: string;
  actions: ActionItem[];
}) {
  const { toggleAction, addAction } = useApp();
  const [label, setLabel] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {actions.map((a) => {
          const late = !a.done && isOverdue(a.dueDate);
          return (
            <li
              key={a.id}
              className={`flex items-start gap-3 rounded-xl border px-3 py-3.5 ${
                a.done
                  ? 'border-emerald-200 bg-[var(--ok-bg)]'
                  : late
                    ? 'border-red-200 bg-[var(--danger-bg)]'
                    : 'border-slate-200 bg-white'
              }`}
            >
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
                  {late ? (
                    <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      En retard
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  Échéance : {formatFR(a.dueDate)}
                </p>
                {a.done && a.doneAt ? (
                  <p className="mt-1 text-sm font-medium text-emerald-800">
                    Fait le {formatDoneDate(a.doneAt)}
                    {a.doneBy ? ` par ${a.doneBy}` : ''}
                  </p>
                ) : null}
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
            addAction(chantierId, label, dueDate);
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
    </div>
  );
}
