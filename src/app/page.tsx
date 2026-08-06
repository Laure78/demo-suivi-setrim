'use client';

import { useMemo } from 'react';
import { useApp } from '@/context/AppStateContext';
import { AlertsPanel } from '@/components/AlertsPanel';
import { ChantierCard } from '@/components/ChantierCard';
import { buildDashboardAlerts, getChantierStatus } from '@/lib/chantier-helpers';

export default function DashboardPage() {
  const { state } = useApp();

  const alerts = useMemo(
    () => buildDashboardAlerts(state.chantiers, state.contrats, state.messages),
    [state.chantiers, state.contrats, state.messages],
  );

  const { enCours, programmes } = useMemo(() => {
    const en = state.chantiers.filter((c) => getChantierStatus(c) === 'en_cours');
    const prog = state.chantiers.filter((c) => getChantierStatus(c) === 'programme');
    return { enCours: en, programmes: prog };
  }, [state.chantiers]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[var(--navy)] sm:text-2xl">
          Tableau de bord
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Ce qu’il ne faut pas oublier aujourd’hui — retards en rouge, échéances
          sous 7 jours en orange.
        </p>
      </div>

      <AlertsPanel alerts={alerts} />

      <section>
        <h2 className="mb-3 text-lg font-bold text-[var(--navy)]">
          Chantiers en cours
          <span className="ml-2 text-sm font-medium text-slate-500">({enCours.length})</span>
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {enCours.map((c) => (
            <ChantierCard key={c.id} chantier={c} />
          ))}
          {enCours.length === 0 ? (
            <p className="text-sm text-slate-500">Aucun chantier en cours.</p>
          ) : null}
        </div>
      </section>

      {programmes.length > 0 ? (
        <section>
          <h2 className="mb-3 text-lg font-bold text-[var(--navy)]">
            Programmés
            <span className="ml-2 text-sm font-medium text-slate-500">({programmes.length})</span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {programmes.map((c) => (
              <ChantierCard key={c.id} chantier={c} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
