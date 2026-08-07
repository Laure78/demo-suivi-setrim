'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useApp } from '@/context/AppStateContext';
import { buildMesAlertes, type DayAlert } from '@/lib/domain/alerts';
import { roleHomeHint } from '@/lib/domain/permissions';
import { addDays, todayISO } from '@/lib/dates';
import { CheckCircle2, ChevronRight, Clock, X } from 'lucide-react';

function AlertList({
  title,
  items,
  empty,
  tone,
  onReport,
  onClose,
}: {
  title: string;
  items: DayAlert[];
  empty: string;
  tone: 'today' | 'late' | 'week';
  onReport: (a: DayAlert) => void;
  onClose: (a: DayAlert) => void;
}) {
  const styles = {
    today: 'border-sky-200 bg-sky-50',
    late: 'border-red-200 bg-red-50',
    week: 'border-amber-200 bg-amber-50',
  }[tone];
  const badge = {
    today: 'bg-sky-600',
    late: 'bg-red-600',
    week: 'bg-amber-600',
  }[tone];

  return (
    <section className={`card border ${styles}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-base font-bold text-slate-900 sm:text-lg">{title}</h2>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold text-white ${badge}`}>
          {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-slate-600">
          <CheckCircle2 size={16} className="text-emerald-600" />
          {empty}
        </p>
      ) : (
        <ul className="divide-y divide-black/5">
          {items.map((a) => (
            <li key={a.id} className="py-2">
              <div className="flex items-start gap-2">
                <Link
                  href={a.href}
                  className="flex min-w-0 flex-1 items-start gap-2 py-1 transition hover:opacity-80 active:opacity-70"
                >
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      a.priorite === 'bloquante'
                        ? 'bg-purple-700'
                        : a.priorite === 'haute'
                          ? 'bg-red-600'
                          : 'bg-slate-400'
                    }`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-slate-900">{a.title}</span>
                    <span className="block text-sm text-slate-600">{a.subtitle}</span>
                    {a.bloquePlanification ? (
                      <span className="mt-1 inline-block rounded bg-purple-100 px-1.5 py-0.5 text-[11px] font-semibold text-purple-800">
                        Bloque la planification
                      </span>
                    ) : null}
                  </span>
                  <ChevronRight size={18} className="mt-1 shrink-0 text-slate-400" />
                </Link>
              </div>
              <div className="ml-4 mt-1 flex flex-wrap gap-2">
                {a.type === 'AUTO' ? (
                  <button
                    type="button"
                    onClick={() => onReport(a)}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Clock size={12} />
                    Reporter
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => onClose(a)}
                  className="rounded-md border border-emerald-300 bg-white px-2 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-50"
                >
                  Fait
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function HomePage() {
  const { user, state, reportNota, closeNota } = useApp();
  const [reportTarget, setReportTarget] = useState<DayAlert | null>(null);
  const [motif, setMotif] = useState('');
  const [newDate, setNewDate] = useState(addDays(todayISO(), 7));
  const [reportError, setReportError] = useState('');

  const alerts = useMemo(
    () => (user ? buildMesAlertes(state, user.id) : []),
    [state, user],
  );

  const aujourdhui = alerts.filter((a) => a.bucket === 'aujourdhui');
  const retard = alerts.filter((a) => a.bucket === 'retard');
  const semaine = alerts.filter((a) => a.bucket === 'semaine');

  if (!user) return null;

  function openReport(a: DayAlert) {
    setReportTarget(a);
    setMotif('');
    setNewDate(addDays(todayISO(), 7));
    setReportError('');
  }

  function submitReport() {
    if (!reportTarget) return;
    if (!motif.trim()) {
      setReportError('Le motif de report est obligatoire.');
      return;
    }
    const res = reportNota(reportTarget.notaId, motif, newDate);
    if (!res.ok) {
      setReportError(res.error ?? 'Impossible de reporter.');
      return;
    }
    setReportTarget(null);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-[var(--navy)] sm:text-2xl">
          Mes alertes du jour
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Bonjour {user.nom}. {roleHomeHint(user.role)} Uniquement vos notas.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-1">
        <AlertList
          title="En retard"
          items={retard}
          empty="Rien en retard — bravo."
          tone="late"
          onReport={openReport}
          onClose={(a) => closeNota(a.notaId)}
        />
        <AlertList
          title="À faire aujourd'hui"
          items={aujourdhui}
          empty="Rien de prévu pour aujourd'hui."
          tone="today"
          onReport={openReport}
          onClose={(a) => closeNota(a.notaId)}
        />
        <AlertList
          title="Cette semaine"
          items={semaine}
          empty="Rien d'autre cette semaine."
          tone="week"
          onReport={openReport}
          onClose={(a) => closeNota(a.notaId)}
        />
      </div>

      {reportTarget ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div
            role="dialog"
            aria-modal
            className="w-full rounded-t-2xl bg-white p-4 shadow-xl sm:max-w-md sm:rounded-2xl sm:p-5"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--navy)]">Reporter l&apos;alerte</h2>
              <button
                type="button"
                onClick={() => setReportTarget(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Fermer"
              >
                <X size={20} />
              </button>
            </div>
            <p className="mb-3 text-sm text-slate-600">{reportTarget.title}</p>
            <label className="block text-sm font-medium text-slate-700">
              Motif de report <span className="text-red-600">*</span>
              <textarea
                autoFocus
                rows={3}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                placeholder="Obligatoire — pourquoi reporter ?"
              />
            </label>
            <label className="mt-3 block text-sm font-medium text-slate-700">
              Nouvelle échéance
              <input
                type="date"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </label>
            {reportError ? (
              <p className="mt-2 text-sm font-medium text-red-600">{reportError}</p>
            ) : null}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setReportTarget(null)}
                className="flex-1 rounded-lg border border-slate-300 py-3 font-medium"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={submitReport}
                className="flex-1 rounded-lg bg-[var(--navy)] py-3 font-semibold text-white"
              >
                Reporter
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
