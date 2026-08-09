'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AvatarBubble } from '@/components/AvatarBubble';
import { AideLabel } from '@/components/AideTip';
import { AIDES } from '@/lib/aides';
import {
  formatDaySeparator,
  formatThreadTime,
  loadMsgPrefs,
  prenom,
  saveMsgPrefs,
  sameDay,
  toggleInList,
  type MsgPrefs,
} from '@/lib/messages-prefs';

const BUREAU_IDS = new Set(['audrey', 'melissa', 'valerie', 'denis', 'philippe']);

type ConvKind = 'gen' | 'user' | 'affaire';
type LastKind = 'text' | 'photo' | 'doc' | 'action' | 'empty';
type RailMode = 'messages' | 'chantiers' | 'archived' | 'pinned';
type ListFilter = 'tous' | 'chantiers' | 'directs' | 'nonlus';

type Conv = {
  id: string;
  kind?: ConvKind;
  affaireId?: string | null;
  affaireStatut?: string | null;
  titre: string;
  sousTitre: string;
  avatar: string;
  photo?: string | null;
  cls: string;
  pinNote?: string;
  last: string;
  lastKind?: LastKind;
  lastAuthor?: string | null;
  lastAt?: string | null;
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

type MentionUser = { id: string; nom: string; initiales: string };

export function MessagesView({
  convs: initialConvs,
  initialThread,
  meId,
  meAvatar,
  meNom,
  canAdd,
  mentionUsers,
}: {
  convs: Conv[];
  initialThread: string | null;
  meId: string;
  meAvatar: string;
  meNom: string;
  canAdd: boolean;
  mentionUsers: MentionUser[];
}) {
  const [convs, setConvs] = useState(initialConvs);
  const [conv, setConv] = useState<string | null>(initialThread);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [pinNote, setPinNote] = useState('');
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [rail, setRail] = useState<RailMode>('messages');
  const [listFilter, setListFilter] = useState<ListFilter>('tous');
  const [prefs, setPrefs] = useState<MsgPrefs>(() => loadMsgPrefs());
  const [mobileThread, setMobileThread] = useState(!!initialThread);
  const [showAdd, setShowAdd] = useState(false);
  const [addErr, setAddErr] = useState('');
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [ctxMsg, setCtxMsg] = useState<Msg | null>(null);
  const [actionModal, setActionModal] = useState<Msg | null>(null);
  const [actionTitre, setActionTitre] = useState('');
  const [actionResp, setActionResp] = useState(meId);
  const [actionEcheance, setActionEcheance] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [actionBusy, setActionBusy] = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQ, setMentionQ] = useState('');
  const [form, setForm] = useState({
    nom: '',
    initiales: '',
    email: '',
    role: 'assistante',
    terrain: false,
  });

  const streamRef = useRef<HTMLDivElement>(null);
  const pjRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const c = conv ? (convs.find((x) => x.id === conv) ?? null) : null;

  const persist = useCallback((next: MsgPrefs) => {
    setPrefs(next);
    saveMsgPrefs(next);
  }, []);

  function canDeleteConv(id: string) {
    const c0 = convs.find((x) => x.id === id);
    if (c0?.kind === 'affaire' || c0?.kind === 'gen') return false;
    return canAdd && id !== 'gen' && id !== meId && !BUREAU_IDS.has(id);
  }

  const totalUnread = useMemo(() => {
    return convs.reduce((n, x) => {
      if (prefs.muted.includes(x.id) || prefs.archived.includes(x.id)) return n;
      const lr = prefs.lastRead[x.id];
      if (!x.lastAt) return n;
      if (!lr || new Date(x.lastAt) > new Date(lr)) return n + 1;
      return n;
    }, 0);
  }, [convs, prefs]);

  function unreadCount(x: Conv): number {
    if (prefs.muted.includes(x.id)) return 0;
    const lr = prefs.lastRead[x.id];
    if (!x.lastAt) return 0;
    if (!lr || new Date(x.lastAt) > new Date(lr)) return 1;
    return 0;
  }

  const filtered = useMemo(() => {
    let list = [...convs];

    if (rail === 'chantiers') list = list.filter((x) => x.kind === 'affaire');
    else if (rail === 'archived') list = list.filter((x) => prefs.archived.includes(x.id));
    else if (rail === 'pinned') list = list.filter((x) => prefs.pinned.includes(x.id));
    else list = list.filter((x) => !prefs.archived.includes(x.id));

    if (listFilter === 'chantiers') list = list.filter((x) => x.kind === 'affaire');
    if (listFilter === 'directs') list = list.filter((x) => x.kind === 'user');
    if (listFilter === 'nonlus') list = list.filter((x) => unreadCount(x) > 0);

    const s = q.trim().toLowerCase();
    if (s) {
      list = list.filter(
        (x) =>
          x.titre.toLowerCase().includes(s) ||
          x.sousTitre.toLowerCase().includes(s) ||
          x.avatar.toLowerCase().includes(s) ||
          x.last.toLowerCase().includes(s),
      );
    }

    list.sort((a, b) => {
      const pa = prefs.pinned.includes(a.id) ? 1 : 0;
      const pb = prefs.pinned.includes(b.id) ? 1 : 0;
      if (pa !== pb) return pb - pa;
      const ta = a.lastAt ? new Date(a.lastAt).getTime() : 0;
      const tb = b.lastAt ? new Date(b.lastAt).getTime() : 0;
      return tb - ta;
    });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convs, q, rail, listFilter, prefs]);

  const mentionHits = useMemo(() => {
    if (!mentionOpen) return [];
    const s = mentionQ.toLowerCase();
    return mentionUsers
      .filter((u) => u.id !== meId)
      .filter(
        (u) =>
          !s ||
          u.nom.toLowerCase().includes(s) ||
          u.initiales.toLowerCase().includes(s),
      )
      .slice(0, 6);
  }, [mentionOpen, mentionQ, mentionUsers, meId]);

  async function load(id: string) {
    const c0 = convs.find((x) => x.id === id);
    const qs = new URLSearchParams({ thread: id });
    if (c0?.affaireId) qs.set('affaireId', c0.affaireId);
    const r = await fetch(`/api/messages?${qs}`);
    if (!r.ok) return;
    const j = await r.json();
    setMsgs(j.messages);
    setPinNote(j.pin ?? '');
    setPrefs((prev) => {
      const next = {
        ...prev,
        lastRead: { ...prev.lastRead, [id]: new Date().toISOString() },
      };
      saveMsgPrefs(next);
      return next;
    });
  }

  useEffect(() => {
    setConvs(initialConvs);
  }, [initialConvs]);

  useEffect(() => {
    setConv(initialThread);
    if (initialThread) setMobileThread(true);
  }, [initialThread]);

  useEffect(() => {
    if (!conv) {
      setMsgs([]);
      return;
    }
    void load(conv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conv]);

  useEffect(() => {
    if (streamRef.current) streamRef.current.scrollTop = streamRef.current.scrollHeight;
  }, [msgs]);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    const max = 5 * 24;
    ta.style.height = `${Math.min(ta.scrollHeight, max)}px`;
  }, [text]);

  function selectConv(id: string) {
    setConv(id);
    setMobileThread(true);
    setCtxMsg(null);
    router.replace(`/messages?thread=${encodeURIComponent(id)}`, { scroll: false });
  }

  function clearConv() {
    setConv(null);
    setMobileThread(false);
    router.replace('/messages', { scroll: false });
  }

  function previewLine(x: Conv): string {
    const kind = x.lastKind ?? 'text';
    let body = x.last;
    if (kind === 'photo') body = `📷 ${x.last}`;
    else if (kind === 'doc') body = `📎 ${x.last}`;
    else if (kind === 'action') body = `✓ ${x.last}`;
    if ((x.kind === 'gen' || x.kind === 'affaire') && x.lastAuthor && kind !== 'empty') {
      const p = prenom(x.lastAuthor);
      if (!body.startsWith(p)) return `${p} : ${body}`;
    }
    return body;
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
    setMentionOpen(false);
    await load(conv!);
    router.refresh();
  }

  async function sendFile(file: File) {
    if (!c || !conv) return;
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
      const isImg = /\.(jpe?g|png|webp|gif|heic)$/i.test(j.name ?? file.name);
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadKey: conv,
          affaireId: c.affaireId ?? null,
          photoLabel: j.name,
          fichier: j.url,
          texte: isImg ? text.trim() || null : text.trim() || `Pièce jointe : ${j.name}`,
        }),
      });
      setText('');
      await load(conv);
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  function onTextChange(v: string) {
    setText(v);
    const m = v.match(/@(\w*)$/);
    if (m) {
      setMentionOpen(true);
      setMentionQ(m[1] ?? '');
    } else {
      setMentionOpen(false);
      setMentionQ('');
    }
  }

  function insertMention(u: MentionUser) {
    const next = text.replace(/@(\w*)$/, `@${prenom(u.nom)} `);
    setText(next);
    setMentionOpen(false);
    taRef.current?.focus();
  }

  function onComposerKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  function openAction(m: Msg) {
    setCtxMsg(null);
    setActionModal(m);
    setActionTitre((m.texte ?? '').slice(0, 120));
    setActionResp(meId);
    const d = new Date();
    d.setDate(d.getDate() + 1);
    setActionEcheance(d.toISOString().slice(0, 10));
  }

  async function submitAction(e: React.FormEvent) {
    e.preventDefault();
    if (!actionModal || !conv || !actionTitre.trim()) return;
    setActionBusy(true);
    const r = await fetch('/api/taches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titre: actionTitre.trim().slice(0, 120),
        niveau: 2,
        threadKey: conv,
        affaireId: c?.affaireId ?? null,
        responsableId: actionResp,
        dateEcheance: actionEcheance,
        fromMessage: true,
      }),
    });
    setActionBusy(false);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      alert(j.error ?? 'Impossible de créer l’action');
      return;
    }
    persist({
      ...prefs,
      actionMsgs: prefs.actionMsgs.includes(actionModal.id)
        ? prefs.actionMsgs
        : [...prefs.actionMsgs, actionModal.id],
    });
    setActionModal(null);
    await load(conv);
    router.refresh();
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
    if (j.user?.id) selectConv(j.user.id);
  }

  async function deleteCollaborateur(id: string, nom: string) {
    if (!canDeleteConv(id)) return;
    if (!confirm(`Retirer ${nom} de l’équipe ?`)) return;
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
    if (conv === id) clearConv();
    router.refresh();
  }

  function togglePin(id: string) {
    persist({ ...prefs, pinned: toggleInList(prefs.pinned, id) });
  }
  function toggleMute(id: string) {
    persist({ ...prefs, muted: toggleInList(prefs.muted, id) });
  }
  function toggleArchive(id: string) {
    const nextArch = toggleInList(prefs.archived, id);
    persist({ ...prefs, archived: nextArch });
    if (nextArch.includes(id) && conv === id) clearConv();
  }

  return (
    <div className={`wa-page${mobileThread && conv ? ' wa-show-thread' : ''}`}>
      <div className="chat wa wa-desk">
        {/* Rail */}
        <nav className="wa-rail" aria-label="Messagerie">
          <button
            type="button"
            className={`wa-rail-btn${rail === 'messages' ? ' on' : ''}`}
            title="Messages"
            aria-label="Messages"
            onClick={() => {
              setRail('messages');
              setListFilter('tous');
            }}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
              <path
                fill="currentColor"
                d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"
              />
            </svg>
            {totalUnread > 0 ? (
              <span className="wa-rail-badge">{totalUnread > 99 ? '99+' : totalUnread}</span>
            ) : null}
          </button>
          <button
            type="button"
            className={`wa-rail-btn${rail === 'chantiers' ? ' on' : ''}`}
            title="Chantiers"
            aria-label="Chantiers"
            onClick={() => {
              setRail('chantiers');
              setListFilter('chantiers');
            }}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
              <path
                fill="currentColor"
                d="M12 3 2 12h3v8h6v-6h2v6h6v-8h3L12 3z"
              />
            </svg>
          </button>
          <button
            type="button"
            className={`wa-rail-btn${rail === 'archived' ? ' on' : ''}`}
            title="Archivées"
            aria-label="Archivées"
            onClick={() => setRail('archived')}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
              <path
                fill="currentColor"
                d="M20.54 5.23 19.15 3.55A1.5 1.5 0 0 0 17.96 3H6.04c-.47 0-.92.22-1.19.55L3.46 5.23A2 2 0 0 0 3 6.5V19a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.5c0-.47-.18-.92-.46-1.27zM12 17.5 6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12.14l.81 1H5.12z"
              />
            </svg>
          </button>
          <button
            type="button"
            className={`wa-rail-btn${rail === 'pinned' ? ' on' : ''}`}
            title="Épinglées"
            aria-label="Épinglées"
            onClick={() => setRail('pinned')}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
              <path
                fill="currentColor"
                d="m16 12 2 2v2h-5v6l-1 1-1-1v-6H6v-2l2-2V5H7V3h10v2h-1v7z"
              />
            </svg>
          </button>
          <div className="wa-rail-spacer" />
          <div className="wa-rail-me" title={meNom}>
            <AvatarBubble label={meAvatar} size={40} cls="wa-av" />
          </div>
        </nav>

        {/* Liste */}
        <aside className="wa-sidebar" aria-label="Discussions">
          <header className="wa-side-head">
            <AideLabel aide={AIDES.msgListe} as="div">
              <h2>Messages</h2>
            </AideLabel>
            {canAdd ? (
              <button
                type="button"
                className="wa-icon-btn"
                title="Nouvelle discussion"
                aria-label="Nouvelle discussion"
                onClick={() => setShowAdd(true)}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
                  <path
                    fill="currentColor"
                    d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
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

          {rail === 'messages' ? (
            <div className="wa-filters" role="tablist" aria-label="Filtres">
              {(
                [
                  ['tous', 'Tous'],
                  ['chantiers', 'Chantiers'],
                  ['directs', 'Directs'],
                  ['nonlus', 'Non lus'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={listFilter === id}
                  className={listFilter === id ? 'on' : ''}
                  onClick={() => setListFilter(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}

          <div className="wa-convs">
            {filtered.map((x) => {
              const unread = unreadCount(x);
              const muted = prefs.muted.includes(x.id);
              const pinned = prefs.pinned.includes(x.id);
              const selected = conv === x.id;
              return (
                <button
                  key={x.id}
                  type="button"
                  className={`wa-conv${selected ? ' on' : ''}${unread ? ' unread' : ''}`}
                  onClick={() => selectConv(x.id)}
                >
                  <AvatarBubble label={x.avatar} cls={`wa-av ${x.cls}`.trim()} size={48} />
                  <span className="wa-conv-body">
                    <span className="wa-conv-top">
                      <span className="wa-conv-name">
                        {pinned ? (
                          <span className="wa-pin-mini" aria-hidden title="Épinglé">
                            📌
                          </span>
                        ) : null}
                        {x.titre}
                      </span>
                      <span className={`wa-conv-time${unread ? ' hi' : ''}`}>
                        {formatThreadTime(x.lastAt)}
                      </span>
                    </span>
                    <span className="wa-conv-bottom">
                      <span className="wa-conv-last">{previewLine(x)}</span>
                      {muted ? (
                        <span className="wa-mute" title="Sourdine" aria-label="Sourdine">
                          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
                            <path
                              fill="currentColor"
                              d="M12 22c1.1 0 2-.9 2-2h-4a2 2 0 0 0 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4a1.5 1.5 0 0 0-3 0v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zM4.27 3 3 4.27 7.73 9H6v5l-2 2v1h11.73l3 3L20 18.73 4.27 3z"
                            />
                          </svg>
                        </span>
                      ) : unread ? (
                        <span className="wa-badge">{unread}</span>
                      ) : null}
                    </span>
                  </span>
                </button>
              );
            })}
            {!filtered.length ? (
              <p className="wa-empty-list">Aucune discussion</p>
            ) : null}
          </div>
        </aside>

        {/* Conversation */}
        <section className="wa-main" aria-label="Conversation">
          {c && conv ? (
            <>
              <header className="wa-chat-head">
                <button
                  type="button"
                  className="wa-back"
                  aria-label="Retour aux discussions"
                  onClick={clearConv}
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
                  <p>
                    {c.kind === 'affaire' && c.affaireStatut
                      ? `${c.affaireStatut} · ${c.sousTitre}`
                      : c.sousTitre}
                  </p>
                </div>
                <div className="wa-head-actions">
                  {c.kind === 'affaire' && c.affaireId ? (
                    <Link
                      href={`/portefeuille?affaire=${encodeURIComponent(c.affaireId)}`}
                      className="wa-head-link"
                    >
                      Fiche chantier
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    className="wa-icon-btn"
                    title={prefs.pinned.includes(conv) ? 'Désépingler' : 'Épingler'}
                    aria-label="Épingler"
                    onClick={() => togglePin(conv)}
                  >
                    📌
                  </button>
                  <button
                    type="button"
                    className="wa-icon-btn"
                    title={prefs.muted.includes(conv) ? 'Réactiver' : 'Sourdine'}
                    aria-label="Sourdine"
                    onClick={() => toggleMute(conv)}
                  >
                    🔔
                  </button>
                  <button
                    type="button"
                    className="wa-icon-btn"
                    title={prefs.archived.includes(conv) ? 'Désarchiver' : 'Archiver'}
                    aria-label="Archiver"
                    onClick={() => toggleArchive(conv)}
                  >
                    📦
                  </button>
                  {canDeleteConv(c.id) ? (
                    <button
                      type="button"
                      className="wa-head-action"
                      disabled={deleting}
                      onClick={() => void deleteCollaborateur(c.id, c.titre)}
                    >
                      Retirer
                    </button>
                  ) : null}
                </div>
              </header>

              {pinNote ? (
                <div className="wa-pinned">
                  <span className="wa-pin-ico" aria-hidden>
                    📌
                  </span>
                  <span>
                    <b>Épinglé —</b> {pinNote}
                  </span>
                </div>
              ) : null}

              <div className="wa-stream" ref={streamRef}>
                {msgs.length === 0 ? (
                  <div className="wa-day-chip">Aucun message pour l’instant</div>
                ) : null}
                {msgs.map((m, i) => {
                  if (m.systeme) {
                    return (
                      <div className="wa-sys" key={m.id}>
                        {m.texte}
                      </div>
                    );
                  }
                  const prev = msgs[i - 1];
                  const showDay =
                    !prev || !sameDay(prev.createdAt, m.createdAt);
                  const mine = m.auteurId === meId;
                  const isGroup = c.kind === 'gen' || c.kind === 'affaire';
                  const showAuthor =
                    isGroup &&
                    !mine &&
                    (!prev ||
                      prev.systeme ||
                      prev.auteurId !== m.auteurId ||
                      !sameDay(prev.createdAt, m.createdAt));
                  const isImg =
                    m.fichier && /\.(jpe?g|png|webp|gif|heic)$/i.test(m.fichier);
                  const hasAction = prefs.actionMsgs.includes(m.id);
                  return (
                    <div key={m.id}>
                      {showDay ? (
                        <div className="wa-day-chip">{formatDaySeparator(m.createdAt)}</div>
                      ) : null}
                      <div
                        className={`wa-bub${mine ? ' me' : ''}`}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setCtxMsg(m);
                        }}
                        onTouchStart={() => {
                          const t = window.setTimeout(() => setCtxMsg(m), 500);
                          const clear = () => window.clearTimeout(t);
                          window.addEventListener('touchend', clear, { once: true });
                          window.addEventListener('touchmove', clear, { once: true });
                        }}
                      >
                        {showAuthor ? (
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
                            className="wa-doc-card"
                          >
                            <span className="wa-doc-ico" aria-hidden>
                              📄
                            </span>
                            <span className="wa-doc-meta">
                              <strong>{m.photoLabel ?? 'Document'}</strong>
                              <small>Pièce jointe</small>
                            </span>
                          </a>
                        ) : m.photoLabel ? (
                          <div className="wa-pj">📷 {m.photoLabel}</div>
                        ) : null}
                        {m.texte ? <p>{m.texte}</p> : null}
                        {hasAction ? (
                          <Link href="/aujourdhui" className="wa-action-badge">
                            Action créée
                          </Link>
                        ) : null}
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
                        <div className="wa-bub-actions">
                          <button type="button" onClick={() => openAction(m)}>
                            Créer une action
                          </button>
                        </div>
                      </div>
                      {ctxMsg?.id === m.id ? (
                        <div className="wa-ctx">
                          <button type="button" onClick={() => openAction(m)}>
                            Créer une action
                          </button>
                          <button type="button" onClick={() => setCtxMsg(null)}>
                            Fermer
                          </button>
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
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    if (f) void sendFile(f);
                  }}
                />
                <button
                  type="button"
                  className="wa-attach"
                  title="Joindre"
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
                <div className="wa-input-wrap">
                  {mentionOpen && mentionHits.length ? (
                    <ul className="wa-mention-list" role="listbox">
                      {mentionHits.map((u) => (
                        <li key={u.id}>
                          <button type="button" onClick={() => insertMention(u)}>
                            <AvatarBubble label={u.initiales} size={28} />
                            <span>{u.nom}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <textarea
                    ref={taRef}
                    rows={1}
                    value={text}
                    onChange={(e) => onTextChange(e.target.value)}
                    onKeyDown={onComposerKey}
                    placeholder={
                      uploading ? 'Envoi en cours…' : 'Écrire un message'
                    }
                    disabled={uploading}
                    aria-label="Message"
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-setrim.png"
                alt=""
                className="wa-empty-logo"
                width={140}
                height={40}
              />
              <p>Sélectionnez une discussion</p>
            </div>
          )}
        </section>
      </div>

      {actionModal ? (
        <>
          <div className="scrim on" onClick={() => setActionModal(null)} />
          <div className="wa-action-sheet" role="dialog" aria-labelledby="wa-action-title">
            <button type="button" className="sheet-close" onClick={() => setActionModal(null)}>
              ✕
            </button>
            <span className="eyebrow">Depuis un message</span>
            <h3 id="wa-action-title">Créer une action</h3>
            <form onSubmit={submitAction} className="add-collab-form">
              <label>
                Titre
                <input
                  required
                  value={actionTitre}
                  onChange={(e) => setActionTitre(e.target.value)}
                />
              </label>
              <label>
                Responsable
                <select
                  value={actionResp}
                  onChange={(e) => setActionResp(e.target.value)}
                >
                  {mentionUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nom}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Échéance
                <input
                  type="date"
                  required
                  value={actionEcheance}
                  onChange={(e) => setActionEcheance(e.target.value)}
                />
              </label>
              <button type="submit" className="btn-primary" disabled={actionBusy}>
                {actionBusy ? 'Création…' : 'Créer l’action'}
              </button>
            </form>
          </div>
        </>
      ) : null}

      {showAdd ? (
        <>
          <div className="scrim on" onClick={() => setShowAdd(false)} />
          <div className="add-collab-sheet">
            <button type="button" className="sheet-close" onClick={() => setShowAdd(false)}>
              ✕
            </button>
            <span className="eyebrow">Nouvelle discussion</span>
            <h3>Ajouter un collaborateur</h3>
            <p className="hint">Mot de passe démo : setrim2026.</p>
            <form onSubmit={addCollaborateur} className="add-collab-form">
              <label>
                Nom
                <input
                  required
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
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
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
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
                Sur le terrain
              </label>
              {addErr ? <p className="err">{addErr}</p> : null}
              <button type="submit" className="btn-primary" disabled={adding}>
                {adding ? 'Ajout…' : 'Ajouter'}
              </button>
            </form>
          </div>
        </>
      ) : null}
    </div>
  );
}
