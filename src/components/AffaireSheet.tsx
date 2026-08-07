'use client';

import { useState } from 'react';
import {
  eur,
  formatDateFr,
  formatDateShort,
  daysLate,
  STATUT_LABEL,
  MODELES_TACHES,
} from '@/lib/format';

export type AffaireDetail = {
  id: string;
  numeroDevis: string;
  client: string;
  adresse: string;
  montantHt: number;
  acompteHt: number;
  joursCharge: number;
  statut: string;
  dateDevis: string | null;
  note: string;
  taches: {
    id: string;
    titre: string;
    niveau: number;
    fait: boolean;
    dateEcheance: string;
    responsable: { nom: string };
  }[];
  messages: {
    id: string;
    texte: string | null;
    photoLabel: string | null;
    systeme: boolean;
    createdAt: string;
    auteur: { nom: string };
  }[];
  pieces: { id: string; titre: string; createdAt: string }[];
  factures: {
    id: string;
    type: string;
    montant: number;
    dateEmission: string | null;
    dateEncaissement: string | null;
  }[];
};

export function AffaireSheet({
  detail,
  onClose,
  onRefresh,
}: {
  detail: AffaireDetail | null;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [tab, setTab] = useState<'taches' | 'fil' | 'pieces' | 'fact'>('taches');
  const [newTask, setNewTask] = useState('');
  const [msg, setMsg] = useState('');

  if (!detail) {
    return (
      <>
        <div className="scrim on" onClick={onClose} />
        <div className="sheet open">
          <div className="sheet-body">
            <p className="hint">Chargement…</p>
          </div>
        </div>
      </>
    );
  }

  const a = detail;
  const st = STATUT_LABEL[a.statut] ?? a.statut;

  async function toggleTask(id: string) {
    await fetch(`/api/taches/${id}/toggle`, { method: 'POST' });
    onRefresh();
  }

  async function addTask() {
    const v = newTask.trim();
    if (!v) return;
    await fetch('/api/taches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titre: v, affaireId: a.id, niveau: 2 }),
    });
    setNewTask('');
    onRefresh();
  }

  async function addModele(titre: string, niveau: number) {
    await fetch('/api/taches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titre, affaireId: a.id, niveau }),
    });
    onRefresh();
  }

  async function sendMsg() {
    const v = msg.trim();
    if (!v) return;
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        threadKey: a.numeroDevis,
        affaireId: a.id,
        texte: v,
      }),
    });
    setMsg('');
    onRefresh();
  }

  let body: React.ReactNode = null;
  if (tab === 'taches') {
    body = (
      <>
        {a.taches.length === 0 ? (
          <p className="hint">Aucune tâche. Ajoutez-en une, ou partez d&apos;un modèle.</p>
        ) : (
          a.taches.map((t) => {
            const late = !t.fait ? daysLate(new Date(t.dateEcheance)) : 0;
            return (
              <div
                key={t.id}
                className={`task-line${t.fait ? ' done' : ''}`}
                onClick={() => toggleTask(t.id)}
                role="button"
                tabIndex={0}
              >
                <span className={`lvl n${t.niveau}`} />
                <span className="box" />
                <span>
                  <span className="t">{t.titre}</span>
                  <div className="m mono">
                    {formatDateShort(t.dateEcheance)} · {t.responsable.nom}
                    {late > 0 ? ` · en retard de ${late} j` : ''}
                  </div>
                </span>
              </div>
            );
          })
        )}
        <div className="add-task">
          <input
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="Nouvelle tâche — ex. commander la benne"
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
          />
          <button type="button" onClick={addTask}>
            Ajouter
          </button>
        </div>
        <p className="hint">
          Modèles proposés à la création :{' '}
          {MODELES_TACHES.map((m, i) => (
            <button
              key={m.titre}
              type="button"
              className="edit-mark"
              style={{ marginRight: 6 }}
              onClick={() => addModele(m.titre, m.niveau)}
            >
              {m.titre.split('—')[0].trim()}
              {i < MODELES_TACHES.length - 1 ? ',' : '.'}
            </button>
          ))}{' '}
          Tous modifiables, aucun imposé.
        </p>
      </>
    );
  }

  if (tab === 'fil') {
    body = (
      <>
        {a.messages.map((m) =>
          m.systeme ? (
            <div className="sys" key={m.id}>
              ✓ {m.texte}
            </div>
          ) : (
            <div className="msg" key={m.id}>
              <div className="a">
                {m.auteur.nom}
                <small>{formatDateFr(m.createdAt)}</small>
              </div>
              {m.photoLabel ? <p>📷 {m.photoLabel}</p> : null}
              {m.texte ? <p>{m.texte}</p> : null}
            </div>
          ),
        )}
        <div className="add-task">
          <input
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder="Écrire à l'équipe…"
            onKeyDown={(e) => e.key === 'Enter' && sendMsg()}
          />
          <button type="button" onClick={sendMsg}>
            Envoyer
          </button>
        </div>
        <p className="hint">
          Tout se dit ici, pas par mail. Denis et Philippe répondent depuis le chantier, photos
          comprises.
        </p>
      </>
    );
  }

  if (tab === 'pieces') {
    body = (
      <>
        {a.pieces.map((p) => (
          <div className="piece" key={p.id}>
            <span>{p.titre}</span>
            <small>PDF · {formatDateFr(p.createdAt)}</small>
          </div>
        ))}
        <p className="hint">
          Le dossier physique devient cette liste. Photographiable depuis le téléphone.
        </p>
      </>
    );
  }

  if (tab === 'fact') {
    const acompte = a.factures.find((f) => f.type === 'acompte');
    const solde = a.factures.find((f) => f.type === 'solde');
    body = (
      <>
        <div className="piece">
          <span>Facture d&apos;acompte</span>
          <small>
            {acompte
              ? `${eur(acompte.montant)}${acompte.dateEncaissement ? ' · encaissée' : ''}`
              : 'non émise'}
          </small>
        </div>
        <div className="piece">
          <span>Facture de solde</span>
          <small>{solde ? 'émise' : 'non émise'}</small>
        </div>
        <div className="piece">
          <span>Reste à facturer</span>
          <small>{eur(a.montantHt - a.acompteHt)}</small>
        </div>
        <p className="hint">
          Traçabilité complète : devis, acompte, solde, encaissement, sur la même fiche que le
          chantier.
        </p>
      </>
    );
  }

  return (
    <>
      <div className="scrim on" onClick={onClose} />
      <div className="sheet open" id="sheet">
        <div className="sheet-head">
          <button type="button" className="sheet-close" onClick={onClose}>
            ✕
          </button>
          <span className="eyebrow">
            Affaire {a.numeroDevis} · {st}
          </span>
          <h3>{a.client}</h3>
          <div className="adr">{a.adresse}</div>
          <dl className="kv">
            <dt>Montant HT</dt>
            <dd>{eur(a.montantHt)}</dd>
            <dt>Jours de charge</dt>
            <dd>{a.joursCharge} j</dd>
            <dt>Devis du</dt>
            <dd>{formatDateFr(a.dateDevis)}</dd>
            <dt>Acompte</dt>
            <dd>{a.acompteHt ? eur(a.acompteHt) : '—'}</dd>
          </dl>
          {a.note ? (
            <p className="hint" style={{ marginTop: 10, color: 'var(--flamme)' }}>
              ▲ {a.note}
            </p>
          ) : null}
        </div>
        <div className="sheet-tabs">
          {(
            [
              ['taches', 'Tâches'],
              ['fil', 'Fil de discussion'],
              ['pieces', 'Pièces'],
              ['fact', 'Facturation'],
            ] as const
          ).map(([k, v]) => (
            <button
              key={k}
              type="button"
              className={tab === k ? 'on' : ''}
              onClick={() => setTab(k)}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="sheet-body">{body}</div>
      </div>
    </>
  );
}
