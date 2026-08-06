'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, AlertTriangle, Send } from 'lucide-react';
import { useApp } from '@/context/AppStateContext';
import {
  GENERAL_THREAD_ID,
  getLastMessage,
  getThreadMessages,
  listThreads,
  unreadForUser,
} from '@/lib/messaging';
import { formatShortDateTime } from '@/lib/dates';

export function MessagerieView() {
  const { state, activeUserId, activeUserName, sendMessage, markThreadRead } = useApp();
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialThread = searchParams.get('thread') ?? GENERAL_THREAD_ID;

  const threads = useMemo(() => listThreads(state.chantiers), [state.chantiers]);
  const myUnread = useMemo(
    () => unreadForUser(state.unreadByUser, activeUserId),
    [state.unreadByUser, activeUserId],
  );
  const [activeThreadId, setActiveThreadId] = useState(
    threads.some((t) => t.id === initialThread) ? initialThread : GENERAL_THREAD_ID,
  );
  /** Mobile : liste OU conversation (pas les deux). */
  const [mobileShowChat, setMobileShowChat] = useState(Boolean(searchParams.get('thread')));
  const [text, setText] = useState('');
  const [important, setImportant] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = searchParams.get('thread');
    if (t && threads.some((th) => th.id === t)) {
      setActiveThreadId(t);
      setMobileShowChat(true);
    }
  }, [searchParams, threads]);

  useEffect(() => {
    markThreadRead(activeThreadId);
  }, [activeThreadId, activeUserId, markThreadRead]);

  const messages = useMemo(
    () => getThreadMessages(state.messages, activeThreadId),
    [state.messages, activeThreadId],
  );

  const activeThread = threads.find((t) => t.id === activeThreadId) ?? threads[0];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeThreadId]);

  function selectThread(id: string) {
    setActiveThreadId(id);
    setMobileShowChat(true);
    router.replace(`/messagerie?thread=${encodeURIComponent(id)}`, { scroll: false });
  }

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    sendMessage(activeThreadId, text, important);
    setText('');
    setImportant(false);
  }

  return (
    <div className="flex h-[calc(100dvh-9.5rem)] min-h-[420px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:h-[calc(100dvh-10.5rem)]">
      <aside
        className={`w-full shrink-0 border-r border-slate-200 sm:w-72 md:w-80 ${
          mobileShowChat ? 'hidden sm:flex sm:flex-col' : 'flex flex-col'
        }`}
      >
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-base font-bold text-[var(--navy)]">Conversations</h2>
          <p className="text-xs text-slate-500">Équipe + un fil par chantier</p>
        </div>
        <ul className="flex-1 overflow-y-auto">
          {threads.map((th) => {
            const unread = myUnread[th.id] ?? 0;
            const last = getLastMessage(state.messages, th.id);
            const selected = th.id === activeThreadId;
            return (
              <li key={th.id}>
                <button
                  type="button"
                  onClick={() => selectThread(th.id)}
                  className={`flex w-full items-start gap-3 px-4 py-3.5 text-left transition ${
                    selected
                      ? 'bg-[var(--navy-soft)]'
                      : 'hover:bg-slate-50 active:bg-slate-100'
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      th.kind === 'general'
                        ? 'bg-[var(--navy)] text-white'
                        : 'bg-slate-200 text-[var(--navy)]'
                    }`}
                  >
                    {th.kind === 'general' ? 'É' : th.label.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate font-semibold text-slate-900">{th.label}</span>
                      {unread > 0 ? (
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                          {unread}
                        </span>
                      ) : null}
                    </span>
                    {th.subtitle ? (
                      <span className="block truncate text-xs text-slate-500">{th.subtitle}</span>
                    ) : null}
                    {last ? (
                      <span className="mt-0.5 block truncate text-xs text-slate-500">
                        {last.isImportant ? '⚠ ' : ''}
                        {last.authorName} : {last.text}
                      </span>
                    ) : (
                      <span className="mt-0.5 block text-xs text-slate-400">Aucun message</span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <section
        className={`flex min-w-0 flex-1 flex-col ${
          mobileShowChat ? 'flex' : 'hidden sm:flex'
        }`}
      >
        <header className="flex items-center gap-2 border-b border-slate-100 px-3 py-3 sm:px-4">
          <button
            type="button"
            className="rounded-lg p-2 text-[var(--navy)] hover:bg-slate-100 sm:hidden"
            onClick={() => setMobileShowChat(false)}
            aria-label="Retour aux conversations"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-[var(--navy)]">
              {activeThread?.label}
            </h3>
            {activeThread?.subtitle ? (
              <p className="truncate text-xs text-slate-500">{activeThread.subtitle}</p>
            ) : null}
          </div>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/80 px-3 py-4 sm:px-4">
          {messages.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Aucun message. Écrivez le premier.
            </p>
          ) : null}

          {messages.map((m) => {
            const mine = m.authorId === activeUserId;
            return (
              <div
                key={m.id}
                className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-sm sm:max-w-[70%] ${
                    m.isImportant
                      ? 'border-2 border-red-400 bg-[var(--danger-bg)]'
                      : mine
                        ? 'bg-[var(--navy)] text-white'
                        : 'bg-white text-slate-900'
                  }`}
                >
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span
                      className={`text-xs font-bold ${
                        m.isImportant
                          ? 'text-red-800'
                          : mine
                            ? 'text-blue-100'
                            : 'text-[var(--navy)]'
                      }`}
                    >
                      {m.authorName}
                    </span>
                    {m.isImportant ? (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                        <AlertTriangle size={10} />
                        Alerte
                      </span>
                    ) : null}
                    <span
                      className={`text-[10px] ${
                        m.isImportant
                          ? 'text-red-700'
                          : mine
                            ? 'text-blue-200'
                            : 'text-slate-400'
                      }`}
                    >
                      {formatShortDateTime(m.createdAt)}
                    </span>
                  </div>
                  <p
                    className={`whitespace-pre-wrap text-sm leading-relaxed ${
                      m.isImportant ? 'font-medium text-red-950' : ''
                    }`}
                  >
                    {m.text}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={handleSend}
          className="border-t border-slate-200 bg-white px-3 py-3 sm:px-4"
        >
          <label className="mb-2 flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-red-600"
              checked={important}
              onChange={(e) => setImportant(e.target.checked)}
            />
            <span className="font-medium text-slate-700">
              Marquer comme alerte importante
            </span>
          </label>
          <div className="flex items-end gap-2">
            <textarea
              className="input min-h-[48px] flex-1 resize-none py-3"
              rows={2}
              placeholder="Écrire un message…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
            />
            <button
              type="submit"
              className="btn-primary h-12 w-12 shrink-0 rounded-full p-0 disabled:opacity-40"
              aria-label="Envoyer"
              disabled={!text.trim()}
            >
              <Send size={18} />
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500">
            Envoyé en tant que <strong>{activeUserName}</strong>
          </p>
        </form>
      </section>
    </div>
  );
}
