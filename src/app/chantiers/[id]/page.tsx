'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { useApp } from '@/context/AppStateContext';
import { ActionChecklist } from '@/components/ActionChecklist';
import { ChantierJournal } from '@/components/ChantierJournal';
import { ProgressBar } from '@/components/ChantierCard';
import {
  chantierProgress,
  getChantierStatus,
  hasOverdue,
  statusLabel,
} from '@/lib/chantier-helpers';
import { getTeam } from '@/lib/users';
import { formatFR } from '@/lib/dates';
import { getTemplate } from '@/lib/checklist-template';

type Tab = 'checklist' | 'journal';

export default function ChantierPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const { getChantier, getJournal, state, activeUserId } = useApp();
  const chantier = getChantier(id);
  const [tab, setTab] = useState<Tab>('checklist');

  if (!chantier) {
    return (
      <div className="card space-y-3">
        <p className="font-semibold text-slate-800">Chantier introuvable</p>
        <Link href="/" className="btn-secondary inline-flex w-fit">
          ← Retour au tableau de bord
        </Link>
      </div>
    );
  }

  const { done, total, pct } = chantierProgress(chantier);
  const overdue = hasOverdue(chantier);
  const unread = state.unreadByUser[activeUserId]?.[chantier.id] ?? 0;
  const team = getTeam(chantier.teamId);
  const status = getChantierStatus(chantier);
  const template = getTemplate(chantier.templateId);
  const journal = getJournal(chantier.id);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 text-sm font-semibold">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[var(--navy)] hover:underline"
        >
          <ArrowLeft size={16} />
          Tableau de bord
        </Link>
        <Link href="/planning" className="text-slate-500 hover:underline">
          Planning
        </Link>
      </div>

      <header className="card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold text-[var(--navy)]">{chantier.title}</h2>
              {overdue ? (
                <span className="rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold uppercase text-white">
                  Retard
                </span>
              ) : null}
              <span
                className="rounded-full px-2.5 py-1 text-xs font-bold uppercase"
                style={{ background: team.bg, color: team.color }}
              >
                {team.shortLabel}
              </span>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${
                  status === 'en_cours'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {statusLabel(status)}
              </span>
            </div>
            <p className="mt-1 text-base text-slate-700">{chantier.client}</p>
            <p className="text-sm text-slate-500">{chantier.address}</p>
            <p className="mt-2 text-sm text-slate-600">
              {formatFR(chantier.startDate)} → {formatFR(chantier.endDate)}
              {' · '}
              Modèle : <strong>{template.label}</strong>
            </p>
            {chantier.devisNumero ? (
              <p className="mt-1 text-sm text-slate-600">
                Devis <strong>{chantier.devisNumero}</strong>
                {chantier.montantHT != null
                  ? ` · ${new Intl.NumberFormat('fr-FR', {
                      style: 'currency',
                      currency: 'EUR',
                    }).format(chantier.montantHT)} HT`
                  : null}
              </p>
            ) : null}
          </div>
          <p className="text-sm font-bold tabular-nums text-slate-700">
            {done}/{total} actions
          </p>
        </div>
        <div className="mt-4">
          <ProgressBar pct={pct} />
        </div>
        <div className="mt-4">
          <Link
            href={`/messagerie?thread=${encodeURIComponent(chantier.id)}`}
            className="btn-secondary relative inline-flex"
          >
            <MessageSquare size={16} />
            Ouvrir la discussion
            {unread > 0 ? (
              <span className="absolute -right-1.5 -top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unread}
              </span>
            ) : null}
          </Link>
        </div>
      </header>

      <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1">
        {(
          [
            { id: 'checklist' as const, label: 'Check-list' },
            { id: 'journal' as const, label: `Journal (${journal.length})` },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
              tab === t.id
                ? 'bg-[var(--navy)] text-white'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'checklist' ? (
        <section>
          <ActionChecklist chantierId={chantier.id} actions={chantier.actions} />
        </section>
      ) : (
        <section>
          <ChantierJournal entries={journal} />
        </section>
      )}
    </div>
  );
}
