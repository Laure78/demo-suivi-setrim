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
  Affaire,
  ChecklistItem,
  Message,
  Nota,
  PersistedState,
  Utilisateur,
} from '@/lib/domain/types';
import { loadState, resetState, saveState } from '@/lib/domain/storage';
import { getUser, uid } from '@/lib/domain/lookups';
import { todayISO } from '@/lib/dates';

type AppContextValue = {
  ready: boolean;
  state: PersistedState;
  user: Utilisateur | null;
  login: (email: string, password: string) => { ok: true } | { ok: false; error: string };
  logout: () => void;
  resetDemo: () => void;
  toggleChecklistItem: (itemId: string) => void;
  closeNota: (notaId: string) => void;
  createNota: (input: {
    objet: string;
    echeance: string;
    responsableId: string;
    priorite: Nota['priorite'];
    entiteLiee: string;
  }) => void;
  updateAffaire: (id: string, patch: Partial<Affaire>) => void;
  appendJournal: (entite: string, action: string, avant?: string, apres?: string) => void;
  sendMessage: (threadId: string, corps: string, affaireId?: string) => void;
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
    const user = getUser(state, state.sessionUserId) ?? null;

    return {
      ready: true,
      state,
      user,

      login: (email, password) => {
        const found = state.utilisateurs.find(
          (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.actif,
        );
        if (!found || found.password !== password) {
          return { ok: false, error: 'Email ou mot de passe incorrect' };
        }
        update((s) => ({ ...s, sessionUserId: found.id }));
        return { ok: true };
      },

      logout: () => update((s) => ({ ...s, sessionUserId: null })),

      resetDemo: () => setState(resetState()),

      appendJournal: (entite, action, avant, apres) =>
        update((s) => {
          if (!s.sessionUserId) return s;
          return {
            ...s,
            journal: [
              {
                id: uid('j'),
                utilisateurId: s.sessionUserId,
                entite,
                action,
                valeurAvant: avant,
                valeurApres: apres,
                horodatage: new Date().toISOString(),
              },
              ...s.journal,
            ],
          };
        }),

      toggleChecklistItem: (itemId) =>
        update((s) => {
          if (!s.sessionUserId) return s;
          const u = getUser(s, s.sessionUserId);
          const items = s.checklistItems.map((it): ChecklistItem => {
            if (it.id !== itemId) return it;
            if (it.fait) {
              return {
                ...it,
                fait: false,
                dateFait: undefined,
                faitPar: undefined,
              };
            }
            return {
              ...it,
              fait: true,
              dateFait: new Date().toISOString(),
              faitPar: u?.nom ?? '?',
            };
          });
          const item = items.find((i) => i.id === itemId);
          const cl = s.checklists.find((c) => c.id === item?.checklistId);
          return {
            ...s,
            checklistItems: items,
            affaires: s.affaires.map((a) =>
              a.id === cl?.affaireId
                ? { ...a, dateDerniereAction: todayISO() }
                : a,
            ),
            journal: [
              {
                id: uid('j'),
                utilisateurId: s.sessionUserId,
                entite: cl ? `affaire:${cl.affaireId}` : `item:${itemId}`,
                action: item?.fait ? 'check_item' : 'uncheck_item',
                valeurApres: item?.libelle,
                horodatage: new Date().toISOString(),
              },
              ...s.journal,
            ],
          };
        }),

      closeNota: (notaId) =>
        update((s) => ({
          ...s,
          notas: s.notas.map((n) =>
            n.id === notaId
              ? { ...n, statut: 'FAIT' as const, dateCloture: new Date().toISOString() }
              : n,
          ),
        })),

      createNota: (input) =>
        update((s) => {
          if (!s.sessionUserId) return s;
          const nota: Nota = {
            id: uid('nota'),
            objet: input.objet,
            type: 'MANUEL',
            entiteLiee: input.entiteLiee,
            echeance: input.echeance,
            responsableId: input.responsableId,
            priorite: input.priorite,
            statut: 'OUVERT',
            creePar: s.sessionUserId,
            createdAt: new Date().toISOString(),
          };
          return { ...s, notas: [nota, ...s.notas] };
        }),

      updateAffaire: (id, patch) =>
        update((s) => ({
          ...s,
          affaires: s.affaires.map((a) =>
            a.id === id
              ? { ...a, ...patch, dateDerniereAction: todayISO() }
              : a,
          ),
        })),

      sendMessage: (threadId, corps, affaireId) =>
        update((s) => {
          if (!s.sessionUserId || !corps.trim()) return s;
          const msg: Message = {
            id: uid('msg'),
            auteurId: s.sessionUserId,
            destinataires: s.utilisateurs
              .filter((u) => u.id !== s.sessionUserId)
              .map((u) => u.id),
            threadId,
            affaireId,
            corps: corps.trim(),
            piecesJointes: [],
            luPar: [s.sessionUserId],
            date: new Date().toISOString(),
            isImportant: false,
          };
          return { ...s, messages: [...s.messages, msg] };
        }),
    };
  }, [state, update]);

  if (!value) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-slate-500">
        Chargement…
      </div>
    );
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp hors AppProvider');
  return ctx;
}
