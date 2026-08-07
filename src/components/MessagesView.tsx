'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

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
  const [form, setForm] = useState({
    nom: '',
    initiales: '',
    email: '',
    role: 'assistante',
    terrain: false,
  });
  const streamRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const c = convs.find((x) => x.id === conv) ?? convs[0];

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
    // Ouvrir le fil du nouveau collaborateur
    if (j.user?.id) setConv(j.user.id);
  }

  return (
    <>
      <p className="hint" style={{ marginBottom: 12 }}>
        Messagerie interne uniquement : le fil <b>Équipe SETRIM</b> et le direct entre collègues.
        Aucun fil chantier ici — les échanges de chantier restent dans la fiche affaire. Zéro mail.
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
              className={`conv${conv === x.id ? ' on' : ''}`}
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
              </span>
            </div>
          ))}
        </div>
        <div className="thread">
          <div className="th-head">
            <span className={`av ${c?.cls}`}>{c?.avatar}</span>
            <span>
              <h4>{c?.titre}</h4>
              <p>{c?.sousTitre}</p>
            </span>
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
              return (
                <div className={`bub${mine ? ' me' : ''}`} key={m.id}>
                  <div className="au">{m.auteur.nom}</div>
                  {m.photoLabel ? <div className="photo">📷 {m.photoLabel}</div> : null}
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
            <span className="ic">📎</span>
            <span className="ic">📷</span>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`Écrire à ${c?.titre ?? ''}…`}
              onKeyDown={(e) => e.key === 'Enter' && send()}
            />
            <button type="button" className="send" onClick={send}>
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
