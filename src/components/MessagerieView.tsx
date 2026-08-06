'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCheck, MoreVertical, Search, Send } from 'lucide-react';
import { useApp } from '@/context/AppStateContext';
import { formatFR, formatTime, todayISO, toISODate } from '@/lib/dates';
import { getDevis } from '@/lib/domain/lookups';

type Thread = { id: string; label: string; subtitle?: string };

const AVATAR = ['#00a884', '#027eb5', '#dc6b19', '#7c3aed', '#0d9488'];

function color(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i) * 17) % AVATAR.length;
  return AVATAR[h];
}

export function MessagerieView() {
  const { state, user, sendMessage } = useApp();
  const searchParams = useSearchParams();
  const router = useRouter();
  const initial = searchParams.get('thread') ?? 'general';

  const threads: Thread[] = useMemo(() => {
    const list: Thread[] = [{ id: 'general', label: 'Équipe', subtitle: 'Fil général' }];
    for (const a of state.affaires.filter((x) =>
      ['PORTEFEUILLE', 'PLANIFIE', 'EN_COURS', 'SUSPENDU', 'TERMINE'].includes(x.statut),
    )) {
      const d = getDevis(state, a.devisId);
      const imm = state.immeubles.find((i) => i.id === a.immeubleId);
      list.push({
        id: a.id,
        label: d?.numeroBatappli ?? a.id,
        subtitle: imm ? `${imm.adresse}, ${imm.ville}` : undefined,
      });
    }
    return list;
  }, [state]);

  const [activeId, setActiveId] = useState(
    threads.some((t) => t.id === initial) ? initial : 'general',
  );
  const [mobileShowChat, setMobileShowChat] = useState(Boolean(searchParams.get('thread')));
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = searchParams.get('thread');
    if (t && threads.some((th) => th.id === t)) {
      setActiveId(t);
      setMobileShowChat(true);
    }
  }, [searchParams, threads]);

  const messages = useMemo(
    () =>
      state.messages
        .filter((m) => m.threadId === activeId || m.affaireId === activeId)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [state.messages, activeId],
  );

  const active = threads.find((t) => t.id === activeId) ?? threads[0];
  const filtered = threads.filter(
    (th) =>
      !query.trim() ||
      th.label.toLowerCase().includes(query.toLowerCase()) ||
      (th.subtitle?.toLowerCase().includes(query.toLowerCase()) ?? false),
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeId]);

  function selectThread(id: string) {
    setActiveId(id);
    setMobileShowChat(true);
    router.replace(`/messagerie?thread=${encodeURIComponent(id)}`, { scroll: false });
  }

  function handleSend() {
    if (!text.trim()) return;
    sendMessage(activeId, text, activeId === 'general' ? undefined : activeId);
    setText('');
  }

  if (!user) return null;

  return (
    <div className="wa flex h-[calc(100dvh-8.5rem)] min-h-[480px] overflow-hidden rounded-lg border border-[#d1d7db] bg-white shadow-md">
      <aside
        className={`w-full shrink-0 border-r border-[#e9edef] sm:w-[340px] ${
          mobileShowChat ? 'hidden sm:flex sm:flex-col' : 'flex flex-col'
        }`}
      >
        <div className="bg-[#f0f2f5] px-4 py-3">
          <p className="text-[16px] font-semibold text-[#111b21]">Discussions</p>
          <p className="text-[12px] text-[#667781]">{user.nom}</p>
        </div>
        <div className="px-3 py-2">
          <label className="flex items-center gap-3 rounded-lg bg-[#f0f2f5] px-3 py-1.5">
            <Search size={16} className="text-[#54656f]" />
            <input
              className="w-full bg-transparent py-1.5 text-[14px] outline-none"
              placeholder="Rechercher"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>
        <ul className="flex-1 overflow-y-auto">
          {filtered.map((th) => {
            const last = [...state.messages]
              .filter((m) => m.threadId === th.id || m.affaireId === th.id)
              .sort((a, b) => b.date.localeCompare(a.date))[0];
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
                    className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-semibold text-white"
                    style={{ background: color(th.id) }}
                  >
                    {th.label.slice(0, 2)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex justify-between gap-2">
                      <span className="truncate font-medium">{th.label}</span>
                      {last ? (
                        <span className="shrink-0 text-[12px] text-[#667781]">
                          {formatTime(last.date)}
                        </span>
                      ) : null}
                    </span>
                    <span className="block truncate text-[13px] text-[#667781]">
                      {last?.corps ?? th.subtitle ?? 'Aucun message'}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <section
        className={`flex min-w-0 flex-1 flex-col ${mobileShowChat ? 'flex' : 'hidden sm:flex'}`}
      >
        <header className="flex items-center gap-3 bg-[#f0f2f5] px-3 py-2.5">
          <button
            type="button"
            className="sm:hidden"
            onClick={() => setMobileShowChat(false)}
            aria-label="Retour"
          >
            <ArrowLeft size={22} />
          </button>
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white"
            style={{ background: color(active?.id ?? 'x') }}
          >
            {active?.label.slice(0, 2)}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-medium">{active?.label}</h3>
            <p className="truncate text-[13px] text-[#667781]">{active?.subtitle}</p>
          </div>
          <MoreVertical size={20} className="text-[#54656f]" />
        </header>

        <div className="wa-wallpaper flex-1 overflow-y-auto px-2 py-3 sm:px-8">
          {messages.map((m) => {
            const mine = m.auteurId === user.id;
            const author = state.utilisateurs.find((u) => u.id === m.auteurId);
            return (
              <div key={m.id} className={`mb-1 flex ${mine ? 'justify-end' : 'justify-start'}`}>
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
                  <p className="whitespace-pre-wrap text-[14.5px] text-[#111b21]">{m.corps}</p>
                  <span className="mt-0.5 flex items-center justify-end gap-1">
                    <span className="text-[11px] text-[#667781]">{formatTime(m.date)}</span>
                    {mine ? <CheckCheck size={14} className="text-[#53bdeb]" /> : null}
                  </span>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <form
          className="flex items-end gap-2 bg-[#f0f2f5] px-2 py-2"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <textarea
            className="max-h-32 min-h-[44px] flex-1 resize-none rounded-[24px] bg-white px-4 py-3 text-[15px] outline-none"
            rows={1}
            placeholder="Écrire un message"
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
            disabled={!text.trim()}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-[#00a884] text-white disabled:opacity-40"
          >
            <Send size={20} />
          </button>
        </form>
      </section>
    </div>
  );
}

// keep format helpers referenced for future date separators
void todayISO;
void toISODate;
void formatFR;
