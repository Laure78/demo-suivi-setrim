'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AvatarBubble } from '@/components/AvatarBubble';
import { AideLabel, AideTip } from '@/components/AideTip';
import { AffaireSheet, type AffaireDetail } from '@/components/AffaireSheet';
import { AIDES } from '@/lib/aides';

/** Comptes bureau protégés — non suppressibles */
const BUREAU_IDS = new Set(['audrey', 'melissa', 'valerie', 'denis', 'philippe']);

type Conv = {
  id: string;
  kind?: 'gen' | 'user' | 'affaire';
  affaireId?: string | null;
  titre: string;
  sousTitre: string;
  avatar: string;
  photo?: string | null;
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
  const [mobileThread, setMobileThread] = useState(false);
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
  const c = convs.find((x) => x.id === conv) ?? convs[0] ?? null;
  const [uploading, setUploading] = useState(false);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AffaireDetail | null>(null);

  function canDeleteConv(id: string) {
    const c0 = convs.find((x) => x.id === id);
    if (c0?.kind === 'affaire' || c0?.kind === 'gen') return false;
    return canAdd && id !== 'gen' && id !== meId && !BUREAU_IDS.has(id);
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return convs;
    return convs.filter(
      (x) =>
        x.titre.toLowerCase().includes(s) ||
        x.sousTitre.toLowerCase().includes(s) ||
        x.avatar.toLowerCase().includes(s) ||
        (x.affaireId ?? '').toLowerCase().includes(s),
    );
  }, [convs, q]);

  async function load(id: string) {
    const c0 = convs.find((x) => x.id === id);
    const qs = new URLSearchParams({ thread: id });
    if (c0?.affaireId) qs.set('affaireId', c0.affaireId);
    const r = await fetch(`/api/messages?${qs}`);
    if (!r.ok) return;
    const j = await r.json();
    setMsgs(j.messages);
    setPin(j.pin ?? '');
  }

  useEffect(() => {
    setConvs(initialConvs);
  }, [initialConvs]);

  useEffect(() => {
    setConv(initialThread);
  }, [initialThread]);

  useEffect(() => {
    void load(conv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conv]);

  useEffect(() => {
    if (streamRef.current) streamRef.current.scrollTop = streamRef.current.scrollHeight;
  }, [msgs]);

  function selectConv(id: string) {
    setConv(id);
    setMobileThread(true);
  }

  async function send() {
    const v = text.trim();
    if (!v || !c) return;
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        threadKey: conv,
        affaireId: c.affaireId ?? null,
        texte: v,
      }),
    });
    setText('');
    await load(conv);
    router.refresh();
  }

  async function sendFile(file: File, kind: 'photo' | 'pj') {
    if (!c) return;
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
          affaireId: c.affaireId ?? null,
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

  function onPick(e: React.ChangeEvent<HTMLInputElement>, kind: 'photo' | 'pj') {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void sendFile(file, kind);
  }

  async function openAffaire(id: string) {
    setSheetId(id);
    setDetail(null);
    const r = await fetch(`/api/affaires/${id}`);
    if (r.ok) setDetail(await r.json());
  }

  async function makeTask(m: Msg) {
    if (!m.texte || !c) return;
    await fetch('/api/taches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titre: m.texte.slice(0, 64),
        niveau: 2,
        threadKey: conv,
        affaireId: c.affaireId ?? null,
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
    if (j.user?.id) {
      setConv(j.user.id);
      setMobileThread(true);
    }
  }

  async function deleteCollaborateur(id: string, nom: string) {
    if (!canDeleteConv(id)) return;
    if (
      !confirm(
        `Retirer ${nom} de l’équipe ?\nIl disparaîtra de la messagerie et du sélecteur AU · ME · VA…`,
      )
    ) {
      return;
    }
    setDeleting(true);
    let r = await fetch('/api/collaborateurs', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (r.status === 405) {
      r = await fetch('/api/collaborateurs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      });
    }
    const j = await r.json().catch(() => ({}));
    setDeleting(false);
    if (!r.ok) {
      alert(j.error ?? 'Suppression impossible');
      return;
    }
    setConvs((prev) => prev.filter((x) => x.id !== id));
    if (conv === id) {
      setConv('gen');
      setMobileThread(false);
    }
    router.refresh();
  }

  return (
    <div className={`wa-page${mobileThread ? ' wa-show-thread' : ''}`}>
      <div className="chat wa">
        <aside className="wa-sidebar" aria-label="Discussions">
          <header className="wa-side-head">
            <div className="wa-side-head-txt">
              <AideLabel aide={AIDES.msgListe} as="div">
                <h2>Discussions</h2>
              </AideLabel>
            </div>
            {canAdd ? (
              <button
                type="button"
                className="wa-icon-btn"
                title="Ajouter un collaborateur"
                aria-label="Ajouter un collaborateur"
                onClick={() => setShowAdd(true)}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
                  <path
                    fill="currentColor"
                    d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"
                  />
                </svg>
              </button>
            ) : null}
          </header>

          <div className="wa-search">
            <span className="wa-search-ico" aria-hidden>
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path
                  fill="currentColor"
                  d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
                />
              </svg>
            </span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher"
              aria-label="Rechercher une discussion"
            />
          </div>

          <div className="wa-convs">
            {filtered.map((x) => (
              <button
                key={x.id}
                type="button"
                className={`wa-conv${conv === x.id ? ' on' : ''}${x.nb ? ' unread' : ''}`}
                onClick={() => selectConv(x.id)}
              >
                <AvatarBubble label={x.avatar} cls={`wa-av ${x.cls}`.trim()} size={49} />
                <span className="wa-conv-body">
                  <span className="wa-conv-top">
                    <span className="wa-conv-name">{x.titre}</span>
                    <span className={`wa-conv-time${x.nb ? ' hi' : ''}`}>{x.hr}</span>
                  </span>
                  <span className="wa-conv-bottom">
                    <span className="wa-conv-last">{x.last}</span>
                    {x.nb ? <span className="wa-badge">{x.nb}</span> : null}
                    {canDeleteConv(x.id) ? (
                      <span
                        className="wa-conv-del"
                        role="button"
                        tabIndex={0}
                        title={`Retirer ${x.titre}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          void deleteCollaborateur(x.id, x.titre);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.stopPropagation();
                            void deleteCollaborateur(x.id, x.titre);
                          }
                        }}
                      >
                        ✕
                      </span>
                    ) : null}
                  </span>
                </span>
              </button>
            ))}
            {!filtered.length ? (
              <p className="wa-empty-list">Aucune discussion</p>
            ) : null}
          </div>
        </aside>

        <section className="wa-main" aria-label="Conversation">
          {c ? (
            <>
              <header className="wa-chat-head">
                <button
                  type="button"
                  className="wa-back"
                  aria-label="Retour aux discussions"
                  onClick={() => setMobileThread(false)}
                >
                  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
                    <path
                      fill="currentColor"
                      d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"
                    />
                  </svg>
                </button>
                <AvatarBubble label={c.avatar} cls={`wa-av ${c.cls}`.trim()} size={40} />
                <div className="wa-chat-head-txt">
                  <h3>{c.titre}</h3>
                  <p>{c.sousTitre}</p>
                </div>
                {canDeleteConv(c.id) ? (
                  <button
                    type="button"
                    className="wa-head-action"
                    disabled={deleting}
                    onClick={() => void deleteCollaborateur(c.id, c.titre)}
                  >
                    Retirer
                  </button>
                ) : c.kind === 'affaire' && c.affaireId ? (
                  <button
                    type="button"
                    className="wa-head-action"
                    style={{ color: 'var(--bleu)', borderColor: 'var(--trait)' }}
                    onClick={() => void openAffaire(c.affaireId!)}
                  >
                    Fiche affaire
                  </button>
                ) : (
                  <AideTip text={AIDES.msgComposer} placement="left" />
                )}
              </header>

              {pin ? (
                <div className="wa-pinned">
                  <span className="wa-pin-ico" aria-hidden>
                    📌
                  </span>
                  <span>
                    <b>Épinglé —</b> {pin}
                  </span>
                </div>
              ) : null}

              <div className="wa-stream" ref={streamRef}>
                {msgs.length === 0 ? (
                  <div className="wa-day-chip">Aucun message pour l’instant</div>
                ) : null}
                {msgs.map((m) => {
                  if (m.systeme) {
                    return (
                      <div className="wa-sys" key={m.id}>
                        {m.texte}
                      </div>
                    );
                  }
                  const mine = m.auteurId === meId;
                  const isImg =
                    m.fichier && /\.(jpe?g|png|webp|gif|heic)$/i.test(m.fichier);
                  return (
                    <div className={`wa-bub${mine ? ' me' : ''}`} key={m.id}>
                      {!mine ? (
                        <span className="wa-bub-author">{m.auteur.nom}</span>
                      ) : null}
                      {m.fichier && isImg ? (
                        <a
                          href={m.fichier}
                          target="_blank"
                          rel="noreferrer"
                          className="wa-photo-link"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={m.fichier}
                            alt={m.photoLabel ?? 'Photo'}
                            className="wa-photo-img"
                          />
                        </a>
                      ) : m.fichier ? (
                        <a
                          href={m.fichier}
                          target="_blank"
                          rel="noreferrer"
                          className="wa-pj"
                        >
                          📎 {m.photoLabel ?? 'Pièce jointe'}
                        </a>
                      ) : m.photoLabel ? (
                        <div className="wa-pj">📷 {m.photoLabel}</div>
                      ) : null}
                      {m.texte ? <p>{m.texte}</p> : null}
                      <span className="wa-bub-meta">
                        {new Date(m.createdAt).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {mine ? (
                          <span className="wa-ticks" aria-hidden>
                            ✓✓
                          </span>
                        ) : null}
                      </span>
                      {m.texte ? (
                        <div className="wa-bub-actions">
                          <button type="button" onClick={() => void makeTask(m)}>
                            + tâche
                          </button>
                          <AideTip text={AIDES.msgTache} placement="left" label="Aide — tâche" />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <div className="wa-composer">
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
                  className="wa-attach"
                  title="Joindre un document"
                  aria-label="Pièce jointe"
                  disabled={uploading}
                  onClick={() => pjRef.current?.click()}
                >
                  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
                    <path
                      fill="currentColor"
                      d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5a2.5 2.5 0 0 1 5 0v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5a2.5 2.5 0 0 0 5 0V5c0-1.93-1.57-3.5-3.5-3.5S8 3.07 8 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-2.5z"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  className="wa-attach"
                  title="Photo"
                  aria-label="Photo"
                  disabled={uploading}
                  onClick={() => photoRef.current?.click()}
                >
                  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
                    <path
                      fill="currentColor"
                      d="M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM4 5h3.1l1.8-2h6.2l1.8 2H20a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm8 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10z"
                    />
                  </svg>
                </button>
                <div className="wa-input-wrap">
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={
                      uploading ? 'Envoi en cours…' : 'Écrire un message'
                    }
                    disabled={uploading}
                    onKeyDown={(e) => e.key === 'Enter' && void send()}
                  />
                </div>
                <button
                  type="button"
                  className="wa-send"
                  onClick={() => void send()}
                  disabled={uploading || !text.trim()}
                  aria-label="Envoyer"
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
                    <path fill="currentColor" d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </button>
              </div>
            </>
          ) : (
            <div className="wa-empty-main">
              <div className="wa-empty-mark">ST</div>
              <h3>Messagerie SETRIM</h3>
              <p>Choisissez une discussion dans la liste</p>
            </div>
          )}
        </section>
      </div>

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
              Il apparaîtra dans la messagerie et dans le sélecteur AU · ME · VA… Mot de passe démo :
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

      {sheetId ? (
        <AffaireSheet
          detail={detail}
          onClose={() => {
            setSheetId(null);
            setDetail(null);
            router.refresh();
          }}
          onRefresh={async () => {
            const r = await fetch(`/api/affaires/${sheetId}`);
            if (r.ok) setDetail(await r.json());
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
