'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ArrowLeft, Paperclip } from 'lucide-react';
import { useApp } from '@/context/AppStateContext';
import {
  adresseCourte,
  getDevis,
  getImmeuble,
  getSyndicForImmeuble,
  joursConsommes,
} from '@/lib/domain/lookups';
import { formatFR, formatShortDateTime, todayISO } from '@/lib/dates';

type Tab =
  | 'checklist'
  | 'commandes'
  | 'factures'
  | 'notas'
  | 'messages'
  | 'docs'
  | 'journal';

export default function AffairePage() {
  const { id } = useParams<{ id: string }>();
  const { state, user, toggleChecklistItem, createNota, closeNota } = useApp();
  const [tab, setTab] = useState<Tab>('checklist');
  const [notaObjet, setNotaObjet] = useState('');

  const affaire = state.affaires.find((a) => a.id === id);
  const devis = affaire ? getDevis(state, affaire.devisId) : undefined;
  const imm = affaire ? getImmeuble(state, affaire.immeubleId) : undefined;
  const syndic = affaire ? getSyndicForImmeuble(state, affaire.immeubleId) : undefined;

  const items = useMemo(() => {
    if (!affaire?.checklistId) return [];
    return state.checklistItems
      .filter((i) => i.checklistId === affaire.checklistId)
      .sort((a, b) => a.echeance.localeCompare(b.echeance));
  }, [state.checklistItems, affaire]);

  if (!affaire || !devis) {
    return (
      <div className="card">
        <p>Affaire introuvable.</p>
        <Link href="/portefeuille" className="btn-secondary mt-3 inline-flex">
          Retour portefeuille
        </Link>
      </div>
    );
  }

  const conso = joursConsommes(state, affaire.id);
  const commandes = state.commandes.filter((c) => c.affaireId === affaire.id);
  const factures = state.factures.filter((f) => f.affaireId === affaire.id);
  const notas = state.notas.filter((n) => n.entiteLiee === `affaire:${affaire.id}`);
  const messages = state.messages.filter((m) => m.affaireId === affaire.id);
  const docs = state.documents.filter((d) => d.entiteLiee === `affaire:${affaire.id}`);
  const journal = state.journal.filter((j) => j.entite === `affaire:${affaire.id}`);
  const demandes = state.demandesPrix.filter((d) => d.affaireId === affaire.id);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'checklist', label: `Check-list (${items.filter((i) => i.fait).length}/${items.length})` },
    { id: 'commandes', label: `Commandes (${commandes.length})` },
    { id: 'factures', label: `Factures (${factures.length})` },
    { id: 'notas', label: `Notas (${notas.filter((n) => n.statut === 'OUVERT').length})` },
    { id: 'messages', label: `Discussion (${messages.length})` },
    { id: 'docs', label: `Documents (${docs.length})` },
    { id: 'journal', label: 'Journal' },
  ];

  return (
    <div className="space-y-4">
      <Link
        href="/portefeuille"
        className="inline-flex items-center gap-1 text-sm font-medium text-[var(--navy)]"
      >
        <ArrowLeft size={16} /> Portefeuille
      </Link>

      <div className="card space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">{devis.numeroBatappli} · {devis.type}</p>
            <h1 className="text-xl font-bold text-[var(--navy)] sm:text-2xl">
              {adresseCourte(imm)}
            </h1>
            <p className="mt-1 text-sm text-slate-700">
              Syndic : <strong>{syndic?.nom}</strong>
              {syndic?.telephone ? ` · ${syndic.telephone}` : ''}
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-800">
            {affaire.statut}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-3 text-sm">
            <p className="text-xs text-slate-500">Montant HT</p>
            <p className="text-lg font-bold">{devis.montantHT.toLocaleString('fr-FR')} €</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 text-sm">
            <p className="text-xs text-slate-500">Acompte</p>
            <p className="text-lg font-bold">
              {affaire.acompteRecu.toLocaleString('fr-FR')} /{' '}
              {affaire.acompteAttendu.toLocaleString('fr-FR')} €
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 text-sm">
            <p className="text-xs text-slate-500">Jours de charge</p>
            <p className="text-lg font-bold">
              {affaire.joursChargeEstimes ?? '—'}{' '}
              <span className="text-sm font-normal text-slate-500">estimés</span>
              <span className="ml-2 text-sm font-normal text-slate-500">/ {conso} conso</span>
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 text-sm">
            <p className="text-xs text-slate-500">Dernière action</p>
            <p className="text-lg font-bold">{formatFR(affaire.dateDerniereAction)}</p>
          </div>
        </div>

        {imm?.acces || imm?.notesTerrain ? (
          <p className="text-sm text-slate-600">
            {imm?.acces ? <span>Accès : {imm.acces}. </span> : null}
            {imm?.notesTerrain ? <span>Terrain : {imm.notesTerrain}</span> : null}
          </p>
        ) : null}
        {affaire.commentaire ? (
          <p className="text-sm italic text-slate-600">{affaire.commentaire}</p>
        ) : null}
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium ${
              tab === t.id
                ? 'bg-[var(--navy)] text-white'
                : 'bg-white text-slate-700 ring-1 ring-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'checklist' ? (
        <ul className="space-y-2">
          {items.map((it) => {
            const late = !it.fait && it.echeance < todayISO();
            return (
              <li
                key={it.id}
                className={`card flex items-start gap-3 ${
                  late ? 'border-red-300 bg-red-50' : it.fait ? 'opacity-70' : ''
                }`}
              >
                <input
                  type="checkbox"
                  className="checkbox-lg mt-0.5"
                  checked={it.fait}
                  onChange={() => toggleChecklistItem(it.id)}
                  aria-label={it.libelle}
                />
                <div className="min-w-0 flex-1">
                  <p className={`font-medium ${it.fait ? 'line-through text-slate-500' : ''}`}>
                    {it.libelle}
                    {it.obligatoire ? (
                      <span className="ml-2 text-[10px] font-bold uppercase text-red-600">
                        Obligatoire
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-slate-500">
                    Échéance {formatFR(it.echeance)}
                    {it.fait && it.dateFait
                      ? ` · Fait le ${formatShortDateTime(it.dateFait)} par ${it.faitPar}`
                      : null}
                  </p>
                </div>
                {it.pieceJointe ? <Paperclip size={16} className="text-slate-400" /> : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {tab === 'commandes' ? (
        <div className="space-y-3">
          <ul className="space-y-2">
            {commandes.map((c) => (
              <li key={c.id} className="card text-sm">
                <p className="font-bold">
                  {c.type} — {c.fournisseur}
                </p>
                <p>
                  Besoin {formatFR(c.dateBesoin)} · {c.statut} · {c.montant} €
                </p>
              </li>
            ))}
          </ul>
          {demandes.length > 0 ? (
            <div>
              <h3 className="mb-2 font-semibold">Demandes de prix</h3>
              <ul className="space-y-2">
                {demandes.map((d) => (
                  <li key={d.id} className="card text-sm">
                    <p className="font-bold">
                      {d.fournisseur} — {d.objet}
                    </p>
                    <p>
                      {formatFR(d.dateDemande)} · {d.statut}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === 'factures' ? (
        <ul className="space-y-2">
          {factures.length === 0 ? (
            <li className="card text-sm text-slate-500">Aucune facture.</li>
          ) : null}
          {factures.map((f) => (
            <li key={f.id} className="card text-sm">
              <p className="font-bold">
                {f.numero} · {f.type} · {f.statut}
              </p>
              <p>
                {formatFR(f.dateEmission)} · {f.montant.toLocaleString('fr-FR')} €
              </p>
            </li>
          ))}
        </ul>
      ) : null}

      {tab === 'notas' ? (
        <div className="space-y-3">
          <form
            className="card flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (!notaObjet.trim() || !user) return;
              createNota({
                objet: notaObjet.trim(),
                echeance: todayISO(),
                responsableId: user.id,
                priorite: 'normale',
                entiteLiee: `affaire:${affaire.id}`,
              });
              setNotaObjet('');
            }}
          >
            <input
              className="input flex-1"
              placeholder="Nouveau nota (2 clics)…"
              value={notaObjet}
              onChange={(e) => setNotaObjet(e.target.value)}
            />
            <button type="submit" className="btn-primary">
              Créer
            </button>
          </form>
          <ul className="space-y-2">
            {notas.map((n) => (
              <li key={n.id} className="card flex items-start justify-between gap-2 text-sm">
                <div>
                  <p className="font-semibold">{n.objet}</p>
                  <p className="text-xs text-slate-500">
                    {n.statut} · échéance {formatFR(n.echeance)} · {n.priorite}
                  </p>
                </div>
                {n.statut === 'OUVERT' ? (
                  <button
                    type="button"
                    className="btn-secondary py-2 text-xs"
                    onClick={() => closeNota(n.id)}
                  >
                    Fait
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {tab === 'messages' ? (
        <div className="space-y-2">
          <Link
            href={`/messagerie?thread=${encodeURIComponent(affaire.id)}`}
            className="btn-secondary inline-flex"
          >
            Ouvrir le fil WhatsApp
          </Link>
          {messages.map((m) => {
            const author = state.utilisateurs.find((u) => u.id === m.auteurId);
            return (
              <div key={m.id} className="card text-sm">
                <p className="font-semibold">
                  {author?.nom}{' '}
                  <span className="font-normal text-slate-500">
                    {formatShortDateTime(m.date)}
                  </span>
                </p>
                <p>{m.corps}</p>
              </div>
            );
          })}
        </div>
      ) : null}

      {tab === 'docs' ? (
        <ul className="space-y-2">
          {docs.length === 0 ? (
            <li className="card text-sm text-slate-500">Aucun document.</li>
          ) : null}
          {docs.map((d) => (
            <li key={d.id} className="card text-sm">
              {d.type} — {d.nomFichier} · {formatFR(d.date)}
            </li>
          ))}
        </ul>
      ) : null}

      {tab === 'journal' ? (
        <ul className="space-y-2">
          {journal.length === 0 ? (
            <li className="card text-sm text-slate-500">Aucune entrée.</li>
          ) : null}
          {journal.map((j) => {
            const u = state.utilisateurs.find((x) => x.id === j.utilisateurId);
            return (
              <li key={j.id} className="card text-sm">
                <p className="font-semibold">
                  {u?.nom} · {j.action}
                </p>
                <p className="text-xs text-slate-500">
                  {formatShortDateTime(j.horodatage)}
                  {j.valeurApres ? ` — ${j.valeurApres}` : ''}
                </p>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
