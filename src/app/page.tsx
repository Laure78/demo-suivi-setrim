'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useApp } from '@/context/AppStateContext';
import { buildMesAlertes, type DayAlert } from '@/lib/domain/alerts';
import { roleHomeHint } from '@/lib/domain/permissions';
import { CheckCircle2, ChevronRight } from 'lucide-react';

function AlertList({
  title,
  items,
  empty,
  tone,
}: {
  title: string;
  items: DayAlert[];
  empty: string;
  tone: 'today' | 'late' | 'week';
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
            <li key={a.id}>
              <Link
                href={a.href}
                className="flex items-start gap-2 py-3 transition hover:opacity-80 active:opacity-70"
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
                </span>
                <ChevronRight size={18} className="mt-1 shrink-0 text-slate-400" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function HomePage() {
  const { user, state } = useApp();
  const alerts = useMemo(
    () => (user ? buildMesAlertes(state, user.id) : []),
    [state, user],
  );

  const aujourdhui = alerts.filter((a) => a.bucket === 'aujourdhui');
  const retard = alerts.filter((a) => a.bucket === 'retard');
  const semaine = alerts.filter((a) => a.bucket === 'semaine');

  if (!user) return null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-[var(--navy)] sm:text-2xl">
          Mes alertes du jour
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Bonjour {user.nom}. {roleHomeHint(user.role)}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-1">
        <AlertList
          title="En retard"
          items={retard}
          empty="Rien en retard — bravo."
          tone="late"
        />
        <AlertList
          title="À faire aujourd'hui"
          items={aujourdhui}
          empty="Rien de prévu pour aujourd'hui."
          tone="today"
        />
        <AlertList
          title="Cette semaine"
          items={semaine}
          empty="Rien d'autre cette semaine."
          tone="week"
        />
      </div>
    </div>
  );
}
