'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  ActionItem,
  Chantier,
  Contrat,
  ContratStatus,
  PersistedState,
  TeamId,
  UserId,
} from '@/lib/types';
import { loadState, resetState, saveState } from '@/lib/storage';
import { getUser } from '@/lib/users';
import { uid } from '@/lib/chantier-helpers';
import {
  ensureThreadInUnread,
  markThreadRead as markReadOp,
  sendMessage as sendOp,
} from '@/lib/messaging';
import { buildStandardChecklist } from '@/lib/checklist-template';

export type NewChantierInput = {
  title: string;
  client: string;
  address: string;
  startDate: string;
  endDate: string;
  teamId: TeamId;
  devisNumero?: string;
  montantHT?: number;
};

type AppContextValue = {
  ready: boolean;
  state: PersistedState;
  activeUserId: UserId;
  activeUserName: string;
  setActiveUser: (id: UserId) => void;
  resetDemo: () => void;
  toggleAction: (chantierId: string, actionId: string) => void;
  addAction: (chantierId: string, label: string, dueDate: string) => void;
  setContratStatus: (contratId: string, status: ContratStatus) => void;
  getChantier: (id: string) => Chantier | undefined;
  sendMessage: (threadId: string, text: string, isImportant: boolean) => void;
  markThreadRead: (threadId: string) => void;
  /** Programme un chantier + check-list standard auto. Retourne l'id. */
  createProgrammedChantier: (input: NewChantierInput) => string;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState | null>(null);

  useEffect(() => {
    setState(loadState());
  }, []);

  useEffect(() => {
    if (state) saveState(state);
  }, [state]);

  const update = useCallback((fn: (prev: PersistedState) => PersistedState) => {
    setState((prev) => (prev ? fn(prev) : prev));
  }, []);

  const value = useMemo<AppContextValue | null>(() => {
    if (!state) return null;

    return {
      ready: true,
      state,
      activeUserId: state.activeUserId,
      activeUserName: getUser(state.activeUserId).name,
      setActiveUser: (id) => update((s) => ({ ...s, activeUserId: id })),
      resetDemo: () => setState(resetState()),
      toggleAction: (chantierId, actionId) =>
        update((s) => {
          const user = getUser(s.activeUserId);
          return {
            ...s,
            chantiers: s.chantiers.map((c) => {
              if (c.id !== chantierId) return c;
              return {
                ...c,
                actions: c.actions.map((a) => {
                  if (a.id !== actionId) return a;
                  if (a.done) {
                    return { ...a, done: false, doneAt: undefined, doneBy: undefined };
                  }
                  return {
                    ...a,
                    done: true,
                    doneAt: new Date().toISOString(),
                    doneBy: user.name,
                  };
                }),
              };
            }),
          };
        }),
      addAction: (chantierId, label, dueDate) =>
        update((s) => ({
          ...s,
          chantiers: s.chantiers.map((c) => {
            if (c.id !== chantierId) return c;
            const action: ActionItem = {
              id: uid('act'),
              label: label.trim(),
              dueDate,
              done: false,
            };
            return { ...c, actions: [...c.actions, action] };
          }),
        })),
      setContratStatus: (contratId, status) =>
        update((s) => ({
          ...s,
          contrats: s.contrats.map((ct: Contrat) =>
            ct.id === contratId ? { ...ct, status } : ct,
          ),
        })),
      getChantier: (id) => state.chantiers.find((c) => c.id === id),
      sendMessage: (threadId, text, isImportant) =>
        update((s) => {
          const user = getUser(s.activeUserId);
          const slice = sendOp(
            { messages: s.messages, unreadByUser: s.unreadByUser },
            {
              threadId,
              text,
              isImportant,
              authorId: s.activeUserId,
              authorName: user.name,
            },
          );
          return { ...s, ...slice };
        }),
      markThreadRead: (threadId) =>
        update((s) => {
          const slice = markReadOp(
            { messages: s.messages, unreadByUser: s.unreadByUser },
            s.activeUserId,
            threadId,
          );
          if (slice === s || slice.unreadByUser === s.unreadByUser) return s;
          return { ...s, ...slice };
        }),
      createProgrammedChantier: (input) => {
        const id = uid('chantier');
        update((s) => {
          const chantier: Chantier = {
            id,
            title: input.title.trim(),
            client: input.client.trim(),
            address: input.address.trim(),
            startDate: input.startDate,
            endDate: input.endDate,
            teamId: input.teamId,
            actions: buildStandardChecklist(input.startDate, input.endDate, id),
            devisNumero: input.devisNumero,
            montantHT: input.montantHT,
          };
          return {
            ...s,
            chantiers: [...s.chantiers, chantier],
            unreadByUser: ensureThreadInUnread(s.unreadByUser, id),
          };
        });
        return id;
      },
    };
  }, [state, update]);

  if (!value) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-100 text-slate-600">
        Chargement de la démo…
      </div>
    );
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp doit être utilisé dans AppProvider');
  return ctx;
}
