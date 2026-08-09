'use client';

import { useEffect, useState } from 'react';
import {
  eur,
  formatDateFr,
  formatDateShort,
  daysLate,
  STATUT_LABEL,
  MODELES_TACHES,
  NIVEAU_LABEL,
  PIECE_TYPE_LABEL,
  PIECE_TYPES,
  FACTURE_TRAITEMENT,
  factureTraitement,
  type FactureTraitement,
} from '@/lib/format';

export type AffaireDetail = {
  id: string;
  numeroDevis: string;
  client: string;
  clientId?: string | null;
  ficheClient?: {
    id: string;
    nom: string;
    contact: string;
    telephone: string;
    email: string;
  } | null;
  adresse: string;
  montantHt: number;
  acompteHt: number;
  joursCharge: number;
  statut: string;
  type?: string;
  dateDevis: string | null;
  dateDebut?: string | null;
  dateFin?: string | null;
  note: string;
  equipe?: { id: string; nom: string } | null;
  contratEntretien?: {
    id: string;
    moisContractuel: number;
    exercice: string;
    datePosee: string | null;
    etat: string;
  } | null;
  planning?: {
    id: string;
    date: string;
    type: string;
    label: string | null;
    equipe: string;
    equipeId?: string;
  }[];
  taches: {
    id: string;
    titre: string;
    niveau: number;
    fait: boolean;
    dateEcheance: string;
    responsableId?: string;
    responsable: { nom: string; id?: string };
  }[];
  messages: {
    id: string;
    texte: string | null;
    photoLabel: string | null;
    fichier?: string | null;
    systeme: boolean;
    createdAt: string;
    auteur: { nom: string };
  }[];
  pieces: { id: string; titre: string; createdAt: string; fichier?: string | null; type?: string }[];
  factures: {
    id: string;
    type: string;
    montant: number;
    dateEmission: string | null;
    dateEncaissement: string | null;
  }[];
};

const MOIS_CE = [
  'Juil.',
  'Août',
  'Sept.',
  'Oct.',
  'Nov.',
  'Déc.',
  'Janv.',
  'Févr.',
  'Mars',
  'Avr.',
  'Mai',
  'Juin',
];

