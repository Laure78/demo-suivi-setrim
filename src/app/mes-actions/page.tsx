'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { MessageSquare, Building2 } from 'lucide-react';
import { useApp } from '@/context/AppStateContext';
import { formatFR, formatShortDateTime, todayISO } from '@/lib/dates';
import { getDevis, getImmeuble } from '@/lib/domain/lookups';
import { ROLE_LABELS } from '@/lib/domain/types';

function MesActionsInner() {
  const { state, user, toggleAction } = useApp();
  const searchParams = useSearchParams();
  const highlight = searchParams.get('action');

  const mine = useMemo(() => {
    if (!user) return [];
    return (state.actions ?? [])
      .filter((a) => a.assigneeId === user.id)
      .sort((a, b) => {
        if (a.statut !== b.statut) return a.statut === 'OUVERT' ? -1 : 1;
        return a.echeance.localeCompare(b.echeance);
      });
  }, [state.actions, user]);

  if (!user) return null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-[var(--navy)] sm:text-2xl">Mes actions</h1>
        <p className="mt-1 text-sm text-slate-600">
          Actions qui vous sont assignées — y compris celles créées depuis la messagerie.
        </p>
      </div>

      {mine.length === 0 ? (
        <div className="card text-sm text-slate-500">
          Aucune action pour le moment. Créez-en une depuis un message (« Créer une action »).
        </div>
      ) : (
        <ul className="space-y-2">
          {mine.map((a) => {
            const late = a.statut === 'OUVERT' && a.echeance < todayISO();
            const msg = a.messageId
              ? state.messages.find((m) => m.id === a.messageId)
              : undefined;
            const affaire = a.affaireId
              ? state.affaires.find((x) => x.id === a.affaireId)
              : undefined;
            const devis = affaire ? getDevis(state, affaire.devisId) : undefined;
            const imm = affaire ? getImmeuble(state, affaire.immeubleId) : undefined;
            const creeur = state.utilisateurs.find((u) => u.id === a.creePar);
            const highlighted = highlight === a.id;

            return (
              <li
                id={`action-${a.id}`}
                key={a.id}
                className={`card flex flex-col gap-3 sm:flex-row sm:items-start ${
                  highlighted ? 'ring-2 ring-[var(--navy)]' : ''
                } ${late ? 'border-red-300 bg-red-50' : ''} ${
                  a.statut === 'FAIT' ? 'opacity-70' : ''
                }`}
              >
                <input
                  type="checkbox"
                  className="checkbox-lg mt-0.5"
                  checked={a.statut === 'FAIT'}
                  onChange={() => toggleAction(a.id)}
                  aria-label={a.libelle}
                />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p
                    className={`font-semibold ${
                      a.statut === 'FAIT' ? 'line-through text-slate-500' : ''
                    }`}
                  >
                    {a.libelle}
                  </p>
                  <p className="text-xs text-slate-500">
                    Échéance {formatFR(a.echeance)} · Priorité {a.priorite}
                    {creeur ? ` · Créée par ${creeur.nom}` : ''}
                    {a.dateFait
                      ? ` · Faite le ${formatShortDateTime(a.dateFait)}`
                      : ''}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {msg ? (
                      <Link
                        href={`/messagerie?thread=${encodeURIComponent(msg.threadId)}&msg=${encodeURIComponent(msg.id)}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                      >
                        <MessageSquare size={14} />
                        Voir le message d’origine
                      </Link>
                    ) : null}
                    {affaire ? (
                      <Link
                        href={`/affaires/${affaire.id}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2.5 py-1.5 text-xs font-semibold text-sky-900 hover:bg-sky-100"
                      >
                        <Building2 size={14} />
                        {devis?.numeroBatappli ?? 'Chantier'}
                        {imm ? ` — ${imm.adresse}` : ''}
                      </Link>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-xs text-slate-500">
        Connecté en tant que {user.nom} ({ROLE_LABELS[user.role]}). Changez de profil dans « Je
        suis » pour voir les actions d’un collègue.
      </p>
    </div>
  );
}

export default function MesActionsPage() {
  return (
    <Suspense fallback={<div className="card text-sm text-slate-500">Chargement…</div>}>
      <MesActionsInner />
    </Suspense>
  );
}
