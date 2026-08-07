'use client';

import { useEffect, useRef, useState } from 'react';
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
  convs,
  initialThread,
  meId,
}: {
  convs: Conv[];
  initialThread: string;
  meId: string;
}) {
  const [conv, setConv] = useState(initialThread);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [pin, setPin] = useState('');
  const [text, setText] = useState('');
  const streamRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const c = convs.find((x) => x.id === conv) ?? convs[0];

  async function load(id: string) {
    const r = await fetch(`/api/messages?thread=${encodeURIComponent(id)}`);
    if (!r.ok) return;
    const j = await r.json();
    setMsgs(j.messages);
    setPin(j.pin ?? '');
  }

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

  return (
    <>
      <p className="hint" style={{ marginBottom: 12 }}>
        La messagerie de l&apos;entreprise. Un fil par chantier, un fil général, et le direct entre
        collègues. Denis et Philippe répondent du toit, photos comprises. Aucun échange ne part par
        mail.
      </p>
      <div className="chat">
        <div className="conv-list">
          <div className="conv-search">
            <input placeholder="Rechercher un chantier, un collègue…" />
          </div>
          {convs.map((x) => (
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
        La différence avec un groupe WhatsApp : chaque message peut devenir une tâche datée,
        rattachée au bon chantier, avec son alerte. Survolez un message.
      </p>
    </>
  );
}