export function AffaireSheet({
  detail,
  onClose,
  onRefresh,
}: {
  detail: AffaireDetail | null;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [tab, setTab] = useState<'taches' | 'fil' | 'pieces' | 'plan' | 'fact'>('taches');
  const [newTask, setNewTask] = useState('');
  const [taskNiveau, setTaskNiveau] = useState(2);
  const [taskEcheance, setTaskEcheance] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [taskResp, setTaskResp] = useState('');
  const [bureau, setBureau] = useState<{ id: string; nom: string }[]>([]);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [pieceType, setPieceType] = useState<string>('os');
  const [pieceFilter, setPieceFilter] = useState<string>('');
  const [msg, setMsg] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [jours, setJours] = useState('');
  const [equipePlanId, setEquipePlanId] = useState('');
  const [equipes, setEquipes] = useState<{ id: string; nom: string }[]>([]);
  const [slotDrafts, setSlotDrafts] = useState<
    Record<string, { date: string; equipeId: string }>
  >({});
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    client: '',
    clientId: '',
    adresse: '',
    montantHt: '',
    acompteHt: '',
    joursCharge: '',
    statut: '',
    note: '',
    dateDevis: '',
  });
  const [clientOptions, setClientOptions] = useState<
    { id: string; nom: string; telephone?: string; contact?: string }[]
  >([]);
  const [newClientNom, setNewClientNom] = useState('');

  useEffect(() => {
    void fetch('/api/collaborateurs')
      .then((r) => (r.ok ? r.json() : []))
      .then((list: { id: string; nom: string; terrain?: boolean }[]) => {
        const bureauOnly = list.filter((u) => !u.terrain);
        setBureau(bureauOnly.length ? bureauOnly : list);
        if (!taskResp && list[0]) setTaskResp(list[0].id);
      })
      .catch(() => {});
    void fetch('/api/equipes')
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { equipes?: { id: string; nom: string }[] } | null) => {
        if (j?.equipes?.length) setEquipes(j.equipes);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!detail) return;
    if (detail.dateDebut) setDateDebut(detail.dateDebut.slice(0, 10));
    setJours(String(detail.joursCharge || 1));
    setEquipePlanId(detail.equipe?.id ?? '');
    const drafts: Record<string, { date: string; equipeId: string }> = {};
    for (const s of detail.planning ?? []) {
      drafts[s.id] = {
        date: s.date.slice(0, 10),
        equipeId: s.equipeId ?? detail.equipe?.id ?? '',
      };
    }
    setSlotDrafts(drafts);
  }, [detail]);

  if (!detail) {
    return (
      <>
        <div className="scrim on over-edit" onClick={onClose} />
        <div className="sheet open over-edit">
          <div className="sheet-head">
            <button type="button" className="sheet-close" onClick={onClose}>
              ✕
            </button>
          </div>
          <div className="sheet-body">
            <p className="hint">Chargement…</p>
          </div>
        </div>
      </>
    );
  }

  const a = detail;
  const st = STATUT_LABEL[a.statut] ?? a.statut;
  const isCe = a.type === 'contrat_entretien';

  function startEdit() {
    setForm({
      client: a.client,
      clientId: a.clientId ?? a.ficheClient?.id ?? '',
      adresse: a.adresse,
      montantHt: String(a.montantHt),
      acompteHt: String(a.acompteHt || ''),
      joursCharge: String(a.joursCharge),
      statut: a.statut,
      note: a.note ?? '',
      dateDevis: a.dateDevis ? a.dateDevis.slice(0, 10) : '',
    });
    setNewClientNom('');
    setEditing(true);
    void fetch('/api/clients')
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { clients?: { id: string; nom: string; telephone?: string; contact?: string }[] } | null) => {
        if (j?.clients) setClientOptions(j.clients);
      })
      .catch(() => {});
  }

  async function saveEdit() {
    setBusy(true);
    let clientId = form.clientId || null;
    let clientNom = form.client.trim();

    if (newClientNom.trim()) {
      const r = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: newClientNom.trim(),
          adresse: form.adresse,
          affaireId: a.id,
        }),
      });
      if (r.ok) {
        const c = await r.json();
        clientId = c.id;
        clientNom = c.nom;
      }
    } else if (clientId) {
      const picked = clientOptions.find((c) => c.id === clientId);
      if (picked) clientNom = picked.nom;
    }

    await fetch(`/api/affaires/${a.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client: clientNom,
        clientId,
        adresse: form.adresse,
        montantHt: Number(form.montantHt) || 0,
        acompteHt: form.acompteHt === '' ? 0 : Number(form.acompteHt),
        joursCharge: Number(form.joursCharge) || 0,
        statut: form.statut,
        note: form.note,
        dateDevis: form.dateDevis || null,
      }),
    });
    setBusy(false);
    setEditing(false);
    setNewClientNom('');
    onRefresh();
  }

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
      body: JSON.stringify({
        titre: v,
        affaireId: a.id,
        niveau: taskNiveau,
        dateEcheance: taskEcheance,
        responsableId: taskResp || undefined,
        libelleAffaire: `${a.client} · ${a.adresse.split(',')[0]}`,
      }),
    });
    setNewTask('');
    setTaskNiveau(2);
    onRefresh();
  }

  async function addModele(titre: string, niveau: number, offsetDays = 1) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    await fetch('/api/taches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titre,
        affaireId: a.id,
        niveau,
        dateEcheance: d.toISOString().slice(0, 10),
        responsableId: taskResp || undefined,
        libelleAffaire: `${a.client} · ${a.adresse.split(',')[0]}`,
      }),
    });
    onRefresh();
  }

  async function patchTask(
    id: string,
    patch: { niveau?: number; dateEcheance?: string; responsableId?: string },
  ) {
    await fetch(`/api/taches/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
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

  async function uploadToAffaire(file: File, kind: 'photo' | 'pj') {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const up = await fetch('/api/uploads', { method: 'POST', body: fd });
      const j = await up.json();
      if (!up.ok) {
        alert(j.error ?? 'Échec de l’envoi');
        return;
      }

      if (tab === 'pieces') {
        const type = kind === 'photo' ? 'photo' : pieceType || 'autre';
        const label = PIECE_TYPE_LABEL[type] ?? 'Document';
        await fetch('/api/pieces', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            affaireId: a.id,
            titre: `${label} — ${j.name}`,
            fichier: j.url,
            type,
          }),
        });
      } else {
        await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            threadKey: a.numeroDevis,
            affaireId: a.id,
            photoLabel: j.name,
            fichier: j.url,
            texte:
              kind === 'photo'
                ? msg.trim() || null
                : msg.trim() || `Pièce jointe : ${j.name}`,
          }),
        });
        setMsg('');
      }
      onRefresh();
    } finally {
      setUploading(false);
    }
  }

  function onFilePick(
    e: React.ChangeEvent<HTMLInputElement>,
    kind: 'photo' | 'pj',
  ) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void uploadToAffaire(file, kind);
  }

  async function programmer() {
    if (!dateDebut) return;
    setBusy(true);
    await fetch(`/api/affaires/${a.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'programmer',
        dateDebut,
        joursCharge: jours ? Number(jours) : undefined,
        equipeId: equipePlanId || undefined,
      }),
    });
    setBusy(false);
    onRefresh();
  }

  async function saveSlot(slotId: string) {
    const d = slotDrafts[slotId];
    if (!d?.date || !d.equipeId) return;
    setBusy(true);
    const r = await fetch('/api/planning/slots', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: slotId,
        date: d.date,
        equipeId: d.equipeId,
        affaireId: a.id,
      }),
    });
    setBusy(false);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      alert(j.error ?? 'Impossible de modifier le créneau');
      return;
    }
    onRefresh();
  }

  async function deleteSlot(slotId: string) {
    if (!confirm('Retirer ce créneau du planning ?')) return;
    setBusy(true);
    const r = await fetch('/api/planning/slots', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: slotId }),
    });
    setBusy(false);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      alert(j.error ?? 'Suppression impossible');
      return;
    }
    onRefresh();
  }

  async function setTraitementFacture(
    type: 'acompte' | 'solde',
    statut: FactureTraitement,
  ) {
    setBusy(true);
    await fetch(`/api/affaires/${a.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'facture-traitement', type, statut }),
    });
    setBusy(false);
    onRefresh();
  }

  let body: React.ReactNode = null;
  if (tab === 'taches') {
    body = (
      <>
        <p className="hint desk-only" style={{ marginBottom: 10 }}>
          Urgence + échéance → la tâche apparaît dans{' '}
          <a href="/aujourdhui">Aujourd&apos;hui</a> chez le responsable (post-it à cocher).
        </p>
        {a.taches.length === 0 ? (
          <p className="hint">Aucune tâche. Ajoutez-en une, ou partez d&apos;un modèle.</p>
        ) : (
          a.taches.map((t) => {
            const late = !t.fait ? daysLate(new Date(t.dateEcheance)) : 0;
            const open = editTaskId === t.id;
            return (
              <div key={t.id} className={`task-line${t.fait ? ' done' : ''}`}>
                <span className={`lvl n${t.niveau}`} title={NIVEAU_LABEL[t.niveau]} />
                <span
                  className="box"
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleTask(t.id)}
                  onKeyDown={(e) => e.key === 'Enter' && toggleTask(t.id)}
                />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="t">{t.titre}</span>
                  <div className="m mono">
                    <span className={`urg-tag n${t.niveau}`}>
                      {NIVEAU_LABEL[t.niveau] ?? 'À faire'}
                    </span>
                    {' · '}
                    échéance {formatDateShort(t.dateEcheance)} · {t.responsable.nom}
                    {late > 0 ? ` · en retard de ${late} j` : ''}
                  </div>
                  {open && !t.fait ? (
                    <div className="task-edit" onClick={(e) => e.stopPropagation()}>
                      <label>
                        Échéance
                        <input
                          type="date"
                          defaultValue={t.dateEcheance.slice(0, 10)}
                          onChange={(e) => {
                            if (e.target.value) void patchTask(t.id, { dateEcheance: e.target.value });
                          }}
                        />
                      </label>
                      <label>
                        Urgence
                        <select
                          defaultValue={t.niveau}
                          onChange={(e) =>
                            void patchTask(t.id, { niveau: Number(e.target.value) })
                          }
                        >
                          <option value={3}>Urgent</option>
                          <option value={2}>À faire</option>
                          <option value={1}>Info</option>
                        </select>
                      </label>
                      {bureau.length ? (
                        <label>
                          Responsable
                          <select
                            defaultValue={t.responsableId ?? ''}
                            onChange={(e) =>
                              void patchTask(t.id, { responsableId: e.target.value })
                            }
                          >
                            {bureau.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.nom}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : null}
                    </div>
                  ) : null}
                </span>
                <span className="task-actions">
                  {!t.fait ? (
                    <button
                      type="button"
                      className="btn-edit"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditTaskId(open ? null : t.id);
                      }}
                    >
                      {open ? 'Fermer' : '✎'}
                    </button>
                  ) : null}
                </span>
              </div>
            );
          })
        )}
        <div className="add-task-form">
          <input
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="Nouvelle tâche — ex. commander la benne"
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
          />
          <div className="add-task-meta">
            <label>
              Échéance
              <input
                type="date"
                value={taskEcheance}
                onChange={(e) => setTaskEcheance(e.target.value)}
              />
            </label>
            <label>
              Urgence
              <select
                value={taskNiveau}
                onChange={(e) => setTaskNiveau(Number(e.target.value))}
              >
                <option value={3}>Urgent (rouge)</option>
                <option value={2}>À faire (jaune)</option>
                <option value={1}>Info (gris)</option>
              </select>
            </label>
            {bureau.length ? (
              <label>
                Responsable
                <select value={taskResp} onChange={(e) => setTaskResp(e.target.value)}>
                  {bureau.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nom}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <button type="button" onClick={addTask}>
              Ajouter
            </button>
          </div>
        </div>
        <div className="task-modeles">
          <p className="eyebrow">Modèles rapides</p>
          <div className="task-modele-list">
            {MODELES_TACHES.map((m) => (
              <button
                key={m.titre}
                type="button"
                className="task-modele"
                onClick={() => addModele(m.titre, m.niveau, m.offsetDays)}
              >
                {m.titre.split('—')[0].trim()}
              </button>
            ))}
          </div>
        </div>
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
              {m.fichier && /\.(jpe?g|png|webp|gif|heic)$/i.test(m.fichier) ? (
                <a href={m.fichier} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.fichier}
                    alt={m.photoLabel ?? 'Photo'}
                    style={{
                      maxWidth: '100%',
                      maxHeight: 180,
                      borderRadius: 6,
                      margin: '6px 0',
                    }}
                  />
                </a>
              ) : m.fichier ? (
                <p>
                  <a href={m.fichier} target="_blank" rel="noreferrer">
                    📎 {m.photoLabel ?? 'Pièce jointe'}
                  </a>
                </p>
              ) : m.photoLabel ? (
                <p>📷 {m.photoLabel}</p>
              ) : null}
              {m.texte ? <p>{m.texte}</p> : null}
            </div>
          ),
        )}
        <div className="add-task" style={{ alignItems: 'center' }}>
          <label className="ic" title="Pièce jointe" style={{ cursor: 'pointer' }}>
            📎
            <input
              type="file"
              hidden
              accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf,image/*"
              onChange={(e) => onFilePick(e, 'pj')}
            />
          </label>
          <label className="ic" title="Photo" style={{ cursor: 'pointer' }}>
            📷
            <input
              type="file"
              hidden
              accept="image/*"
              capture="environment"
              onChange={(e) => onFilePick(e, 'photo')}
            />
          </label>
          <input
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder={uploading ? 'Envoi…' : "Écrire à l'équipe…"}
            disabled={uploading}
            onKeyDown={(e) => e.key === 'Enter' && sendMsg()}
          />
          <button type="button" onClick={sendMsg} disabled={uploading}>
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
    const filteredPieces = pieceFilter
      ? a.pieces.filter((p) => p.type === pieceFilter)
      : a.pieces;
    body = (
      <>
        <div className="piece-toolbar">
          <label>
            Type de document
            <select
              value={pieceType}
              onChange={(e) => setPieceType(e.target.value)}
              aria-label="Sélectionner le type de document"
            >
              {PIECE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {PIECE_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Afficher
            <select
              value={pieceFilter}
              onChange={(e) => setPieceFilter(e.target.value)}
              aria-label="Filtrer les documents"
            >
              <option value="">Tous les documents ({a.pieces.length})</option>
              {PIECE_TYPES.map((t) => {
                const n = a.pieces.filter((p) => p.type === t).length;
                return (
                  <option key={t} value={t}>
                    {PIECE_TYPE_LABEL[t]}
                    {n ? ` (${n})` : ''}
                  </option>
                );
              })}
            </select>
          </label>
        </div>

        {filteredPieces.length === 0 ? (
          <p className="hint">
            {pieceFilter
              ? `Aucun document « ${PIECE_TYPE_LABEL[pieceFilter] ?? pieceFilter} » pour l’instant.`
              : 'Aucun document. Choisissez le type puis joignez le fichier.'}
          </p>
        ) : (
          filteredPieces.map((p) => (
            <div className="piece" key={p.id}>
              <span>
                {p.fichier ? (
                  <a href={p.fichier} target="_blank" rel="noreferrer">
                    {p.titre}
                  </a>
                ) : (
                  p.titre
                )}
              </span>
              <small>
                {PIECE_TYPE_LABEL[p.type ?? 'autre'] ?? p.type ?? 'Document'} ·{' '}
                {formatDateFr(p.createdAt)}
              </small>
            </div>
          ))
        )}

        <div className="add-task" style={{ marginTop: 12, alignItems: 'center' }}>
          <label className="ic" title="Ajouter une PJ" style={{ cursor: 'pointer' }}>
            📎
            <input
              type="file"
              hidden
              accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf,image/*"
              onChange={(e) => onFilePick(e, 'pj')}
            />
          </label>
          <label className="ic" title="Ajouter une photo" style={{ cursor: 'pointer' }}>
            📷
            <input
              type="file"
              hidden
              accept="image/*"
              capture="environment"
              onChange={(e) => onFilePick(e, 'photo')}
            />
          </label>
          <span className="hint" style={{ margin: 0 }}>
            {uploading
              ? 'Envoi en cours…'
              : `Joindre : ${PIECE_TYPE_LABEL[pieceType] ?? 'document'}`}
          </span>
        </div>
        <p className="hint">
          Sélectionnez le type (devis, OS, autorisation…), puis joignez le fichier. Le dossier
          physique devient cette liste — photographiable depuis le téléphone.
        </p>
      </>
    );
  }

  if (tab === 'plan') {
    const slots = a.planning ?? [];
    body = (
      <>
        <p className="hint" style={{ marginBottom: 12 }}>
          Modifiez dates et équipe ici : le planning général se met à jour automatiquement
          (même affaire, mêmes créneaux).
        </p>
        <dl className="kv">
          <dt>Début</dt>
          <dd>{formatDateFr(a.dateDebut ?? null)}</dd>
          <dt>Fin</dt>
          <dd>{formatDateFr(a.dateFin ?? null)}</dd>
          <dt>Charge</dt>
          <dd>{a.joursCharge} j</dd>
          <dt>Équipe</dt>
          <dd>{a.equipe?.nom ?? '—'}</dd>
          {a.contratEntretien ? (
            <>
              <dt>Mois CE</dt>
              <dd>
                {MOIS_CE[a.contratEntretien.moisContractuel] ?? '—'} ·{' '}
                {a.contratEntretien.exercice}
              </dd>
            </>
          ) : null}
        </dl>

        {slots.length > 0 ? (
          <div className="plan-slots-edit" style={{ marginTop: 14 }}>
            <span className="eyebrow">Créneaux planning — modifiables</span>
            {slots.map((s) => {
              const draft = slotDrafts[s.id] ?? {
                date: s.date.slice(0, 10),
                equipeId: s.equipeId ?? '',
              };
              return (
                <div className="piece plan-slot-row" key={s.id}>
                  <div className="plan-slot-fields">
                    <label>
                      Date
                      <input
                        type="date"
                        value={draft.date}
                        disabled={busy}
                        onChange={(e) =>
                          setSlotDrafts((prev) => ({
                            ...prev,
                            [s.id]: { ...draft, date: e.target.value },
                          }))
                        }
                      />
                    </label>
                    <label>
                      Équipe
                      <select
                        value={draft.equipeId}
                        disabled={busy || !equipes.length}
                        onChange={(e) =>
                          setSlotDrafts((prev) => ({
                            ...prev,
                            [s.id]: { ...draft, equipeId: e.target.value },
                          }))
                        }
                      >
                        {!draft.equipeId ? <option value="">— équipe —</option> : null}
                        {equipes.map((eq) => (
                          <option key={eq.id} value={eq.id}>
                            {eq.nom}
                          </option>
                        ))}
                      </select>
                    </label>
                    <small>{s.type === 'ce' ? 'Contrat entretien' : 'Chantier'}</small>
                  </div>
                  <div className="plan-slot-actions">
                    <button
                      type="button"
                      className="btn-note"
                      disabled={busy}
                      onClick={() => void saveSlot(s.id)}
                    >
                      Enregistrer
                    </button>
                    <button
                      type="button"
                      className="btn-note plan-slot-del"
                      disabled={busy}
                      title="Retirer du planning"
                      onClick={() => void deleteSlot(s.id)}
                    >
                      Retirer
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="hint" style={{ marginTop: 12 }}>
            Pas encore de créneau. Posez la date ci-dessous.
          </p>
        )}

        <div className="add-task plan-program" style={{ marginTop: 16, flexWrap: 'wrap' }}>
          <input
            type="date"
            value={dateDebut}
            onChange={(e) => setDateDebut(e.target.value)}
            style={{ flex: '1 1 140px' }}
            aria-label="Date de début"
          />
          <input
            type="number"
            min={1}
            placeholder="Jours"
            value={jours}
            onChange={(e) => setJours(e.target.value)}
            style={{ width: 72 }}
            aria-label="Nombre de jours"
          />
          <select
            value={equipePlanId}
            onChange={(e) => setEquipePlanId(e.target.value)}
            style={{ flex: '1 1 160px' }}
            aria-label="Équipe"
          >
            <option value="">Équipe (auto)</option>
            {equipes.map((eq) => (
              <option key={eq.id} value={eq.id}>
                {eq.nom}
              </option>
            ))}
          </select>
          <button type="button" onClick={programmer} disabled={busy || !dateDebut}>
            {slots.length ? 'Recaler le planning' : 'Programmer'}
          </button>
        </div>
        <p className="hint">
          Programmer / Recaler = statut PROGRAMMÉ + créneaux au planning + tâches (benne,
          autorisation, factures) recalées sur la date d&apos;intervention. Les changements
          apparaissent tout de suite dans l&apos;agenda Planning.
        </p>
      </>
    );
  }

  if (tab === 'fact') {
    const acompte = a.factures.find((f) => f.type === 'acompte');
    const solde = a.factures.find((f) => f.type === 'solde');
    const factureRows: {
      type: 'acompte' | 'solde';
      label: string;
      f: typeof acompte;
    }[] = [
      { type: 'acompte', label: "Facture d'acompte", f: acompte },
      { type: 'solde', label: 'Facture de solde', f: solde },
    ];
    body = (
      <>
        <p className="hint" style={{ marginBottom: 10 }}>
          Cochez le traitement de chaque facture : non émise → émise → encaissée. Ça met à jour le
          portefeuille et les alertes Aujourd&apos;hui.
        </p>
        {factureRows.map(({ type, label, f }) => (
          <div className="piece fact-row" key={type}>
            <span>
              {label}
              {f ? (
                <small className="fact-mt" style={{ display: 'block', marginTop: 2 }}>
                  {eur(f.montant)}
                </small>
              ) : null}
            </span>
            <select
              className="fact-select"
              disabled={busy}
              value={factureTraitement(f)}
              onChange={(e) =>
                void setTraitementFacture(type, e.target.value as FactureTraitement)
              }
              aria-label={`Traitement ${label}`}
            >
              {FACTURE_TRAITEMENT.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        ))}
        <div className="piece">
          <span>Reste à facturer</span>
          <small>
            {eur(
              Math.max(
                0,
                a.montantHt -
                  (acompte?.dateEncaissement || acompte?.dateEmission
                    ? acompte.montant
                    : a.acompteHt || 0) -
                  (solde?.dateEncaissement || solde?.dateEmission ? solde.montant : 0),
              ),
            )}
          </small>
        </div>
        <p className="hint">
          Traçabilité complète : devis, acompte, solde, encaissement — sur la même fiche que le
          chantier. L&apos;émission coche l&apos;alerte facture ; l&apos;encaissement éteint la
          relance impayé.
        </p>
      </>
    );
  }

  return (
    <>
      <div className="scrim on over-edit" onClick={onClose} />
      <div className="sheet open over-edit" id="sheet">
        <div className="sheet-head">
          <button type="button" className="sheet-close" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
          <div className="sheet-head-actions">
            {!editing ? (
              <button type="button" className="btn-edit" onClick={startEdit}>
                ✎ Modifier
              </button>
            ) : (
              <>
                <button type="button" className="btn-note" onClick={() => setEditing(false)}>
                  Annuler
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={saveEdit}
                  disabled={busy}
                >
                  Enregistrer
                </button>
              </>
            )}
          </div>
          <span className="eyebrow">
            {isCe ? 'Contrat d’entretien' : 'Affaire'} {a.numeroDevis} · {st}
          </span>
          {editing ? (
            <form
              className="edit-affaire-form"
              onSubmit={(e) => {
                e.preventDefault();
                void saveEdit();
              }}
            >
              <label>
                Fiche client
                <select
                  value={form.clientId}
                  onChange={(e) => {
                    const id = e.target.value;
                    const picked = clientOptions.find((c) => c.id === id);
                    setForm({
                      ...form,
                      clientId: id,
                      client: picked?.nom ?? form.client,
                    });
                    setNewClientNom('');
                  }}
                >
                  <option value="">— choisir une fiche —</option>
                  {clientOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom}
                      {c.contact ? ` (${c.contact})` : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Ou créer une nouvelle fiche
                <input
                  value={newClientNom}
                  onChange={(e) => setNewClientNom(e.target.value)}
                  placeholder="Nom du client (laisse vide pour utiliser la liste)"
                />
              </label>
              <label>
                Libellé affiché
                <input
                  value={form.client}
                  onChange={(e) => setForm({ ...form, client: e.target.value })}
                  required
                />
              </label>
              <label>
                Adresse du chantier
                <input
                  value={form.adresse}
                  onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                  required
                />
              </label>
              <div className="edit-row">
                <label>
                  Montant HT
                  <input
                    type="number"
                    step="0.01"
                    value={form.montantHt}
                    onChange={(e) => setForm({ ...form, montantHt: e.target.value })}
                  />
                </label>
                <label>
                  Acompte HT
                  <input
                    type="number"
                    step="0.01"
                    value={form.acompteHt}
                    onChange={(e) => setForm({ ...form, acompteHt: e.target.value })}
                  />
                </label>
                <label>
                  Jours
                  <input
                    type="number"
                    min={0}
                    value={form.joursCharge}
                    onChange={(e) => setForm({ ...form, joursCharge: e.target.value })}
                  />
                </label>
              </div>
              <div className="edit-row">
                <label>
                  Statut
                  <select
                    value={form.statut}
                    onChange={(e) => setForm({ ...form, statut: e.target.value })}
                  >
                    <option value="commande">Commande</option>
                    <option value="programme">Programmé</option>
                    <option value="encours">En cours</option>
                    <option value="solde">Soldé</option>
                  </select>
                </label>
                <label>
                  Date devis
                  <input
                    type="date"
                    value={form.dateDevis}
                    onChange={(e) => setForm({ ...form, dateDevis: e.target.value })}
                  />
                </label>
              </div>
              <label>
                Note / alerte
                <input
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="ex. acompte non réglé"
                />
              </label>
            </form>
          ) : (
            <>
              <h3>{a.client}</h3>
              <div className="adr">{a.adresse}</div>
              {a.ficheClient ? (
                <p className="hint" style={{ marginTop: 8 }}>
                  Fiche client : <strong>{a.ficheClient.nom}</strong>
                  {a.ficheClient.contact ? ` · ${a.ficheClient.contact}` : ''}
                  {a.ficheClient.telephone ? (
                    <>
                      {' · '}
                      <a href={`tel:${a.ficheClient.telephone.replace(/\s/g, '')}`}>
                        {a.ficheClient.telephone}
                      </a>
                    </>
                  ) : null}
                  {' · '}
                  <a href="/clients">Voir les clients</a>
                </p>
              ) : (
                <p className="hint" style={{ marginTop: 8 }}>
                  Pas encore de fiche client.{' '}
                  <button type="button" className="btn-note" onClick={startEdit}>
                    Rattacher / créer
                  </button>
                </p>
              )}
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
              <p className="hint desk-only" style={{ marginTop: 10 }}>
                Fil conducteur : devis validé → planning →{' '}
                {isCe ? 'anniversaire CE → ' : ''}
                alertes Aujourd&apos;hui → facturation.
              </p>
              {a.note ? (
                <p className="hint" style={{ marginTop: 6, color: 'var(--flamme)' }}>
                  ▲ {a.note}
                </p>
              ) : null}
            </>
          )}
        </div>
        <div className="sheet-tabs">
          {(
            [
              ['taches', 'Tâches'],
              ['fil', 'Fil'],
              ['pieces', 'Pièces'],
              ['plan', 'Planning'],
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
