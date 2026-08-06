'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppStateContext';
import { PlanningCalendar } from '@/components/PlanningCalendar';
import { ChantierCard } from '@/components/ChantierCard';
import { ImportDevisPanel } from '@/components/ImportDevisPanel';
import { getChantierStatus } from '@/lib/chantier-helpers';
import { TEAMS } from '@/lib/users';
import { CHECKLIST_TEMPLATES } from '@/lib/checklist-template';
import { addDays, todayISO } from '@/lib/dates';
import type { ChecklistTemplateId, TeamId } from '@/lib/types';

export default function PlanningPage() {
  const { state, createProgrammedChantier } = useApp();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [client, setClient] = useState('');
  const [address, setAddress] = useState('');
  const [startDate, setStartDate] = useState(addDays(todayISO(), 14));
  const [endDate, setEndDate] = useState(addDays(todayISO(), 28));
  const [teamId, setTeamId] = useState<TeamId>('equipe-a');
  const [templateId, setTemplateId] = useState<ChecklistTemplateId>('refection');

  const { enCours, programmes } = useMemo(() => {
    const en = state.chantiers.filter((c) => getChantierStatus(c) === 'en_cours');
    const prog = state.chantiers.filter((c) => getChantierStatus(c) === 'programme');
    return { enCours: en, programmes: prog };
  }, [state.chantiers]);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !client.trim() || !startDate || !endDate) return;
    if (endDate < startDate) {
      alert('La date de fin doit être après la date de début.');
      return;
    }
    const id = createProgrammedChantier({
      title,
      client,
      address: address || 'Adresse à préciser',
      startDate,
      endDate,
      teamId,
      templateId,
    });
    setOpen(false);
    setTitle('');
    setClient('');
    setAddress('');
    router.push(`/chantiers/${id}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[var(--navy)] sm:text-2xl">Planning</h2>
          <p className="mt-1 text-sm text-slate-600">
            Vue calendrier des chantiers — cliquez un bloc pour ouvrir la fiche.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary" onClick={() => setOpen((v) => !v)}>
            {open ? 'Fermer' : '+ Programmer un chantier'}
          </button>
        </div>
      </div>

      <ImportDevisPanel />

      {open ? (
        <form
          className="card space-y-3 border-[var(--navy)]/20 bg-[var(--navy-soft)]"
          onSubmit={handleCreate}
        >
          <p className="text-sm font-bold text-[var(--navy)]">
            Nouveau chantier — choisissez un modèle de check-list
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              Modèle de check-list
              <select
                className="input mt-1"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value as ChecklistTemplateId)}
              >
                {CHECKLIST_TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label} ({t.actions.length} actions)
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-slate-500">
                {CHECKLIST_TEMPLATES.find((t) => t.id === templateId)?.description}
              </span>
            </label>
            <label className="block text-sm">
              Titre
              <input
                className="input mt-1"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex. Toiture Martin"
                required
              />
            </label>
            <label className="block text-sm">
              Client
              <input
                className="input mt-1"
                value={client}
                onChange={(e) => setClient(e.target.value)}
                placeholder="Ex. SCI Martin"
                required
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              Adresse
              <input
                className="input mt-1"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Adresse du chantier"
              />
            </label>
            <label className="block text-sm">
              Début
              <input
                type="date"
                className="input mt-1"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </label>
            <label className="block text-sm">
              Fin
              <input
                type="date"
                className="input mt-1"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              Équipe
              <select
                className="input mt-1"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value as TeamId)}
              >
                {TEAMS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn-primary">
              Créer et ouvrir la fiche
            </button>
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
              Annuler
            </button>
          </div>
        </form>
      ) : null}

      <PlanningCalendar chantiers={state.chantiers} />

      <section className="space-y-3">
        <h3 className="text-lg font-bold text-[var(--navy)]">
          En cours
          <span className="ml-2 text-sm font-medium text-slate-500">({enCours.length})</span>
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {enCours.map((c) => (
            <ChantierCard key={c.id} chantier={c} />
          ))}
          {enCours.length === 0 ? (
            <p className="text-sm text-slate-500">Aucun chantier en cours.</p>
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-bold text-[var(--navy)]">
          Programmés
          <span className="ml-2 text-sm font-medium text-slate-500">({programmes.length})</span>
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {programmes.map((c) => (
            <ChantierCard key={c.id} chantier={c} />
          ))}
          {programmes.length === 0 ? (
            <p className="text-sm text-slate-500">Aucun chantier programmé.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
