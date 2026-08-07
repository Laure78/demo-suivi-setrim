'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '@/context/AppStateContext';
import { EditableChecklist } from '@/components/EditableChecklist';
import {
  AdminGlanceBar,
  CommandesTraceList,
  DemandesPrixTraceList,
  FacturesTraceList,
} from '@/components/AffaireAdminTrace';
import { ActivityJournal } from '@/components/ActivityJournal';
import {
  adresseCourte,
  getDevis,
  getImmeuble,
  getSyndicForImmeuble,
  joursConsommes,
} from '@/lib/domain/lookups';
import { canAdmin } from '@/lib/domain/permissions';
import { formatFR, formatShortDateTime, todayISO } from '@/lib/dates';

type Tab =
  | 'admin'
  | 'checklist'
  | 'commandes'
  | 'factures'
  | 'demandes'
  | 'notas'
  | 'messages'
  | 'docs'
  | 'journal';

export default function AffairePage() {
  const { id } = useParams<{ id: string }>();
  const {
    state,
    user,
    createNota,
    closeNota,
    reopenNota,
    archiveNota,
    updateNota,
    passerCommande,
    relancerFacture,
    relancerDemandePrix,
    addDocument,
    archiveAffaire,
    restoreAffaire,
  } = useApp();
  const [showArchiveAffaire, setShowArchiveAffaire] = useState(false);
  const [affaireArchiveMotif, setAffaireArchiveMotif] = useState('');
  const [tab, setTab] = useState<Tab>('admin');
  const [notaObjet, setNotaObjet] = useState('');
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const [archiveMotif, setArchiveMotif] = useState('');

  const affaire = state.affaires.find((a) => a.id === id);
  const devis = affaire ? getDevis(state, affaire.devisId) : undefined;
  const imm = affaire ? getImmeuble(state, affaire.immeubleId) : undefined;
  const syndic = affaire ? getSyndicForImmeuble(state, affaire.immeubleId) : undefined;

  const items = useMemo(() => {
    if (!affaire?.checklistId) return [];
    return state.checklistItems.filter(
      (i) => i.checklistId === affaire.checklistId && !i.archived,
    );
  }, [state.checklistItems, affaire]);

  const commandes = useMemo(
    () => state.commandes.filter((c) => c.affaireId === id),
    [state.commandes, id],
  );
  const factures = useMemo(
    () => state.factures.filter((f) => f.affaireId === id),
    [state.factures, id],
  );
  const demandes = useMemo(
    () => state.demandesPrix.filter((d) => d.affaireId === id),
    [state.demandesPrix, id],
  );
  const journalEntites = useMemo(
    () => [
      `affaire:${id}`,
      ...factures.map((f) => `facture:${f.id}`),
      ...commandes.map((c) => `commande:${c.id}`),
      ...demandes.map((d) => `demandePrix:${d.id}`),
    ],
    [id, factures, commandes, demandes],
  );

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
  const messages = state.messages.filter((m) => m.affaireId === affaire.id);
  const docs = state.documents.filter(
    (d) => d.entiteLiee === `affaire:${affaire.id}` && !d.archived,
  );
  const openAdminNotas = state.notas.filter(
    (n) =>
      n.statut === 'OUVERT' &&
      !n.archived &&
      (n.entiteLiee === `affaire:${affaire.id}` ||
        factures.some(
          (f) =>
            n.entiteLiee === `facture:${f.id}` || n.alertKey?.startsWith(`facture:${f.id}`),
        ) ||
        commandes.some(
          (c) => n.entiteLiee === `commande:${c.id}` || n.alertKey === `commande:${c.id}`,
        ) ||
        demandes.some(
          (d) => n.entiteLiee === `demandePrix:${d.id}` || n.alertKey === `dp:${d.id}`,
        )),
  );
  const notas = state.notas.filter(
    (n) =>
      n.entiteLiee === `affaire:${affaire.id}` ||
      openAdminNotas.some((x) => x.id === n.id),
  );

  const tabs: { id: Tab; label: string }[] = [
    { id: 'admin', label: 'Suivi admin' },
    { id: 'checklist', label: `Check-list (${items.filter((i) => i.fait).length}/${items.length})` },
    { id: 'factures', label: `Factures (${factures.length})` },
    { id: 'commandes', label: `Commandes (${commandes.length})` },
    { id: 'demandes', label: `Demandes prix (${demandes.length})` },
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
          <div className="flex flex-col items-end gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-800">
              {affaire.statut}
              {affaire.archived ? ' · Archivée' : ''}
            </span>
            {canAdmin(user) ? (
              affaire.archived ? (
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() => restoreAffaire(affaire.id)}
                >
                  Restaurer
                </button>
              ) : showArchiveAffaire ? (
                <div className="w-64 space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-2">
                  <textarea
                    className="input text-xs"
                    rows={2}
                    placeholder="Motif d’archivage (obligatoire)"
                    value={affaireArchiveMotif}
                    onChange={(e) => setAffaireArchiveMotif(e.target.value)}
                  />
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="btn-secondary flex-1 text-xs"
                      onClick={() => setShowArchiveAffaire(false)}
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      className="btn-primary flex-1 text-xs"
                      disabled={!affaireArchiveMotif.trim()}
                      onClick={() => {
                        const r = archiveAffaire(affaire.id, affaireArchiveMotif.trim());
                        if (r.ok) {
                          setShowArchiveAffaire(false);
                          setAffaireArchiveMotif('');
                        }
                      }}
                    >
                      Archiver
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="text-xs font-medium text-amber-800 underline"
                  onClick={() => setShowArchiveAffaire(true)}
                >
                  Archiver l’affaire
                </button>
              )
            ) : null}
          </div>
        </div>

        <AdminGlanceBar factures={factures} commandes={commandes} demandes={demandes} />

        {openAdminNotas.length > 0 ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
            <p className="font-semibold">
              {openAdminNotas.length} alerte{openAdminNotas.length > 1 ? 's' : ''} liée
              {openAdminNotas.length > 1 ? 's' : ''} (moteur Notas)
            </p>
            <ul className="mt-1 list-inside list-disc text-xs">
              {openAdminNotas.slice(0, 5).map((n) => (
                <li key={n.id}>{n.objet}</li>
              ))}
            </ul>
          </div>
        ) : null}

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

      {tab === 'admin' ? (
        <div className="space-y-4">
          <section className="space-y-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Factures</h2>
            <FacturesTraceList factures={factures} state={state} notas={openAdminNotas} />
            <div className="flex flex-wrap gap-2">
              {factures
                .filter((f) => f.statut === 'EMISE' || f.statut === 'RELANCEE')
                .map((f) => (
                  <button
                    key={`rel-${f.id}`}
                    type="button"
                    className="btn-secondary py-1.5 text-xs"
                    onClick={() => relancerFacture(f.id)}
                  >
                    Relancer {f.numero}
                  </button>
                ))}
            </div>
          </section>
          <section className="space-y-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Commandes</h2>
            <CommandesTraceList
              commandes={commandes}
              state={state}
              notas={openAdminNotas}
              delaiJ3={state.settings.alertDelais.commandeAvantBesoin}
            />
            <div className="flex flex-wrap gap-2">
              {commandes
                .filter((c) => c.statut === 'A_PASSER')
                .map((c) => (
                  <button
                    key={`pass-${c.id}`}
                    type="button"
                    className="btn-secondary py-1.5 text-xs"
                    onClick={() => passerCommande(c.id, `BC-${c.id.toUpperCase()}.pdf`)}
                  >
                    Passer · {c.type}
                  </button>
                ))}
            </div>
          </section>
          <section className="space-y-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
              Demandes de prix
            </h2>
            <DemandesPrixTraceList demandes={demandes} state={state} notas={openAdminNotas} />
            <div className="flex flex-wrap gap-2">
              {demandes
                .filter((d) => d.statut === 'ENVOYEE' || d.statut === 'RELANCEE')
                .map((d) => (
                  <button
                    key={`dpr-${d.id}`}
                    type="button"
                    className="btn-secondary py-1.5 text-xs"
                    onClick={() => relancerDemandePrix(d.id)}
                  >
                    Relancer {d.fournisseur}
                  </button>
                ))}
            </div>
          </section>
        </div>
      ) : null}

      {tab === 'checklist' ? (
        affaire.checklistId ? (
          <EditableChecklist checklistId={affaire.checklistId} affaireId={affaire.id} />
        ) : (
          <div className="card text-sm text-slate-500">Pas de check-list sur cette affaire.</div>
        )
      ) : null}

      {tab === 'commandes' ? (
        <CommandesTraceList
          commandes={commandes}
          state={state}
          notas={openAdminNotas}
          delaiJ3={state.settings.alertDelais.commandeAvantBesoin}
        />
      ) : null}

      {tab === 'factures' ? (
        <FacturesTraceList factures={factures} state={state} notas={openAdminNotas} />
      ) : null}

      {tab === 'demandes' ? (
        <DemandesPrixTraceList demandes={demandes} state={state} notas={openAdminNotas} />
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
            {notas.map((n) => {
              const resp = state.utilisateurs.find((u) => u.id === n.responsableId);
              return (
                <li key={n.id} className="card space-y-2 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {n.statut === 'OUVERT' && !n.archived ? (
                        <input
                          className="input w-full font-semibold"
                          value={n.objet}
                          onChange={(e) => updateNota(n.id, { objet: e.target.value })}
                        />
                      ) : (
                        <p className="font-semibold">{n.objet}</p>
                      )}
                      <p className="mt-1 text-xs text-slate-500">
                        {n.type} · {n.statut}
                        {n.archived ? ' · archivé' : ''} · {n.priorite}
                        {n.niveauRelance ? ` · relance n°${n.niveauRelance}` : ''}
                      </p>
                    </div>
                  </div>
                  {n.statut === 'OUVERT' && !n.archived ? (
                    <div className="flex flex-wrap gap-2">
                      <label className="text-xs text-slate-600">
                        Échéance
                        <input
                          type="date"
                          className="input ml-1 py-1 text-xs"
                          value={n.echeance}
                          onChange={(e) => updateNota(n.id, { echeance: e.target.value })}
                        />
                      </label>
                      <label className="text-xs text-slate-600">
                        Priorité
                        <select
                          className="input ml-1 py-1 text-xs"
                          value={n.priorite}
                          onChange={(e) =>
                            updateNota(n.id, {
                              priorite: e.target.value as typeof n.priorite,
                            })
                          }
                        >
                          <option value="basse">Basse</option>
                          <option value="normale">Normale</option>
                          <option value="haute">Haute</option>
                          <option value="bloquante">Bloquante</option>
                        </select>
                      </label>
                      <label className="text-xs text-slate-600">
                        Responsable
                        <select
                          className="input ml-1 py-1 text-xs"
                          value={n.responsableId}
                          onChange={(e) => updateNota(n.id, { responsableId: e.target.value })}
                        >
                          {state.utilisateurs
                            .filter((u) => u.actif)
                            .map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.nom}
                              </option>
                            ))}
                        </select>
                      </label>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Échéance {formatFR(n.echeance)} · {resp?.nom ?? n.responsableId}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {n.statut === 'OUVERT' && !n.archived ? (
                      <>
                        <button
                          type="button"
                          className="btn-secondary py-1.5 text-xs"
                          onClick={() => closeNota(n.id)}
                        >
                          Clôturer
                        </button>
                        <button
                          type="button"
                          className="btn-secondary py-1.5 text-xs"
                          onClick={() => {
                            setArchiveId(n.id);
                            setArchiveMotif('');
                          }}
                        >
                          Archiver
                        </button>
                      </>
                    ) : null}
                    {(n.statut === 'FAIT' || n.statut === 'ANNULE') && !n.archived ? (
                      <button
                        type="button"
                        className="btn-secondary py-1.5 text-xs"
                        onClick={() => reopenNota(n.id)}
                      >
                        Réouvrir
                      </button>
                    ) : null}
                  </div>
                  {archiveId === n.id ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-2">
                      <p className="mb-1 text-xs font-medium">Motif d&apos;archivage *</p>
                      <input
                        className="input mb-2 w-full text-sm"
                        value={archiveMotif}
                        onChange={(e) => setArchiveMotif(e.target.value)}
                        placeholder="Obligatoire"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="btn-secondary py-1 text-xs"
                          onClick={() => setArchiveId(null)}
                        >
                          Annuler
                        </button>
                        <button
                          type="button"
                          className="btn-primary py-1 text-xs"
                          onClick={() => {
                            const r = archiveNota(n.id, archiveMotif);
                            if (r.ok) setArchiveId(null);
                            else alert(r.error);
                          }}
                        >
                          Confirmer
                        </button>
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
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
        <div className="space-y-3">
          <label className="btn-secondary inline-flex cursor-pointer items-center gap-2 py-2 text-sm">
            Ajouter un document
            <input
              type="file"
              className="hidden"
              accept="image/*,.pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file || !user) return;
                const reader = new FileReader();
                reader.onload = () => {
                  addDocument({
                    entiteLiee: `affaire:${affaire.id}`,
                    type: file.type.startsWith('image/') ? 'PHOTO' : 'AUTRE',
                    nomFichier: file.name,
                    fichier: String(reader.result ?? ''),
                    mime: file.type,
                  });
                };
                reader.readAsDataURL(file);
                e.target.value = '';
              }}
            />
          </label>
          <p className="text-xs text-slate-500">
            Bibliothèque complète :{' '}
            <Link href="/documents" className="underline">
              /documents
            </Link>
          </p>
          <ul className="space-y-2">
            {docs.length === 0 ? (
              <li className="card text-sm text-slate-500">Aucun document.</li>
            ) : null}
            {docs.map((d) => (
              <li key={d.id} className="card text-sm">
                <p className="font-semibold">
                  {d.type} — {d.nomFichier}
                </p>
                <p className="text-xs text-slate-500">
                  {formatFR(d.date)}
                  {d.deposeParNom ? ` · ${d.deposeParNom}` : ''}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {tab === 'journal' ? (
        <ActivityJournal
          entitePrefixes={journalEntites}
          title="Historique complet de l’affaire"
          empty="Aucune entrée dans le journal pour cette affaire."
        />
      ) : null}
    </div>
  );
}
