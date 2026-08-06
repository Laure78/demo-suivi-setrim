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
  ActionPhoto,
  ChecklistTemplateId,
  Chantier,
  Contrat,
  ContratStatus,
  JournalEntry,
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
import { buildChecklistFromTemplate } from '@/lib/checklist-template';
import { addYears } from '@/lib/dates';

export type NewChantierInput = {
  title: string;
  client: string;
  address: string;
  startDate: string;
  endDate: string;
  teamId: TeamId;
  templateId: ChecklistTemplateId;
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
  addAction: (
    chantierId: string,
    label: string,
    dueDate: string,
    assigneeId?: UserId,
  ) => void;
  addActionPhoto: (chantierId: string, actionId: string, dataUrl: string) => void;
  removeActionPhoto: (chantierId: string, actionId: string, photoId: string) => void;
  setContratStatus: (contratId: string, status: ContratStatus) => void;
  getChantier: (id: string) => Chantier | undefined;
  getJournal: (chantierId: string) => JournalEntry[];
  sendMessage: (threadId: string, text: string, isImportant: boolean) => void;
  markThreadRead: (threadId: string) => void;
  createProgrammedChantier: (input: NewChantierInput) => string;
};

const AppContext = createContext<AppContextValue | null>(null);

function appendJournal(
  s: PersistedState,
  entry: Omit<JournalEntry, 'id' | 'createdAt' | 'userId' | 'userName'>,
): PersistedState {
  const user = getUser(s.activeUserId);
  const full: JournalEntry = {
    ...entry,
    id: uid('j'),
    createdAt: new Date().toISOString(),
    userId: s.activeUserId,
    userName: user.name,
  };
  return { ...s, journal: [full, ...s.journal] };
}

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
          let label = '';
          let wasDone = false;
          const chantiers = s.chantiers.map((c) => {
            if (c.id !== chantierId) return c;
            return {
              ...c,
              actions: c.actions.map((a) => {
                if (a.id !== actionId) return a;
                label = a.label;
                wasDone = a.done;
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
          });
          let next: PersistedState = { ...s, chantiers };
          next = appendJournal(next, {
            chantierId,
            kind: wasDone ? 'uncheck' : 'check',
            text: wasDone
              ? `Action décochée : ${label}`
              : `Action cochée : ${label}`,
            actionId,
          });
          return next;
        }),

      addAction: (chantierId, label, dueDate, assigneeId) =>
        update((s) => {
          const action: ActionItem = {
            id: uid('act'),
            label: label.trim(),
            dueDate,
            done: false,
            assigneeId: assigneeId ?? s.activeUserId,
            photos: [],
          };
          let next: PersistedState = {
            ...s,
            chantiers: s.chantiers.map((c) =>
              c.id === chantierId ? { ...c, actions: [...c.actions, action] } : c,
            ),
          };
          next = appendJournal(next, {
            chantierId,
            kind: 'add_action',
            text: `Action ajoutée : ${action.label} (échéance ${action.dueDate})`,
            actionId: action.id,
          });
          return next;
        }),

      addActionPhoto: (chantierId, actionId, dataUrl) =>
        update((s) => {
          const user = getUser(s.activeUserId);
          const photo: ActionPhoto = {
            id: uid('ph'),
            dataUrl,
            addedAt: new Date().toISOString(),
            addedBy: user.name,
          };
          let actionLabel = '';
          const chantiers = s.chantiers.map((c) => {
            if (c.id !== chantierId) return c;
            return {
              ...c,
              actions: c.actions.map((a) => {
                if (a.id !== actionId) return a;
                actionLabel = a.label;
                return { ...a, photos: [...(a.photos ?? []), photo] };
              }),
            };
          });
          let next: PersistedState = { ...s, chantiers };
          next = appendJournal(next, {
            chantierId,
            kind: 'photo',
            text: `Photo ajoutée sur : ${actionLabel}`,
            actionId,
            photoDataUrl: dataUrl,
          });
          return next;
        }),

      removeActionPhoto: (chantierId, actionId, photoId) =>
        update((s) => ({
          ...s,
          chantiers: s.chantiers.map((c) => {
            if (c.id !== chantierId) return c;
            return {
              ...c,
              actions: c.actions.map((a) => {
                if (a.id !== actionId) return a;
                return {
                  ...a,
                  photos: (a.photos ?? []).filter((p) => p.id !== photoId),
                };
              }),
            };
          }),
        })),

      setContratStatus: (contratId, status) =>
        update((s) => {
          const current = s.contrats.find((c) => c.id === contratId);
          if (!current) return s;

          // Marquer facturé → crée l'échéance N+1 « À venir »
          if (status === 'fait' && current.status !== 'fait') {
            const nextYear: Contrat = {
              id: uid('contrat'),
              client: current.client,
              anniversaryDate: addYears(current.anniversaryDate, 1),
              status: 'a_venir',
            };
            return {
              ...s,
              contrats: [
                ...s.contrats.map((ct) =>
                  ct.id === contratId ? { ...ct, status: 'fait' as const } : ct,
                ),
                nextYear,
              ],
            };
          }

          return {
            ...s,
            contrats: s.contrats.map((ct) =>
              ct.id === contratId ? { ...ct, status } : ct,
            ),
          };
        }),

      getChantier: (id) => state.chantiers.find((c) => c.id === id),

      getJournal: (chantierId) =>
        state.journal
          .filter((j) => j.chantierId === chantierId)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),

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
          let next: PersistedState = { ...s, ...slice };
          // Message important rattaché à un chantier → journal
          if (isImportant && threadId !== 'general') {
            next = appendJournal(next, {
              chantierId: threadId,
              kind: 'message_important',
              text: `Message important : ${text.trim()}`,
            });
          }
          return next;
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
            templateId: input.templateId,
            actions: buildChecklistFromTemplate(
              input.templateId,
              input.startDate,
              id,
            ),
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
