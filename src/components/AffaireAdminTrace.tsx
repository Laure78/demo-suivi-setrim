'use client';

import Link from 'next/link';
import { FileText, Paperclip } from 'lucide-react';
import type {
  AuditEvent,
  Commande,
  DemandePrix,
  Facture,
  Nota,
  PersistedState,
} from '@/lib/domain/types';
import {
  COMMANDE_STATUT_LABEL,
  COMMANDE_TYPE_LABEL,
  commandeStatutClass,
  DP_STATUT_LABEL,
  dpStatutClass,
  FACTURE_STATUT_LABEL,
  FACTURE_TYPE_LABEL,
  factureStatutClass,
} from '@/lib/domain/admin-labels';
import { DEFAULT_COMMANDE_TYPE_LABELS } from '@/lib/domain/types';
import { daysUntil, formatFR, formatShortDateTime } from '@/lib/dates';

function Hist({ events }: { events?: AuditEvent[] }) {
  if (!events?.length) {
    return <p className="text-xs text-slate-400">Pas encore d’historique détaillé.</p>;
  }
  return (
    <ul className="mt-2 space-y-1 border-t border-slate-100 pt-2">
      {events.map((e) => (
        <li key={e.id} className="text-xs text-slate-600">
          <span className="font-semibold text-slate-800">{e.userName}</span>
          {' — '}
          <span>{e.action}</span>
          {e.detail ? <span className="text-slate-500"> : {e.detail}</span> : null}
          <span className="text-slate-400"> · {formatShortDateTime(e.at)}</span>
        </li>
      ))}
    </ul>
  );
}

function AlerteChip({ notas }: { notas: Nota[] }) {
  if (!notas.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {notas.map((n) => (
        <Link
          key={n.id}
          href="/"
          className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-800"
          title={n.objet}
        >
          Alerte · {n.priorite}
        </Link>
      ))}
    </div>
  );
}

export function AdminGlanceBar({
  factures,
  commandes,
  demandes,
}: {
  factures: Facture[];
  commandes: Commande[];
  demandes: DemandePrix[];
}) {
  const factureTotal = factures.reduce((s, f) => s + f.montant, 0);
  const regle = factures.filter((f) => f.statut === 'REGLEE');
  const enAttenteFac = factures.filter(
    (f) => f.statut === 'EMISE' || f.statut === 'RELANCEE' || f.statut === 'LITIGE',
  );
  const aPasser = commandes.filter((c) => c.statut === 'A_PASSER');
  const commandees = commandes.filter((c) => c.statut === 'COMMANDEE' || c.statut === 'LIVREE');
  const dpAttente = demandes.filter((d) => d.statut === 'ENVOYEE' || d.statut === 'RELANCEE');

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Facturé</p>
        <p className="mt-1 text-lg font-bold tabular-nums text-[var(--navy)]">
          {factureTotal.toLocaleString('fr-FR')} €
        </p>
        <p className="text-xs text-slate-600">
          {regle.length} réglée{regle.length > 1 ? 's' : ''}
          {enAttenteFac.length > 0 ? (
            <span className="font-semibold text-red-700">
              {' '}
              · {enAttenteFac.length} en attente
            </span>
          ) : (
            ' · rien en attente'
          )}
        </p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Commandé</p>
        <p className="mt-1 text-lg font-bold text-[var(--navy)]">
          {commandees.length}/{commandes.length}
        </p>
        <p className="text-xs text-slate-600">
          {aPasser.length > 0 ? (
            <span className="font-semibold text-amber-800">
              {aPasser.length} à passer
            </span>
          ) : (
            'Tout passé ou livré'
          )}
        </p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Demandes de prix</p>
        <p className="mt-1 text-lg font-bold text-[var(--navy)]">{demandes.length}</p>
        <p className="text-xs text-slate-600">
          {dpAttente.length > 0 ? (
            <span className="font-semibold text-sky-800">{dpAttente.length} en attente</span>
          ) : demandes.length === 0 ? (
            'Aucune'
          ) : (
            'Toutes traitées'
          )}
        </p>
      </div>
    </div>
  );
}

export function FacturesTraceList({
  factures,
  state,
  notas,
}: {
  factures: Facture[];
  state: PersistedState;
  notas: Nota[];
}) {
  if (factures.length === 0) {
    return <p className="card text-sm text-slate-500">Aucune facture.</p>;
  }
  return (
    <ul className="space-y-3">
      {factures.map((f) => {
        const linked = notas.filter(
          (n) =>
            n.statut === 'OUVERT' &&
            !n.archived &&
            (n.entiteLiee === `facture:${f.id}` || n.alertKey?.startsWith(`facture:${f.id}`)),
        );
        return (
          <li key={f.id} className="card text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-bold text-[var(--navy)]">
                  {f.numero}{' '}
                  <span className="font-medium text-slate-600">
                    · {FACTURE_TYPE_LABEL[f.type]}
                  </span>
                </p>
                <p className="mt-0.5 tabular-nums">
                  Émise le {formatFR(f.dateEmission)} ·{' '}
                  <strong>{f.montant.toLocaleString('fr-FR')} €</strong>
                </p>
              </div>
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-bold ${factureStatutClass(f.statut)}`}
              >
                {FACTURE_STATUT_LABEL[f.statut]}
              </span>
            </div>
            {f.dateReglement ? (
              <p className="mt-1 text-xs text-emerald-700">
                Réglée le {formatFR(f.dateReglement)}
              </p>
            ) : null}
            {f.fichierPdf ? (
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-600">
                <FileText size={12} /> PDF : {f.fichierPdf}
              </p>
            ) : (
              <p className="mt-1 text-xs text-amber-700">Pas de PDF joint</p>
            )}
            {f.creeParNom || f.createdAt ? (
              <p className="mt-1 text-xs text-slate-500">
                Créée par {f.creeParNom ?? state.utilisateurs.find((u) => u.id === f.creePar)?.nom ?? '?'}
                {f.createdAt ? ` · ${formatShortDateTime(f.createdAt)}` : ''}
              </p>
            ) : null}
            {f.relances.length > 0 ? (
              <div className="mt-2 rounded-lg bg-amber-50 px-2 py-1.5 text-xs">
                <p className="font-semibold text-amber-900">Historique des relances</p>
                <ul className="mt-1 space-y-0.5">
                  {f.relances.map((r, i) => (
                    <li key={`${f.id}-r-${i}`}>
                      Niveau {r.niveau} · {formatFR(r.date)}
                      {r.parNom ? ` · ${r.parNom}` : ''}
                      {r.commentaire ? ` — ${r.commentaire}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <Hist events={f.historique} />
            <AlerteChip notas={linked} />
          </li>
        );
      })}
    </ul>
  );
}

