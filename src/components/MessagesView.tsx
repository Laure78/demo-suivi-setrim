'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

/** Comptes bureau protégés — non suppressibles */
const BUREAU_IDS = new Set(['audrey', 'melissa', 'valerie', 'denis', 'philippe']);

type Conv = {
  id: string;
  titre: string;
  sousTitre: string;
  avatar: string;
  cls: string;
  pin: string;
  last: string;
  hr: string;
  nb: number;
};

type Msg = {
  id: string;
  texte: string | null;
  photoLabel: string | null;
  fichier?: string | null;
  systeme: boolean;
  createdAt: string;
  auteurId: string;
  auteur: { nom: string; initiales: string };
};

export function MessagesView({
  convs: initialConvs,
  initialThread,
  meId,
  canAdd,
}: {
  convs: Conv[];
  initialThread: string;
  meId: string;
  canAdd: boolean;
}) {
  const [convs, setConvs] = useState(initialConvs);
  const [conv, setConv] = useState(initialThread);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [pin, setPin] = useState('');
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [addErr, setAddErr] = useState('');
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    nom: '',
    initiales: '',
    email: '',
    role: 'assistante',
    terrain: false,
  });
  const streamRef = useRef<HTMLDivElement>(null);
  const pjRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const c = convs.find((x) => x.id === conv) ?? convs[0];
  const [uploading, setUploading] = useState(false);

  function canDeleteConv(id: string) {
    return canAdd && id !== 'gen' && id !== meId && !BUREAU_IDS.has(id);
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return convs;
    return convs.filter(
      (x) =>
        x.titre.toLowerCase().includes(s) ||
        x.sousTitre.toLowerCase().includes(s) ||
        x.avatar.toLowerCase().includes(s),
    );
  }, [convs, q]);

  async function load(id: string) {
    const r = await fetch(`/api/messages?thread=${encodeURIComponent(id)}`);
    if (!r.ok) return;
    const j = await r.json();
    setMsgs(j.messages);
    setPin(j.pin ?? '');
  }

  useEffect(() => {
    setConvs(initialConvs);
  }, [initialConvs]);

  useEffect(() => {
    load(conv);
  }, [conv]);

  useEffect(() => {
    if (streamRef.current) streamRef.current.scrollTop = streamRef.current.scrollHeight;
  }, [msgs]);

  async function send() {
    const v = text.trim();
    if (!v) return;
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadKey: conv, texte: v }),
    });
    setText('');
    await load(conv);
    router.refresh();
  }

  async function sendFile(file: File, kind: 'photo' | 'pj') {
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
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadKey: conv,
          photoLabel: j.name,
          fichier: j.url,
          texte:
            kind === 'photo'
              ? text.trim() || null
              : text.trim() || `Pièce jointe : ${j.name}`,
        }),
      });
      setText('');
      await load(conv);
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  function onPick(
    e: React.ChangeEvent<HTMLInputElement>,
    kind: 'photo' | 'pj',
  ) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void sendFile(file, kind);
  }

  async function makeTask(m: Msg) {
    if (!m.texte) return;
    await fetch('/api/taches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titre: m.texte.slice(0, 64),
        niveau: 2,
        threadKey: conv,
        fromMessage: true,
      }),
    });
    await load(conv);
  }

  async function addCollaborateur(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setAddErr('');
    const r = await fetch('/api/collaborateurs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const j = await r.json();
    setAdding(false);
    if (!r.ok) {
      setAddErr(j.error ?? 'Impossible d’ajouter');
      return;
    }
    setShowAdd(false);
    setForm({ nom: '', initiales: '', email: '', role: 'assistante', terrain: false });
    router.refresh();
    if (j.user?.id) setConv(j.user.id);
  }

  async function deleteCollaborateur(id: string, nom: string) {
    if (!canDeleteConv(id)) return;
    if (
      !confirm(
        `Retirer ${nom} de l’équipe ?\nIl disparaîtra de Messages et du sélecteur AU · ME · VA…`,
      )
    ) {
      return;
    }
    setDeleting(true);
    const r = await fetch('/api/collaborateurs', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const j = await r.json().catch(() => ({}));
    setDeleting(false);
    if (!r.ok) {
      alert(j.error ?? 'Suppression impossible');
      return;
    }
    setConvs((prev) => prev.filter((x) => x.id !== id));
    if (conv === id) setConv('gen');
    router.refresh();
  }

  return (
    <>
      <p className="hint" style={{ marginBottom: 12 }}>
        Messagerie interne uniquement : le fil <b>Équipe SETRIM</b> et le direct entre collègues.
        Aucun fil chantier ici — les échanges de chantier restent dans la fiche affaire. Zéro mail.
        {canAdd ? (
          <>
            {' '}
            Survolez un collègue ajouté pour le <b>retirer</b> (les 5 du bureau restent).
          </>
        ) : null}
      </p>
      <div className="chat">
        <div className="conv-list">
          <div className="conv-search">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher un collègue…"
            />
          </div>
          {canAdd ? (
            <button type="button" className="conv-add" onClick={() => setShowAdd(true)}>
              + Ajouter un collaborateur
            </button>
          ) : null}
          {filtered.map((x) => (
            <div
              key={x.id}
              className={`conv${conv === x.id ? ' on' : ''}${canDeleteConv(x.id) ? ' conv-deletable' : ''}`}
              onClick={() => setConv(x.id)}
              role="button"
              tabIndex={0}
            >
              <span className={`av ${x.cls}`}>{x.avatar}</span>
              <span className="txt">
                <span className="nm">{x.titre}</span>
                <span className="lst">{x.last}</span>
              </span>
              <span className="rt">
                <span className="hr">{x.hr}</span>
                {x.nb ? (
                  <>
                    <br />
                    <span className="nb">{x.nb}</span>
                  </>
                ) : null}
                {canDeleteConv(x.id) ? (
                  <button
                    type="button"
                    className="conv-del"
                    title={`Retirer ${x.titre}`}
                    disabled={deleting}
                    onClick={(e) => {
                      e.stopPropagation();
                      void deleteCollaborateur(x.id, x.titre);
                    }}
                  >
                    ✕
                  </button>
                ) : null}
              </span>
            </div>
          ))}
        </div>
        <div className="thread">
          <div className="th-head">
            <span className={`av ${c?.cls}`}>{c?.avatar}</span>
            <span className="th-head-txt">
              <h4>{c?.titre}</h4>
              <p>{c?.sousTitre}</p>
            </span>
            {c && canDeleteConv(c.id) ? (
              <button
                type="button"
                className="btn-note conv-del-head"
                disabled={deleting}
                onClick={() => void deleteCollaborateur(c.id, c.titre)}
              >
                Retirer
              </button>
            ) : null}
          </div>
          {pin ? (
            <div className="pinned">
              📌{' '}
              <span>
                <b>Épinglé —</b> {pin}
              </span>
            </div>
          ) : null}
          <div className="stream" id="stream" ref={streamRef}>
            {msgs.map((m) => {
              if (m.systeme) {
                return (
                  <div className="sys" key={m.id}>
                    ✓ {m.texte}
                  </div>
                );
              }
              const mine = m.auteurId === meId;
              const isImg =
                m.fichier &&
                /\.(jpe?g|png|webp|gif|heic)$/i.test(m.fichier);
              return (
                <div className={`bub${mine ? ' me' : ''}`} key={m.id}>
                  <div className="au">{m.auteur.nom}</div>
                  {m.fichier && isImg ? (
                    <a href={m.fichier} target="_blank" rel="noreferrer" className="photo-link">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.fichier} alt={m.photoLabel ?? 'Photo'} className="photo-img" />
                    </a>
                  ) : m.fichier ? (
                    <a
                      href={m.fichier}
                      target="_blank"
                      rel="noreferrer"
                      className="photo pj"
                    >
                      📎 {m.photoLabel ?? 'Pièce jointe'}
                    </a>
                  ) : m.photoLabel ? (
                    <div className="photo">📷 {m.photoLabel}</div>
                  ) : null}
                  {m.texte ? <p>{m.texte}</p> : null}
                  <div className="hr">
                    {new Date(m.createdAt).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {mine ? ' ✓✓' : ''}
                  </div>
                  {m.texte ? (
                    <button type="button" className="mk-task" onClick={() => makeTask(m)}>
                      + en faire une tâche
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
          <div className="composer">
            <input
              ref={pjRef}
              type="file"
              hidden
              accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf,image/*"
              onChange={(e) => onPick(e, 'pj')}
            />
            <input
              ref={photoRef}
              type="file"
              hidden
              accept="image/*"
              capture="environment"
              onChange={(e) => onPick(e, 'photo')}
            />
            <button
              type="button"
              className="ic"
              title="Joindre un document (PDF, Word…)"
              aria-label="Pièce jointe"
              disabled={uploading}
              onClick={() => pjRef.current?.click()}
            >
              📎
            </button>
            <button
              type="button"
              className="ic"
              title="Prendre ou envoyer une photo"
              aria-label="Photo"
              disabled={uploading}
              onClick={() => photoRef.current?.click()}
            >
              📷
            </button>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                uploading
                  ? 'Envoi en cours…'
                  : `Écrire à ${c?.titre ?? ''}…`
              }
              disabled={uploading}
              onKeyDown={(e) => e.key === 'Enter' && send()}
            />
            <button type="button" className="send" onClick={send} disabled={uploading}>
              Envoyer
            </button>
          </div>
        </div>
      </div>
      <p className="hint">
        Survolez un message pour en faire une tâche datée, avec alerte. Les décisions d’équipe se
        prennent ici — pas dans la boîte mail.
      </p>

      {showAdd ? (
        <>
          <div className="scrim on" onClick={() => setShowAdd(false)} />
          <div className="add-collab-sheet">
            <button type="button" className="sheet-close" onClick={() => setShowAdd(false)}>
              ✕
            </button>
            <span className="eyebrow">Nouveau collaborateur</span>
            <h3>Ajouter à l&apos;équipe</h3>
            <p className="hint">
              Il apparaîtra dans Messages et dans le sélecteur AU · ME · VA… Mot de passe démo :
              setrim2026.
            </p>
            <form onSubmit={addCollaborateur} className="add-collab-form">
              <label>
                Nom
                <input
                  required
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  placeholder="ex. Karim"
                />
              </label>
              <label>
                Initiales
                <input
                  value={form.initiales}
                  maxLength={2}
                  onChange={(e) =>
                    setForm({ ...form, initiales: e.target.value.toUpperCase() })
                  }
                  placeholder="KA"
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="karim@setrim.fr (optionnel)"
                />
              </label>
              <label>
                Rôle
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="assistante">Assistante travaux</option>
                  <option value="responsable">Resp. administrative</option>
                  <option value="dirigeant">Dirigeant</option>
                  <option value="conducteur">Conducteur de travaux</option>
                </select>
              </label>
              <label className="chk">
                <input
                  type="checkbox"
                  checked={form.terrain}
                  onChange={(e) => setForm({ ...form, terrain: e.target.checked })}
                />
                Sur le terrain (mobile)
              </label>
              {addErr ? <p className="err">{addErr}</p> : null}
              <button type="submit" className="btn-primary" disabled={adding}>
                {adding ? 'Ajout…' : 'Ajouter'}
              </button>
            </form>
          </div>
        </>
      ) : null}
    </>
  );
}
