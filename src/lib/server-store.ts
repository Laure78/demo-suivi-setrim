import type { Message } from '@/lib/domain/types';

type PushSub = {
  userId: string;
  subscription: PushSubscriptionJSON;
};

type SharedStore = {
  messages: Message[];
  pushSubs: PushSub[];
};

declare global {
  var __setrimShared: SharedStore | undefined;
}

export function getSharedStore(): SharedStore {
  if (!globalThis.__setrimShared) {
    globalThis.__setrimShared = { messages: [], pushSubs: [] };
  }
  return globalThis.__setrimShared;
}

export function mergeMessages(incoming: Message[]): Message[] {
  const store = getSharedStore();
  const byId = new Map(store.messages.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  store.messages = Array.from(byId.values()).sort((a, b) => a.date.localeCompare(b.date));
  // garde les 500 derniers
  if (store.messages.length > 500) {
    store.messages = store.messages.slice(-500);
  }
  return store.messages;
}