export function CommandesTraceList({
  commandes,
  state,
  notas,
  delaiJ3,
}: {
  commandes: Commande[];
  state: PersistedState;
  notas: Nota[];
  delaiJ3: number;
}) {
  const typeLabel = {
    ...COMMANDE_TYPE_LABEL,
    ...DEFAULT_COMMANDE_TYPE_LABELS,
    ...state.settings.commandeTypeLabels,
  };
  if (commandes.length === 0) {
    return <p className="card text-sm text-slate-500">Aucune commande.</p>;
  }
  return (
    <ul className="space-y-3">
      {commandes.map((c) => {
        const j = daysUntil(c.dateBesoin);
        const alerteJ3 = c.statut === 'A_PASSER' && j <= delaiJ3;
        const linked = notas.filter(
          (n) =>
            n.statut === 'OUVERT' &&
            !n.archived &&
            (n.entiteLiee === `commande:${c.id}` || n.alertKey === `commande:${c.id}`),
        );
        return (
          <li
            key={c.id}
            className={`card text-sm ${alerteJ3 ? 'border-amber-400 bg-amber-50/50' : ''}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-bold text-[var(--navy)]">
                  {typeLabel[c.type] ?? c.type} — {c.fournisseur}
                </p>
                <p className="mt-0.5 text-slate-700">
                  Besoin {formatFR(c.dateBesoin)}
                  {c.dateCommande ? ` · commandé le ${formatFR(c.dateCommande)}` : ''}
                  {' · '}
                  <strong>{c.montant.toLocaleString('fr-FR')} €</strong>
                </p>
              </div>
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-bold ${commandeStatutClass(c.statut)}`}
              >
                {COMMANDE_STATUT_LABEL[c.statut]}
              </span>
            </div>
            {alerteJ3 ? (
              <p className="mt-1 text-xs font-semibold text-amber-900">
                Alerte J-{delaiJ3} : date de besoin dans {j < 0 ? `${-j} j de retard` : `${j} j`}
              </p>
            ) : null}
            {c.bonCommande ? (
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-600">
                <Paperclip size={12} /> Bon de commande : {c.bonCommande}
              </p>
            ) : c.statut !== 'A_PASSER' ? (
              <p className="mt-1 text-xs text-amber-700">Pas de BC joint</p>
            ) : null}
            {c.creeParNom || c.createdAt ? (
              <p className="mt-1 text-xs text-slate-500">
                Saisie par {c.creeParNom ?? state.utilisateurs.find((u) => u.id === c.creePar)?.nom ?? '?'}
                {c.createdAt ? ` · ${formatShortDateTime(c.createdAt)}` : ''}
              </p>
            ) : null}
            <Hist events={c.historique} />
            <AlerteChip notas={linked} />
          </li>
        );
      })}
    </ul>
  );
}

export function DemandesPrixTraceList({
  demandes,
  state,
  notas,
}: {
  demandes: DemandePrix[];
  state: PersistedState;
  notas: Nota[];
}) {
  if (demandes.length === 0) {
    return <p className="card text-sm text-slate-500">Aucune demande de prix.</p>;
  }
  return (
    <ul className="space-y-3">
      {demandes.map((d) => {
        const linked = notas.filter(
          (n) =>
            n.statut === 'OUVERT' &&
            !n.archived &&
            (n.entiteLiee === `demandePrix:${d.id}` || n.alertKey === `dp:${d.id}`),
        );
        return (
          <li key={d.id} className="card text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-bold text-[var(--navy)]">{d.fournisseur}</p>
                <p className="text-slate-700">{d.objet}</p>
                <p className="mt-0.5 text-xs text-slate-600">
                  Envoi {formatFR(d.dateDemande)}
                  {d.dateReponse ? ` · réponse ${formatFR(d.dateReponse)}` : ''}
                  {d.montantRecu != null
                    ? ` · ${d.montantRecu.toLocaleString('fr-FR')} € reçu`
                    : ''}
                </p>
              </div>
              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${dpStatutClass(d.statut)}`}>
                {DP_STATUT_LABEL[d.statut]}
              </span>
            </div>
            {d.creeParNom || d.createdAt ? (
              <p className="mt-1 text-xs text-slate-500">
                Par {d.creeParNom ?? state.utilisateurs.find((u) => u.id === d.creePar)?.nom ?? '?'}
                {d.createdAt ? ` · ${formatShortDateTime(d.createdAt)}` : ''}
              </p>
            ) : null}
            <Hist events={d.historique} />
            <AlerteChip notas={linked} />
          </li>
        );
      })}
    </ul>
  );
}
