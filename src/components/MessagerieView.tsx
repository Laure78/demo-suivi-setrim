'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Camera,
  CheckCheck,
  ListTodo,
  Paperclip,
  Search,
  Send,
  UserPlus,
  X,
} from 'lucide-react';
import { useApp } from '@/context/AppStateContext';
import { formatTime } from '@/lib/dates';
import { getDevis } from '@/lib/domain/lookups';
import {
  compressImageFile,
  dmPartner,
  dmThreadId,
  isDmThread,
  lastMessage,
  messagesInThread,
  unreadCount,
} from '@/lib/domain/messaging';
import { ROLE_LABELS, type Message, type PieceJointe } from '@/lib/domain/types';
import { CreateActionFromMessageModal } from '@/components/CreateActionFromMessageModal';
import Link from 'next/link';

type Thread = {
  id: string;
  label: string;
  subtitle?: string;
  kind: 'general' | 'affaire' | 'dm';
};

const AVATAR = ['#00a884', '#027eb5', '#dc6b19', '#7c3aed', '#0d9488', '#db2777'];

function color(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i) * 17) % AVATAR.length;
  return AVATAR[h];
}

export function MessagerieView() {
  const { state, user, sendMessage, markThreadRead } = useApp();
  const searchParams = useSearchParams();
  const router = useRouter();
  const initial = searchParams.get('thread') ?? 'general';

  const threads: Thread[] = useMemo(() => {
    if (!user) return [];
    const list: Thread[] = [
      { id: 'general', label: 'Équipe', subtitle: 'Fil général — tout le monde', kind: 'general' },
    ];

    for (const a of state.affaires.filter((x) =>
      ['PORTEFEUILLE', 'PLANIFIE', 'EN_COURS', 'SUSPENDU', 'TERMINE'].includes(x.statut),
    )) {
      const d = getDevis(state, a.devisId);
      const imm = state.immeubles.find((i) => i.id === a.immeubleId);
      list.push({
        id: a.id,
        label: d?.numeroBatappli ?? a.id,
        subtitle: imm ? `${imm.adresse}, ${imm.ville}` : 'Fil chantier',
        kind: 'affaire',
      });
    }

    for (const u of state.utilisateurs.filter((x) => x.actif && x.id !== user.id)) {
      const id = dmThreadId(user.id, u.id);
      list.push({
        id,
        label: u.nom,
        subtitle: ROLE_LABELS[u.role],
        kind: 'dm',
      });
    }
    return list;
  }, [state, user]);

  const [activeId, setActiveId] = useState(initial);
  const [mobileShowChat, setMobileShowChat] = useState(Boolean(searchParams.get('thread')));
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [pendingFiles, setPendingFiles] = useState<PieceJointe[]>([]);
  const [uploading, setUploading] = useState(false);
  const [actionFrom, setActionFrom] = useState<Message | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const msgRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const t = searchParams.get('thread');
    if (t) {
      setActiveId(t);
      setMobileShowChat(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (user) markThreadRead(activeId);
  }, [activeId, user, markThreadRead, state.messages.length]);

  const messages = useMemo(
    () => messagesInThread(state.messages, activeId),
    [state.messages, activeId],
  );

  useEffect(() => {
    const msgId = searchParams.get('msg');
    if (!msgId) return;
    const el = msgRefs.current[msgId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-[#00a884]', 'ring-offset-2');
      const t = window.setTimeout(() => {
        el.classList.remove('ring-2', 'ring-[#00a884]', 'ring-offset-2');
      }, 2500);
      return () => window.clearTimeout(t);
    }
  }, [searchParams, messages.length, activeId]);

  const active = threads.find((t) => t.id === activeId) ?? threads[0];
  const filtered = threads.filter(
    (th) =>
      !query.trim() ||
      th.label.toLowerCase().includes(query.toLowerCase()) ||
      (th.subtitle?.toLowerCase().includes(query.toLowerCase()) ?? false),
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeId, pendingFiles.length]);

  function selectThread(id: string) {
    setActiveId(id);
    setMobileShowChat(true);
    router.replace(`/messagerie?thread=${encodeURIComponent(id)}`, { scroll: false });
  }

  async function onPickFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      const next: PieceJointe[] = [];
      for (const f of Array.from(files)) {
        next.push(await compressImageFile(f));
      }
      setPendingFiles((prev) => [...prev, ...next].slice(0, 6));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
      if (cameraRef.current) cameraRef.current.value = '';
    }
  }

  function handleSend() {
    if (!text.trim() && !pendingFiles.length) return;
    const affaireId =
      active?.kind === 'affaire' ? activeId : undefined;
    sendMessage({
      threadId: activeId,
      corps: text,
      affaireId,
      piecesJointes: pendingFiles,
    });
    setText('');
    setPendingFiles([]);
  }

  if (!user) return null;

  return (
    <div className="wa flex h-[calc(100dvh-9rem)] min-h-[480px] overflow-hidden rounded-lg border border-[#d1d7db] bg-white shadow-md sm:h-[calc(100dvh-10rem)]">
      <aside
        className={`w-full shrink-0 border-r border-[#e9edef] sm:w-[340px] md:w-[380px] ${
          mobileShowChat ? 'hidden sm:flex sm:flex-col' : 'flex flex-col'
        }`}
      >
        <div className="flex items-center justify-between bg-[#f0f2f5] px-4 py-3">
          <div>
            <p className="text-[16px] font-semibold text-[#111b21]">Discussions</p>
            <p className="text-[12px] text-[#667781]">{user.nom}</p>
          </div>
          <UserPlus size={18} className="text-[#54656f]" aria-hidden />
        </div>

        <div className="px-3 py-2">
          <label className="flex items-center gap-3 rounded-lg bg-[#f0f2f5] px-3 py-1.5">
            <Search size={16} className="text-[#54656f]" />
            <input
              className="w-full bg-transparent py-1.5 text-[14px] outline-none"
              placeholder="Rechercher fil, chantier, collègue…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>

        <ul className="flex-1 overflow-y-auto">
          {(['general', 'affaire', 'dm'] as const).map((kind) => {
            const group = filtered.filter((t) => t.kind === kind);
            if (!group.length) return null;
            const title =
              kind === 'general' ? null : kind === 'affaire' ? 'Chantiers' : 'Messages directs';
            return (
              <li key={kind}>
                {title ? (
                  <p className="bg-[#f0f2f5] px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#667781]">
                    {title}
                  </p>
                ) : null}
                <ul>
                  {group.map((th) => {
                    const last = lastMessage(state.messages, th.id);
                    const unread = unreadCount(state.messages, th.id, user.id);
                    return (
                      <li key={th.id}>
                        <button
                          type="button"
                          onClick={() => selectThread(th.id)}
                          className={`flex w-full items-center gap-3 px-3 py-3 text-left ${
                            th.id === activeId ? 'bg-[#f0f2f5]' : 'hover:bg-[#f5f6f6]'
                          }`}
                        >
                          <span
                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                            style={{ background: color(th.id) }}
                          >
                            {th.kind === 'dm' ? th.label.slice(0, 1) : th.label.slice(0, 2)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex justify-between gap-2">
                              <span className="truncate font-medium text-[#111b21]">{th.label}</span>
                              {last ? (
                                <span
                                  className={`shrink-0 text-[12px] ${
                                    unread > 0 ? 'font-semibold text-[#25d366]' : 'text-[#667781]'
                                  }`}
                                >
                                  {formatTime(last.date)}
                                </span>
                              ) : null}
                            </span>
                            <span className="mt-0.5 flex items-center justify-between gap-2">
                              <span className="truncate text-[13px] text-[#667781]">
                                {last
                                  ? last.corps ||
                                    (last.piecesJointes[0]?.mime.startsWith('image/')
                                      ? '📷 Photo'
                                      : '📎 Fichier')
                                  : th.subtitle}
                              </span>
                              {unread > 0 ? (
                                <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#25d366] px-1.5 text-[11px] font-bold text-white">
                                  {unread}
                                </span>
                              ) : null}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ul>
      </aside>

      <section
        className={`flex min-w-0 flex-1 flex-col ${mobileShowChat ? 'flex' : 'hidden sm:flex'}`}
      >
        <header className="flex items-center gap-3 bg-[#f0f2f5] px-3 py-2.5 shadow-sm">
          <button
            type="button"
            className="rounded-full p-1.5 text-[#54656f] hover:bg-black/5 sm:hidden"
            onClick={() => setMobileShowChat(false)}
            aria-label="Retour"
          >
            <ArrowLeft size={22} />
          </button>
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
            style={{ background: color(active?.id ?? 'x') }}
          >
            {active?.label.slice(0, 2)}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[16px] font-medium text-[#111b21]">{active?.label}</h3>
            <p className="truncate text-[13px] text-[#667781]">
              {active?.kind === 'dm' && active
                ? ROLE_LABELS[
                    state.utilisateurs.find((u) => u.id === dmPartner(active.id, user.id))
                      ?.role ?? 'assistante'
                  ]
                : active?.subtitle}
            </p>
          </div>
        </header>

        <div className="wa-wallpaper flex-1 overflow-y-auto px-2 py-3 sm:px-8">
          {messages.length === 0 ? (
            <div className="flex justify-center py-10">
              <p className="rounded-lg bg-[#ffeecd] px-4 py-2 text-center text-[13px] text-[#54656f] shadow-sm">
                Aucun message. Écrivez, joignez une photo ou un fichier.
              </p>
            </div>
          ) : null}

          {messages.map((m) => {
            const mine = m.auteurId === user.id;
            const author = state.utilisateurs.find((u) => u.id === m.auteurId);
            return (
              <div
                key={m.id}
                ref={(el) => {
                  msgRefs.current[m.id] = el;
                }}
                className={`mb-1.5 flex ${mine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`wa-bubble max-w-[88%] px-2.5 py-1.5 shadow-sm sm:max-w-[65%] ${
                    m.isImportant
                      ? 'wa-bubble--alert bg-[#ffe6e6]'
                      : mine
                        ? 'wa-bubble--out bg-[#d9fdd3]'
                        : 'wa-bubble--in bg-white'
                  }`}
                >
                  {!mine ? (
                    <p className="text-[13px] font-semibold" style={{ color: color(m.auteurId) }}>
                      {author?.nom}
                    </p>
                  ) : null}
                  {m.piecesJointes?.map((pj) =>
                    pj.mime.startsWith('image/') ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={pj.id}
                        src={pj.dataUrl}
                        alt={pj.nom}
                        className="mb-1 max-h-64 max-w-full rounded-lg object-contain"
                      />
                    ) : (
                      <a
                        key={pj.id}
                        href={pj.dataUrl}
                        download={pj.nom}
                        className="mb-1 flex items-center gap-2 rounded-lg bg-black/5 px-2 py-1.5 text-[13px] underline"
                      >
                        <Paperclip size={14} />
                        {pj.nom}
                      </a>
                    ),
                  )}
                  {m.corps ? (
                    <p className="whitespace-pre-wrap text-[14.5px] text-[#111b21]">{m.corps}</p>
                  ) : null}
                  <span className="mt-0.5 flex items-center justify-end gap-1">
                    <span className="text-[11px] text-[#667781]">{formatTime(m.date)}</span>
                    {mine ? (
                      <CheckCheck
                        size={14}
                        className={
                          m.luPar.length > 1 ? 'text-[#53bdeb]' : 'text-[#667781]'
                        }
                      />
                    ) : null}
                  </span>

                  <div className="mt-1.5 flex flex-wrap gap-1.5 border-t border-black/5 pt-1.5">
                    {m.actionId ? (
                      <Link
                        href={`/mes-actions?action=${encodeURIComponent(m.actionId)}`}
                        className="inline-flex items-center gap-1 rounded-md bg-white/80 px-2 py-1 text-[11px] font-semibold text-[#027eb5] shadow-sm"
                      >
                        <ListTodo size={12} />
                        Voir l’action
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActionFrom(m)}
                        className="inline-flex items-center gap-1 rounded-md bg-white/80 px-2 py-1 text-[11px] font-semibold text-[#111b21] shadow-sm hover:bg-white"
                      >
                        <ListTodo size={12} />
                        Créer une action
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {actionFrom ? (
          <CreateActionFromMessageModal
            message={actionFrom}
            onClose={() => setActionFrom(null)}
          />
        ) : null}

        {pendingFiles.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto bg-[#f0f2f5] px-3 pt-2">
            {pendingFiles.map((pj) => (
              <div key={pj.id} className="relative shrink-0">
                {pj.mime.startsWith('image/') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pj.dataUrl}
                    alt=""
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-white text-[10px]">
                    Fichier
                  </div>
                )}
                <button
                  type="button"
                  className="absolute -right-1 -top-1 rounded-full bg-slate-800 p-0.5 text-white"
                  onClick={() => setPendingFiles((p) => p.filter((x) => x.id !== pj.id))}
                  aria-label="Retirer"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <form
          className="flex items-end gap-1.5 bg-[#f0f2f5] px-2 py-2 sm:gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx"
            multiple
            className="hidden"
            onChange={(e) => void onPickFiles(e.target.files)}
          />
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => void onPickFiles(e.target.files)}
          />
          <button
            type="button"
            className="mb-1 rounded-full p-2 text-[#54656f] hover:bg-black/5"
            onClick={() => cameraRef.current?.click()}
            aria-label="Photo (camion)"
            disabled={uploading}
          >
            <Camera size={22} />
          </button>
          <button
            type="button"
            className="mb-1 rounded-full p-2 text-[#54656f] hover:bg-black/5"
            onClick={() => fileRef.current?.click()}
            aria-label="Joindre un fichier"
            disabled={uploading}
          >
            <Paperclip size={22} />
          </button>
          <textarea
            className="max-h-32 min-h-[44px] flex-1 resize-none rounded-[24px] bg-white px-4 py-3 text-[15px] outline-none"
            rows={1}
            placeholder={uploading ? 'Compression…' : 'Écrire un message'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            type="submit"
            disabled={(!text.trim() && !pendingFiles.length) || uploading}
            className="mb-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white disabled:opacity-40"
            aria-label="Envoyer"
          >
            <Send size={20} />
          </button>
        </form>
      </section>
    </div>
  );
}

// silence unused in tree-shake edge cases
void isDmThread;
