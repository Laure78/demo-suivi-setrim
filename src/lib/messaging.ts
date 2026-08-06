/**
 * Module messagerie — logique d'envoi / lecture isolée.
 *
 * Aujourd'hui : opérations pures sur un store en mémoire (persisté via localStorage
 * côté AppState). Demain : remplacer les appels du contexte par un client API
 * temps réel (WebSocket / SSE) sans toucher aux composants UI.
 */

import type { Chantier, Message, UserId } from './types';
import { USERS } from './users';
import { uid } from './chantier-helpers';

export const GENERAL_THREAD_ID = 'general';

export type MessagingSlice = {
  messages: Message[];
  unreadByUser: Record<string, Record<string, number>>;
};

export type ThreadInfo = {
  id: string;
  label: string;
  subtitle?: string;
  kind: 'general' | 'chantier';
};

export type SendMessageInput = {
  threadId: string;
  text: string;
  isImportant: boolean;
  authorId: UserId;
  authorName: string;
};

/** Liste des fils : général + un par chantier. */
export function listThreads(chantiers: Chantier[]): ThreadInfo[] {
  return [
    {
      id: GENERAL_THREAD_ID,
      label: 'Équipe',
      subtitle: 'Fil général',
      kind: 'general',
    },
    ...chantiers.map((c) => ({
      id: c.id,
      label: c.title,
      subtitle: c.client,
      kind: 'chantier' as const,
    })),
  ];
}

export function createMessage(input: SendMessageInput): Message {
  return {
    id: uid('msg'),
    threadId: input.threadId,
    authorId: input.authorId,
    authorName: input.authorName,
    text: input.text.trim(),
    createdAt: new Date().toISOString(),
    isImportant: input.isImportant,
  };
}

/**
 * Ajoute un message et incrémente les non-lus des autres utilisateurs.
 * Point d'extension futur : POST /messages puis merge de la réponse serveur.
 */
export function sendMessage(
  store: MessagingSlice,
  input: SendMessageInput,
): MessagingSlice {
  const text = input.text.trim();
  if (!text) return store;

  const message = createMessage(input);
  const unreadByUser = { ...store.unreadByUser };

  for (const u of USERS) {
    if (u.id === input.authorId) continue;
    const forUser = { ...(unreadByUser[u.id] ?? {}) };
    forUser[input.threadId] = (forUser[input.threadId] ?? 0) + 1;
    unreadByUser[u.id] = forUser;
  }

  return {
    messages: [...store.messages, message],
    unreadByUser,
  };
}

/**
 * Remet à zéro les non-lus d'un fil pour un utilisateur.
 * Point d'extension futur : POST /threads/:id/read
 */
export function markThreadRead(
  store: MessagingSlice,
  userId: UserId,
  threadId: string,
): MessagingSlice {
  const forUser = store.unreadByUser[userId] ?? {};
  if ((forUser[threadId] ?? 0) === 0) return store;

  return {
    ...store,
    unreadByUser: {
      ...store.unreadByUser,
      [userId]: { ...forUser, [threadId]: 0 },
    },
  };
}

/** Messages d'un fil : importants en tête, puis chrono croissant. */
export function getThreadMessages(messages: Message[], threadId: string): Message[] {
  const thread = messages.filter((m) => m.threadId === threadId);
  const important = thread
    .filter((m) => m.isImportant)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const normal = thread
    .filter((m) => !m.isImportant)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return [...important, ...normal];
}

export function getLastMessage(
  messages: Message[],
  threadId: string,
): Message | undefined {
  const thread = messages
    .filter((m) => m.threadId === threadId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return thread[0];
}

export function unreadForUser(
  unreadByUser: Record<string, Record<string, number>>,
  userId: UserId,
): Record<string, number> {
  return unreadByUser[userId] ?? {};
}

export function totalUnreadForUser(
  unreadByUser: Record<string, Record<string, number>>,
  userId: UserId,
): number {
  return Object.values(unreadForUser(unreadByUser, userId)).reduce((a, b) => a + b, 0);
}

/** Initialise les compteurs à 0 pour tous les utilisateurs / fils. */
export function emptyUnreadByUser(chantiers: Chantier[]): Record<string, Record<string, number>> {
  const threadIds = [GENERAL_THREAD_ID, ...chantiers.map((c) => c.id)];
  const out: Record<string, Record<string, number>> = {};
  for (const u of USERS) {
    out[u.id] = Object.fromEntries(threadIds.map((id) => [id, 0]));
  }
  return out;
}

/** Ajoute un fil chantier dans les compteurs non-lus (à la programmation). */
export function ensureThreadInUnread(
  unreadByUser: Record<string, Record<string, number>>,
  threadId: string,
): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = { ...unreadByUser };
  for (const u of USERS) {
    out[u.id] = { ...(out[u.id] ?? {}), [threadId]: out[u.id]?.[threadId] ?? 0 };
  }
  return out;
}
