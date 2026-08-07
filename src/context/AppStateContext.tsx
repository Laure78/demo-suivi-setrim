'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  ActionItem,
  ActionPriorite,
  Affaire,
  Affectation,
  AffectationType,
  AlertDelais,
  AuditEvent,
  ChecklistItem,
  ChecklistItemHistoryEntry,
  ChecklistModele,
  ColorCodes,
  ColumnMapping,
  DocumentType,
  Equipe,
  ImportSheetKind,
  Message,
  Nota,
  PassageCE,
  PersistedState,
  PieceJointe,
  Utilisateur,
} from '@/lib/domain/types';
import { loadState, resetState, saveState } from '@/lib/domain/storage';
import { getUser, uid } from '@/lib/domain/lookups';
import { COMMON_ACCESS } from '@/lib/domain/seed';
import { addDays, todayISO } from '@/lib/dates';
import { syncAutoNotas } from '@/lib/domain/nota-engine';
import { hasPreuvePassage, syncPassagesCe } from '@/lib/domain/ce-engine';
import {
  destinatairesForThread,
  markThreadRead as markReadOp,
} from '@/lib/domain/messaging';
import { notifyUsers, registerServiceWorker } from '@/lib/web-push-client';

type SendMessageInput = {
  threadId: string;
  corps: string;
  affaireId?: string;
  piecesJointes?: PieceJointe[];
  isImportant?: boolean;
};

function syncDomain(state: PersistedState): PersistedState {
  return syncAutoNotas(syncPassagesCe(state));
}

function hist(
  userId: string,
  userName: string,
  kind: ChecklistItemHistoryEntry['kind'],
  detail: string,
  extra?: Partial<ChecklistItemHistoryEntry>,
): ChecklistItemHistoryEntry {
  return {
    id: uid('h'),
    at: new Date().toISOString(),
    userId,
    userName,
    kind,
    detail,
    ...extra,
  };
}

type AppContextValue = {
  ready: boolean;
  state: PersistedState;
  user: Utilisateur | null;
  login: (identifiant: string, password: string) => { ok: true } | { ok: false; error: string };
  logout: () => void;
  setActiveUser: (id: string) => void;
  resetDemo: () => void;
  toggleChecklistItem: (itemId: string) => void;
  addChecklistItem: (input: {
    checklistId: string;
    libelle: string;
    echeance?: string;
    obligatoire?: boolean;
    assigneeId?: string;
  }) => string | null;
  updateChecklistItem: (
    itemId: string,
    patch: Partial<
      Pick<ChecklistItem, 'libelle' | 'echeance' | 'obligatoire' | 'assigneeId' | 'commentaire'>
    >,
  ) => void;
  reorderChecklistItems: (checklistId: string, orderedIds: string[]) => void;
  archiveChecklistItem: (itemId: string, motif: string) => void;
  restoreChecklistItem: (itemId: string) => void;
  addChecklistItemToModele: (itemId: string) => { ok: boolean; error?: string };
  closeNota: (notaId: string) => void;
  reopenNota: (notaId: string) => void;
  archiveNota: (notaId: string, motif: string) => { ok: boolean; error?: string };
  updateNota: (
    notaId: string,
    patch: Partial<Pick<Nota, 'objet' | 'echeance' | 'priorite' | 'responsableId'>>,
  ) => void;
  /** Reporter une alerte AUTO — motif obligatoire. */
  reportNota: (
    notaId: string,
    motif: string,
    nouvelleEcheance?: string,
  ) => { ok: boolean; error?: string };
  createNota: (input: {
    objet: string;
    echeance: string;
    responsableId: string;
    priorite: Nota['priorite'];
    entiteLiee: string;
  }) => void;
  updateAffaire: (
    id: string,
    patch: Partial<Affaire>,
  ) => { ok: true } | { ok: false; error: string };
  createAffaire: (input: {
    devisId: string;
    joursChargeEstimes: number;
    acompteAttendu: number;
    acompteRecu?: number;
    commentaire?: string;
    statut?: Affaire['statut'];
  }) => { ok: true; id: string } | { ok: false; error: string };
  appendJournal: (entite: string, action: string, avant?: string, apres?: string) => void;
  sendMessage: (input: SendMessageInput) => void;
  markThreadRead: (threadId: string) => void;
  updateNotificationPrefs: (prefs: Partial<Utilisateur['preferencesNotifications']>) => void;
  createActionFromMessage: (input: {
    messageId: string;
    libelle: string;
    echeance: string;
    assigneeId: string;
    affaireId?: string;
    priorite: ActionPriorite;
  }) => string | null;
  toggleAction: (actionId: string) => void;
  programmerPassageCe: (
    passageId: string,
    datePrevue: string,
    equipeId?: string,
  ) => { ok: true } | { ok: false; error: string };
  /** Valide un passage — preuve obligatoire (bon signé ou photo). */
  validerPassageCe: (input: {
    passageId: string;
    dateRealisee: string;
    bonIntervention?: string;
    photos?: string[];
    compteRendu?: string;
  }) => { ok: true } | { ok: false; error: string };
  updatePassageCe: (
    passageId: string,
    patch: Partial<PassageCE>,
  ) => void;
  /** Place une affaire (CHANTIER) sur une cellule — passe PORTEFEUILLE → PLANIFIÉ. */
  assignChantier: (input: {
    affaireId: string;
    equipeId: string;
    date: string;
  }) => { ok: true; id: string } | { ok: false; error: string };
  /** Déplace une affectation (met à jour jours consommés via la date). */
  moveAffectation: (
    affectationId: string,
    equipeId: string,
    date: string,
  ) => { ok: true } | { ok: false; error: string };
  createAffectationType: (input: {
    equipeId: string;
    date: string;
    type: Exclude<AffectationType, 'CHANTIER'>;
    commentaire?: string;
  }) => string;
  removeAffectation: (affectationId: string) => void;
  passerCommande: (
    commandeId: string,
    bonCommande: string,
  ) => { ok: true } | { ok: false; error: string };
  relancerFacture: (factureId: string) => { ok: true } | { ok: false; error: string };
  relancerDemandePrix: (demandeId: string) => { ok: true } | { ok: false; error: string };
  /** Remplace l'état après un import Excel validé */
  commitImportedState: (next: PersistedState) => void;
  saveImportMapping: (kind: ImportSheetKind, mapping: ColumnMapping) => void;
  addDocument: (input: {
    entiteLiee: string;
    type: DocumentType;
    nomFichier: string;
    fichier: string;
    mime?: string;
  }) => string | null;
  removeDocument: (documentId: string) => void;
  updateAlertDelai: (key: keyof AlertDelais, value: number) => void;
  updateUser: (
    userId: string,
    patch: Partial<Pick<Utilisateur, 'nom' | 'email' | 'role' | 'telephone' | 'actif'>>,
  ) => void;
  updateEquipe: (
    equipeId: string,
    patch: Partial<Pick<Equipe, 'libelle' | 'compagnons' | 'color' | 'bg' | 'actif'>>,
  ) => void;
  updateChecklistModele: (
    modeleId: string,
    patch: Partial<Pick<ChecklistModele, 'libelle' | 'items'>>,
  ) => void;
  updateJoursFeries: (dates: string[]) => void;
  updateColorCodes: (codes: Partial<ColorCodes>) => void;
  updateCommandeTypeLabel: (type: string, label: string) => void;
  archiveAffaire: (id: string, motif: string) => { ok: boolean; error?: string };
  restoreAffaire: (id: string) => void;
  archiveContrat: (id: string, motif: string) => { ok: boolean; error?: string };
  restoreContrat: (id: string) => void;
};

const AppContext = createContext<AppContextValue | null>(null);
const BC_NAME = 'setrim-messages-v1';

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState | null>(null);
  const bcRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    setState(syncDomain(loadState()));
    void registerServiceWorker();
  }, []);

  useEffect(() => {
    if (state) saveState(state);
  }, [state]);

  const update = useCallback((fn: (prev: PersistedState) => PersistedState) => {
    setState((prev) => (prev ? syncDomain(fn(prev)) : prev));
  }, []);

  // Sync multi-appareils : poll API messages
  useEffect(() => {
    if (!state?.sessionUserId) return;
    let cancelled = false;

    async function pull() {
      try {
        const res = await fetch('/api/messages', { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as { messages: Message[] };
        if (cancelled || !data.messages?.length) return;
        setState((prev) => {
          if (!prev) return prev;
          const byId = new Map(prev.messages.map((m) => [m.id, m]));
          let changed = false;
          for (const m of data.messages) {
            const existing = byId.get(m.id);
            if (!existing) {
              byId.set(m.id, m);
              changed = true;
            } else if (existing.luPar.length !== m.luPar.length) {
              byId.set(m.id, {
                ...existing,
                luPar: Array.from(new Set([...existing.luPar, ...m.luPar])),
              });
              changed = true;
            }
          }
          if (!changed) return prev;
          return {
            ...prev,
            messages: Array.from(byId.values()).sort((a, b) => a.date.localeCompare(b.date)),
          };
        });
      } catch {
        /* offline */
      }
    }

    pull();
    const t = window.setInterval(pull, 2500);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [state?.sessionUserId]);

  // Temps réel mêmes onglets (BroadcastChannel)
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const bc = new BroadcastChannel(BC_NAME);
    bcRef.current = bc;
    bc.onmessage = (ev) => {
      const msg = ev.data as Message | undefined;
      if (!msg?.id) return;
      setState((prev) => {
        if (!prev || prev.messages.some((m) => m.id === msg.id)) return prev;
        return { ...prev, messages: [...prev.messages, msg] };
      });
    };
    return () => {
      bc.close();
      bcRef.current = null;
    };
  }, []);

  const value = useMemo<AppContextValue | null>(() => {
    if (!state) return null;
    const user = getUser(state, state.sessionUserId) ?? null;

    return {
      ready: true,
      state,
      user,

      login: (identifiant, password) => {
        const raw = identifiant.trim().toLowerCase();
        const common =
          raw === COMMON_ACCESS.identifiant ||
          raw === `${COMMON_ACCESS.identifiant}@setrim.fr`;
        if (common && password === COMMON_ACCESS.password) {
          update((s) => ({ ...s, sessionUserId: COMMON_ACCESS.defaultUserId }));
          return { ok: true };
        }
        const found = state.utilisateurs.find(
          (u) =>
            u.actif &&
            (u.email.toLowerCase() === raw || u.nom.toLowerCase() === raw) &&
            u.password === password,
        );
        if (!found) {
          return {
            ok: false,
            error: 'Identifiant ou mot de passe incorrect',
          };
        }
        update((s) => ({ ...s, sessionUserId: found.id }));
        return { ok: true };
      },

      logout: () => update((s) => ({ ...s, sessionUserId: null })),

      setActiveUser: (id) =>
        update((s) => {
          if (!s.utilisateurs.some((u) => u.id === id && u.actif)) return s;
          return { ...s, sessionUserId: id };
        }),

      resetDemo: () => setState(syncDomain(resetState())),

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
          const sessionId = s.sessionUserId;
          const u = getUser(s, sessionId);
          const userName = u?.nom ?? '?';
          const items = s.checklistItems.map((it): ChecklistItem => {
            if (it.id !== itemId || it.archived) return it;
            const histList = it.history ?? [];
            if (it.fait) {
              return {
                ...it,
                fait: false,
                dateFait: undefined,
                faitPar: undefined,
                history: [
                  hist(sessionId, userName, 'uncheck', 'Décoché', {
                    previousDateFait: it.dateFait,
                    previousFaitPar: it.faitPar,
                  }),
                  ...histList,
                ],
              };
            }
            const now = new Date().toISOString();
            return {
              ...it,
              fait: true,
              dateFait: now,
              faitPar: userName,
              history: [
                hist(sessionId, userName, 'check', `Coché — ${userName}`),
                ...histList,
              ],
            };
          });
          const item = items.find((i) => i.id === itemId);
          const cl = s.checklists.find((c) => c.id === item?.checklistId);
          const actions = (s.actions ?? []).map((a) => {
            if (!item?.actionId || a.id !== item.actionId) return a;
            if (item.fait) {
              return {
                ...a,
                statut: 'FAIT' as const,
                dateFait: item.dateFait,
                faitPar: item.faitPar,
              };
            }
            return {
              ...a,
              statut: 'OUVERT' as const,
              dateFait: undefined,
              faitPar: undefined,
            };
          });
          return {
            ...s,
            checklistItems: items,
            actions,
            affaires: s.affaires.map((a) =>
              a.id === cl?.affaireId
                ? { ...a, dateDerniereAction: todayISO() }
                : a,
            ),
            journal: [
              {
                id: uid('j'),
                utilisateurId: sessionId,
                entite: cl ? `affaire:${cl.affaireId}` : `item:${itemId}`,
                action: item?.fait ? 'check_item' : 'uncheck_item',
                valeurApres: item?.libelle,
                horodatage: new Date().toISOString(),
              },
              ...s.journal,
            ],
          };
        }),

      addChecklistItem: (input) => {
        const userId = state.sessionUserId;
        if (!userId) return null;
        const u = getUser(state, userId);
        const siblings = state.checklistItems.filter((i) => i.checklistId === input.checklistId);
        const maxOrdre = siblings.reduce((m, i) => Math.max(m, i.ordre ?? 0), -1);
        const id = uid('cli');
        const item: ChecklistItem = {
          id,
          checklistId: input.checklistId,
          libelle: input.libelle.trim(),
          obligatoire: Boolean(input.obligatoire),
          echeance: input.echeance ?? todayISO(),
          fait: false,
          commentaire: '',
          ordre: maxOrdre + 1,
          assigneeId: input.assigneeId,
          manuel: true,
          history: [
            hist(userId, u?.nom ?? '?', 'create', 'Item ajouté manuellement'),
          ],
        };
        const cl = state.checklists.find((c) => c.id === input.checklistId);
        update((s) => ({
          ...s,
          checklistItems: [...s.checklistItems, item],
          affaires: s.affaires.map((a) =>
            a.id === cl?.affaireId ? { ...a, dateDerniereAction: todayISO() } : a,
          ),
          journal: [
            {
              id: uid('j'),
              utilisateurId: userId,
              entite: cl ? `affaire:${cl.affaireId}` : `item:${id}`,
              action: 'add_checklist_item',
              valeurApres: item.libelle,
              horodatage: new Date().toISOString(),
            },
            ...s.journal,
          ],
        }));
        return id;
      },

      updateChecklistItem: (itemId, patch) =>
        update((s) => {
          if (!s.sessionUserId) return s;
          const u = getUser(s, s.sessionUserId);
          const userName = u?.nom ?? '?';
          return {
            ...s,
            checklistItems: s.checklistItems.map((it) => {
              if (it.id !== itemId || it.archived) return it;
              const changes: string[] = [];
              if (patch.libelle !== undefined && patch.libelle !== it.libelle) {
                changes.push(`libellé → ${patch.libelle}`);
              }
              if (patch.echeance !== undefined && patch.echeance !== it.echeance) {
                changes.push(`échéance → ${patch.echeance}`);
              }
              if (patch.obligatoire !== undefined && patch.obligatoire !== it.obligatoire) {
                changes.push(`obligatoire → ${patch.obligatoire ? 'oui' : 'non'}`);
              }
              if (patch.assigneeId !== undefined && patch.assigneeId !== it.assigneeId) {
                const nom = getUser(s, patch.assigneeId)?.nom ?? patch.assigneeId;
                changes.push(`assigné → ${nom}`);
              }
              if (!changes.length && patch.commentaire === undefined) return it;
              return {
                ...it,
                ...patch,
                history: [
                  hist(
                    s.sessionUserId!,
                    userName,
                    'edit',
                    changes.length ? changes.join(' · ') : 'Modification',
                  ),
                  ...(it.history ?? []),
                ],
              };
            }),
            journal: [
              {
                id: uid('j'),
                utilisateurId: s.sessionUserId,
                entite: `item:${itemId}`,
                action: 'edit_checklist_item',
                valeurApres: JSON.stringify(patch),
                horodatage: new Date().toISOString(),
              },
              ...s.journal,
            ],
          };
        }),

      reorderChecklistItems: (checklistId, orderedIds) =>
        update((s) => {
          if (!s.sessionUserId) return s;
          const u = getUser(s, s.sessionUserId);
          const orderMap = new Map(orderedIds.map((id, i) => [id, i]));
          return {
            ...s,
            checklistItems: s.checklistItems.map((it) => {
              if (it.checklistId !== checklistId || !orderMap.has(it.id)) return it;
              const ordre = orderMap.get(it.id)!;
              if (it.ordre === ordre) return it;
              return {
                ...it,
                ordre,
                history: [
                  hist(s.sessionUserId!, u?.nom ?? '?', 'reorder', `Nouvel ordre : ${ordre + 1}`),
                  ...(it.history ?? []),
                ],
              };
            }),
          };
        }),

      archiveChecklistItem: (itemId, motif) =>
        update((s) => {
          if (!s.sessionUserId || !motif.trim()) return s;
          const u = getUser(s, s.sessionUserId);
          const userName = u?.nom ?? '?';
          return {
            ...s,
            checklistItems: s.checklistItems.map((it) =>
              it.id !== itemId
                ? it
                : {
                    ...it,
                    archived: true,
                    archiveMotif: motif.trim(),
                    archivedAt: new Date().toISOString(),
                    archivedBy: userName,
                    history: [
                      hist(s.sessionUserId!, userName, 'archive', `Archivé : ${motif.trim()}`),
                      ...(it.history ?? []),
                    ],
                  },
            ),
            journal: [
              {
                id: uid('j'),
                utilisateurId: s.sessionUserId,
                entite: `item:${itemId}`,
                action: 'archive_checklist_item',
                valeurApres: motif.trim(),
                horodatage: new Date().toISOString(),
              },
              ...s.journal,
            ],
          };
        }),

      restoreChecklistItem: (itemId) =>
        update((s) => {
          if (!s.sessionUserId) return s;
          const u = getUser(s, s.sessionUserId);
          const userName = u?.nom ?? '?';
          return {
            ...s,
            checklistItems: s.checklistItems.map((it) =>
              it.id !== itemId
                ? it
                : {
                    ...it,
                    archived: false,
                    archiveMotif: undefined,
                    archivedAt: undefined,
                    archivedBy: undefined,
                    history: [
                      hist(s.sessionUserId!, userName, 'restore', 'Restauré'),
                      ...(it.history ?? []),
                    ],
                  },
            ),
          };
        }),

      addChecklistItemToModele: (itemId) => {
        const userId = state.sessionUserId;
        if (!userId) return { ok: false, error: 'Non connecté' };
        const item = state.checklistItems.find((i) => i.id === itemId);
        if (!item?.manuel) return { ok: false, error: 'Réservé aux items manuels' };
        const cl = state.checklists.find((c) => c.id === item.checklistId);
        if (!cl) return { ok: false, error: 'Check-list introuvable' };
        const u = getUser(state, userId);

        update((s) => {
          const modeles = s.checklistModeles.map((m) => {
            if (m.id !== cl.modeleId) return m;
            const nextOrdre = m.items.reduce((mx, it) => Math.max(mx, it.ordre), 0) + 1;
            // délai approx depuis aujourd'hui vs début affaire
            const affaire = s.affaires.find((a) => a.id === cl.affaireId);
            const devis = affaire ? s.devis.find((d) => d.id === affaire.devisId) : undefined;
            let delaiJours = 0;
            if (devis) {
              const start = new Date(devis.date + 'T12:00:00').getTime();
              const ech = new Date(item.echeance + 'T12:00:00').getTime();
              delaiJours = Math.max(0, Math.round((ech - start) / 86400000));
            }
            return {
              ...m,
              items: [
                ...m.items,
                {
                  ordre: nextOrdre,
                  libelle: item.libelle,
                  obligatoire: item.obligatoire,
                  delaiJours,
                },
              ],
            };
          });
          return {
            ...s,
            checklistModeles: modeles,
            checklistItems: s.checklistItems.map((it) =>
              it.id !== itemId
                ? it
                : {
                    ...it,
                    history: [
                      hist(
                        userId,
                        u?.nom ?? '?',
                        'add_to_modele',
                        'Ajouté au modèle de check-list',
                      ),
                      ...(it.history ?? []),
                    ],
                  },
            ),
            journal: [
              {
                id: uid('j'),
                utilisateurId: userId,
                entite: `modele:${cl.modeleId}`,
                action: 'add_item_to_modele',
                valeurApres: item.libelle,
                horodatage: new Date().toISOString(),
              },
              ...s.journal,
            ],
          };
        });
        return { ok: true };
      },

      closeNota: (notaId) =>
        update((s) => ({
          ...s,
          notas: s.notas.map((n) =>
            n.id === notaId
              ? { ...n, statut: 'FAIT' as const, dateCloture: new Date().toISOString() }
              : n,
          ),
        })),

      reopenNota: (notaId) =>
        update((s) => ({
          ...s,
          notas: s.notas.map((n) =>
            n.id === notaId
              ? {
                  ...n,
                  statut: 'OUVERT' as const,
                  dateCloture: undefined,
                  archived: false,
                  archiveMotif: undefined,
                }
              : n,
          ),
        })),

      archiveNota: (notaId, motif) => {
        if (!motif.trim()) return { ok: false, error: 'Motif d’archivage obligatoire.' };
        update((s) => {
          if (!s.sessionUserId) return s;
          return {
            ...s,
            notas: s.notas.map((n) =>
              n.id === notaId
                ? {
                    ...n,
                    archived: true,
                    archiveMotif: motif.trim(),
                    archivedAt: new Date().toISOString(),
                    archivedBy: s.sessionUserId!,
                    statut: n.statut === 'OUVERT' ? ('ANNULE' as const) : n.statut,
                  }
                : n,
            ),
          };
        });
        return { ok: true };
      },

      updateNota: (notaId, patch) =>
        update((s) => ({
          ...s,
          notas: s.notas.map((n) => (n.id === notaId ? { ...n, ...patch } : n)),
        })),

      reportNota: (notaId, motif, nouvelleEcheance) => {
        if (!motif.trim()) {
          return { ok: false, error: 'Le motif de report est obligatoire.' };
        }
        if (!state.sessionUserId) {
          return { ok: false, error: 'Non connecté.' };
        }
        const target = state.notas.find((n) => n.id === notaId);
        if (!target || target.statut !== 'OUVERT' || target.archived) {
          return { ok: false, error: 'Nota introuvable ou déjà clôturé.' };
        }
        const nextDate = nouvelleEcheance?.trim() || addDays(target.echeance, 7);
        const userId = state.sessionUserId;
        update((s) => ({
          ...s,
          notas: s.notas.map((n) =>
            n.id !== notaId
              ? n
              : {
                  ...n,
                  echeance: nextDate,
                  reports: [
                    {
                      date: new Date().toISOString(),
                      motif: motif.trim(),
                      parUserId: userId,
                      ancienneEcheance: n.echeance,
                      nouvelleEcheance: nextDate,
                    },
                    ...(n.reports ?? []),
                  ],
                },
          ),
        }));
        return { ok: true };
      },

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
            reports: [],
          };
          return { ...s, notas: [nota, ...s.notas] };
        }),

      updateAffaire: (id, patch) => {
        if (
          'joursChargeEstimes' in patch &&
          (patch.joursChargeEstimes == null ||
            !Number.isFinite(patch.joursChargeEstimes) ||
            patch.joursChargeEstimes <= 0)
        ) {
          return {
            ok: false as const,
            error: 'Les jours de charge sont obligatoires (nombre > 0).',
          };
        }
        update((s) => {
          const prev = s.affaires.find((a) => a.id === id);
          if (!prev) return s;
          const keys = Object.keys(patch) as (keyof typeof patch)[];
          const avant = keys.map((k) => `${String(k)}=${String(prev[k as keyof Affaire] ?? '')}`).join('; ');
          const apres = keys
            .map((k) => `${String(k)}=${String((patch as Record<string, unknown>)[k as string] ?? '')}`)
            .join('; ');
          return {
            ...s,
            affaires: s.affaires.map((a) =>
              a.id === id
                ? { ...a, ...patch, dateDerniereAction: todayISO() }
                : a,
            ),
            journal: s.sessionUserId
              ? [
                  {
                    id: uid('j'),
                    utilisateurId: s.sessionUserId,
                    entite: `affaire:${id}`,
                    action: 'update',
                    valeurAvant: avant,
                    valeurApres: apres,
                    horodatage: new Date().toISOString(),
                  },
                  ...s.journal,
                ]
              : s.journal,
          };
        });
        return { ok: true as const };
      },

      createAffaire: (input) => {
        if (
          !Number.isFinite(input.joursChargeEstimes) ||
          input.joursChargeEstimes <= 0
        ) {
          return {
            ok: false as const,
            error: 'Impossible d’enregistrer sans jours de charge (obligatoire à la signature).',
          };
        }
        const devis = state.devis.find((d) => d.id === input.devisId);
        if (!devis) return { ok: false as const, error: 'Devis introuvable.' };
        if (state.affaires.some((a) => a.devisId === input.devisId && !a.archived)) {
          return { ok: false as const, error: 'Une affaire existe déjà pour ce devis.' };
        }
        const id = uid('aff');
        update((s) => {
          const affaire: Affaire = {
            id,
            devisId: input.devisId,
            immeubleId: devis.immeubleId,
            statut: input.statut ?? 'PORTEFEUILLE',
            joursChargeEstimes: input.joursChargeEstimes,
            acompteAttendu: input.acompteAttendu,
            acompteRecu: input.acompteRecu ?? 0,
            dateDerniereAction: todayISO(),
            commentaire: input.commentaire?.trim() ?? '',
          };
          return {
            ...s,
            devis: s.devis.map((d) =>
              d.id === input.devisId ? { ...d, statut: 'SIGNE' as const } : d,
            ),
            affaires: [affaire, ...s.affaires],
          };
        });
        return { ok: true as const, id };
      },

      sendMessage: (input) => {
        const auteurId = state.sessionUserId;
        if (!auteurId) return;
        const hasBody = Boolean(input.corps.trim());
        const hasFiles = Boolean(input.piecesJointes?.length);
        if (!hasBody && !hasFiles) return;

        const destinataires = destinatairesForThread(state, input.threadId, auteurId);
        const msg: Message = {
          id: uid('msg'),
          auteurId,
          destinataires,
          threadId: input.threadId,
          affaireId: input.affaireId,
          corps: input.corps.trim(),
          piecesJointes: input.piecesJointes ?? [],
          luPar: [auteurId],
          date: new Date().toISOString(),
          isImportant: Boolean(input.isImportant),
        };

        update((s) => ({ ...s, messages: [...s.messages, msg] }));
        bcRef.current?.postMessage(msg);

        void fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: msg }),
        });

        const author = getUser(state, auteurId);
        const preview =
          msg.corps ||
          (msg.piecesJointes[0]?.mime.startsWith('image/')
            ? '📷 Photo'
            : '📎 Pièce jointe');
        void notifyUsers({
          userIds: destinataires.filter((id) => {
            const u = getUser(state, id);
            return u?.preferencesNotifications.push;
          }),
          title: `${author?.nom ?? 'SETRIM'} — message`,
          body: preview.slice(0, 120),
          url: `/messagerie?thread=${encodeURIComponent(input.threadId)}`,
        });
      },

      markThreadRead: (threadId) =>
        update((s) => {
          if (!s.sessionUserId) return s;
          return {
            ...s,
            messages: markReadOp(s.messages, threadId, s.sessionUserId),
          };
        }),

      updateNotificationPrefs: (prefs) =>
        update((s) => {
          if (!s.sessionUserId) return s;
          return {
            ...s,
            utilisateurs: s.utilisateurs.map((u) =>
              u.id === s.sessionUserId
                ? {
                    ...u,
                    preferencesNotifications: {
                      ...u.preferencesNotifications,
                      ...prefs,
                    },
                  }
                : u,
            ),
          };
        }),

      createActionFromMessage: (input) => {
        const creePar = state.sessionUserId;
        if (!creePar) return null;
        const msg = state.messages.find((m) => m.id === input.messageId);
        if (!msg) return null;

        const actionId = uid('act');
        let checklistItemId: string | undefined;
        let checklistItems = state.checklistItems;
        const actions = [...(state.actions ?? [])];

        if (input.affaireId) {
          const cl = state.checklists.find((c) => c.affaireId === input.affaireId);
          if (cl) {
            checklistItemId = uid('cli');
            const item: ChecklistItem = {
              id: checklistItemId,
              checklistId: cl.id,
              libelle: input.libelle.trim(),
              obligatoire: false,
              echeance: input.echeance,
              fait: false,
              commentaire: `Créée depuis message`,
              assigneeId: input.assigneeId,
              actionId,
              messageId: input.messageId,
              ordre:
                state.checklistItems
                  .filter((i) => i.checklistId === cl.id)
                  .reduce((m, i) => Math.max(m, i.ordre ?? 0), -1) + 1,
              manuel: true,
              history: [
                hist(creePar, getUser(state, creePar)?.nom ?? '?', 'create', 'Depuis message'),
              ],
            };
            checklistItems = [...checklistItems, item];
          }
        }

        const action: ActionItem = {
          id: actionId,
          libelle: input.libelle.trim(),
          echeance: input.echeance,
          assigneeId: input.assigneeId,
          priorite: input.priorite,
          statut: 'OUVERT',
          affaireId: input.affaireId || undefined,
          checklistItemId,
          messageId: input.messageId,
          creePar,
          createdAt: new Date().toISOString(),
        };
        actions.unshift(action);

        update((s) => ({
          ...s,
          actions,
          checklistItems,
          messages: s.messages.map((m) =>
            m.id === input.messageId ? { ...m, actionId } : m,
          ),
          notas: [
            {
              id: uid('nota'),
              objet: `Nouvelle action : ${action.libelle}`,
              type: 'AUTO',
              entiteLiee: `action:${actionId}`,
              echeance: action.echeance,
              responsableId: action.assigneeId,
              priorite: action.priorite,
              statut: 'OUVERT',
              creePar,
              createdAt: new Date().toISOString(),
            },
            ...s.notas,
          ],
          journal: [
            {
              id: uid('j'),
              utilisateurId: creePar,
              entite: `action:${actionId}`,
              action: 'create_from_message',
              valeurApres: action.libelle,
              horodatage: new Date().toISOString(),
            },
            ...s.journal,
          ],
        }));

        const assignee = getUser(state, input.assigneeId);
        if (assignee?.preferencesNotifications.push) {
          void notifyUsers({
            userIds: [input.assigneeId],
            title: 'Nouvelle action assignée',
            body: action.libelle.slice(0, 120),
            url: `/mes-actions?action=${encodeURIComponent(actionId)}`,
          });
        }

        return actionId;
      },

      toggleAction: (actionId) =>
        update((s) => {
          if (!s.sessionUserId) return s;
          const u = getUser(s, s.sessionUserId);
          const actions = (s.actions ?? []).map((a) => {
            if (a.id !== actionId) return a;
            if (a.statut === 'FAIT') {
              return {
                ...a,
                statut: 'OUVERT' as const,
                dateFait: undefined,
                faitPar: undefined,
              };
            }
            return {
              ...a,
              statut: 'FAIT' as const,
              dateFait: new Date().toISOString(),
              faitPar: u?.nom,
            };
          });
          const action = actions.find((a) => a.id === actionId);
          const checklistItems = s.checklistItems.map((it) => {
            if (it.actionId !== actionId) return it;
            if (action?.statut === 'FAIT') {
              return {
                ...it,
                fait: true,
                dateFait: action.dateFait,
                faitPar: action.faitPar,
              };
            }
            return {
              ...it,
              fait: false,
              dateFait: undefined,
              faitPar: undefined,
            };
          });
          return { ...s, actions, checklistItems };
        }),

      programmerPassageCe: (passageId, datePrevue, equipeId) => {
        if (!datePrevue.trim()) {
          return { ok: false as const, error: 'Date prévue obligatoire.' };
        }
        update((s) => ({
          ...s,
          passagesCe: s.passagesCe.map((p) =>
            p.id === passageId
              ? {
                  ...p,
                  datePrevue,
                  equipeId: equipeId || p.equipeId,
                  statut:
                    p.statut === 'REALISE' || p.statut === 'FACTURE'
                      ? p.statut
                      : ('PROGRAMME' as const),
                }
              : p,
          ),
        }));
        return { ok: true as const };
      },

      validerPassageCe: (input) => {
        const p = state.passagesCe.find((x) => x.id === input.passageId);
        if (!p) return { ok: false as const, error: 'Passage introuvable.' };
        const photos = input.photos ?? p.photos ?? [];
        const bon = (input.bonIntervention ?? p.bonIntervention ?? '').trim();
        const draft: PassageCE = {
          ...p,
          bonIntervention: bon || undefined,
          photos,
        };
        if (!hasPreuvePassage(draft)) {
          return {
            ok: false as const,
            error:
              'Impossible de valider sans preuve : bon d’intervention signé ou photo obligatoire.',
          };
        }
        if (!input.dateRealisee.trim()) {
          return { ok: false as const, error: 'Date de réalisation obligatoire.' };
        }
        update((s) => ({
          ...s,
          passagesCe: s.passagesCe.map((x) =>
            x.id !== input.passageId
              ? x
              : {
                  ...x,
                  dateRealisee: input.dateRealisee,
                  bonIntervention: bon || undefined,
                  photos,
                  compteRendu: input.compteRendu?.trim() ?? x.compteRendu,
                  statut: 'REALISE' as const,
                },
          ),
        }));
        return { ok: true as const };
      },

      updatePassageCe: (passageId, patch) =>
        update((s) => ({
          ...s,
          passagesCe: s.passagesCe.map((p) =>
            p.id === passageId ? { ...p, ...patch } : p,
          ),
        })),

      assignChantier: (input) => {
        const affaire = state.affaires.find((a) => a.id === input.affaireId);
        if (!affaire || affaire.archived) {
          return { ok: false as const, error: 'Affaire introuvable.' };
        }
        const id = uid('affec');
        update((s) => {
          const aff = s.affaires.find((a) => a.id === input.affaireId);
          if (!aff) return s;
          const nextStatut =
            aff.statut === 'PORTEFEUILLE' ? ('PLANIFIE' as const) : aff.statut;
          const affectation: Affectation = {
            id,
            date: input.date,
            equipeId: input.equipeId,
            affaireId: input.affaireId,
            type: 'CHANTIER',
            commentaire: '',
          };
          return {
            ...s,
            affectations: [...s.affectations, affectation],
            affaires: s.affaires.map((a) =>
              a.id === input.affaireId
                ? {
                    ...a,
                    statut: nextStatut,
                    dateDerniereAction: todayISO(),
                  }
                : a,
            ),
          };
        });
        return { ok: true as const, id };
      },

      moveAffectation: (affectationId, equipeId, date) => {
        const exists = state.affectations.some((a) => a.id === affectationId);
        if (!exists) return { ok: false as const, error: 'Affectation introuvable.' };
        update((s) => ({
          ...s,
          affectations: s.affectations.map((a) =>
            a.id === affectationId ? { ...a, equipeId, date } : a,
          ),
        }));
        return { ok: true as const };
      },

      createAffectationType: (input) => {
        const id = uid('affec');
        update((s) => ({
          ...s,
          affectations: [
            ...s.affectations,
            {
              id,
              date: input.date,
              equipeId: input.equipeId,
              type: input.type,
              commentaire: input.commentaire ?? '',
            },
          ],
        }));
        return id;
      },

      removeAffectation: (affectationId) =>
        update((s) => ({
          ...s,
          affectations: s.affectations.filter((a) => a.id !== affectationId),
        })),

      passerCommande: (commandeId, bonCommande) => {
        if (!bonCommande.trim()) {
          return { ok: false as const, error: 'Bon de commande obligatoire.' };
        }
        if (!state.sessionUserId) return { ok: false as const, error: 'Non connecté.' };
        const u = getUser(state, state.sessionUserId);
        const now = new Date().toISOString();
        const ev: AuditEvent = {
          id: uid('h'),
          at: now,
          userId: state.sessionUserId,
          userName: u?.nom ?? '?',
          action: 'Commande passée',
          detail: bonCommande.trim(),
        };
        update((s) => ({
          ...s,
          commandes: s.commandes.map((c) =>
            c.id !== commandeId
              ? c
              : {
                  ...c,
                  statut: 'COMMANDEE' as const,
                  dateCommande: todayISO(),
                  bonCommande: bonCommande.trim(),
                  historique: [ev, ...(c.historique ?? [])],
                },
          ),
          journal: [
            {
              id: uid('j'),
              utilisateurId: state.sessionUserId!,
              entite: `commande:${commandeId}`,
              action: 'passer_commande',
              valeurApres: bonCommande.trim(),
              horodatage: now,
            },
            ...s.journal,
          ],
        }));
        return { ok: true as const };
      },

      relancerFacture: (factureId) => {
        if (!state.sessionUserId) return { ok: false as const, error: 'Non connecté.' };
        const f = state.factures.find((x) => x.id === factureId);
        if (!f) return { ok: false as const, error: 'Facture introuvable.' };
        const u = getUser(state, state.sessionUserId);
        const niveau = Math.min(3, (f.relances[0]?.niveau ?? 0) + 1) as 1 | 2 | 3;
        const now = new Date().toISOString();
        const ev: AuditEvent = {
          id: uid('h'),
          at: now,
          userId: state.sessionUserId,
          userName: u?.nom ?? '?',
          action: `Relance niveau ${niveau}`,
          detail: niveau === 3 ? 'Mise en demeure' : `Relance n°${niveau}`,
        };
        update((s) => ({
          ...s,
          factures: s.factures.map((x) =>
            x.id !== factureId
              ? x
              : {
                  ...x,
                  statut: 'RELANCEE' as const,
                  relances: [
                    {
                      niveau,
                      date: todayISO(),
                      commentaire: ev.detail,
                      parUserId: state.sessionUserId!,
                      parNom: u?.nom,
                    },
                    ...x.relances,
                  ],
                  historique: [ev, ...(x.historique ?? [])],
                },
          ),
          journal: [
            {
              id: uid('j'),
              utilisateurId: state.sessionUserId!,
              entite: `facture:${factureId}`,
              action: 'relance_facture',
              valeurApres: `niveau ${niveau}`,
              horodatage: now,
            },
            ...s.journal,
          ],
        }));
        return { ok: true as const };
      },

      relancerDemandePrix: (demandeId) => {
        if (!state.sessionUserId) return { ok: false as const, error: 'Non connecté.' };
        const u = getUser(state, state.sessionUserId);
        const now = new Date().toISOString();
        const ev: AuditEvent = {
          id: uid('h'),
          at: now,
          userId: state.sessionUserId,
          userName: u?.nom ?? '?',
          action: 'Relance fournisseur',
          detail: 'Demande de prix relancée',
        };
        update((s) => ({
          ...s,
          demandesPrix: s.demandesPrix.map((d) =>
            d.id !== demandeId
              ? d
              : {
                  ...d,
                  statut: 'RELANCEE' as const,
                  historique: [ev, ...(d.historique ?? [])],
                },
          ),
          journal: [
            {
              id: uid('j'),
              utilisateurId: state.sessionUserId!,
              entite: `demandePrix:${demandeId}`,
              action: 'relance_dp',
              horodatage: now,
            },
            ...s.journal,
          ],
        }));
        return { ok: true as const };
      },

      commitImportedState: (next) => {
        setState(syncDomain(next));
      },

      saveImportMapping: (kind, mapping) =>
        update((s) => ({
          ...s,
          settings: {
            ...s.settings,
            importMappings: {
              ...(s.settings.importMappings ?? {}),
              [kind]: mapping,
            },
          },
        })),

      addDocument: (input) => {
        if (!state.sessionUserId) return null;
        if (!input.nomFichier.trim() || !input.fichier) return null;
        const id = uid('doc');
        const u = getUser(state, state.sessionUserId);
        update((s) => ({
          ...s,
          documents: [
            {
              id,
              entiteLiee: input.entiteLiee,
              type: input.type,
              fichier: input.fichier,
              nomFichier: input.nomFichier.trim(),
              mime: input.mime,
              date: todayISO(),
              deposePar: s.sessionUserId!,
              deposeParNom: u?.nom,
            },
            ...s.documents,
          ],
          journal: [
            {
              id: uid('j'),
              utilisateurId: s.sessionUserId!,
              entite: input.entiteLiee,
              action: 'ajout_document',
              valeurApres: `${input.type} · ${input.nomFichier}`,
              horodatage: new Date().toISOString(),
            },
            ...s.journal,
          ],
        }));
        return id;
      },

      removeDocument: (documentId) =>
        update((s) => {
          if (!s.sessionUserId) return s;
          return {
            ...s,
            documents: s.documents.map((d) =>
              d.id === documentId
                ? {
                    ...d,
                    archived: true,
                    archiveMotif: 'Retiré de la bibliothèque',
                  }
                : d,
            ),
            journal: [
              {
                id: uid('j'),
                utilisateurId: s.sessionUserId,
                entite: `document:${documentId}`,
                action: 'archive',
                valeurApres: 'document archivé',
                horodatage: new Date().toISOString(),
              },
              ...s.journal,
            ],
          };
        }),

      updateAlertDelai: (key, value) =>
        update((s) => {
          if (!s.sessionUserId) return s;
          const avant = String(s.settings.alertDelais[key]);
          return {
            ...s,
            settings: {
              ...s.settings,
              alertDelais: { ...s.settings.alertDelais, [key]: value },
            },
            journal: [
              {
                id: uid('j'),
                utilisateurId: s.sessionUserId,
                entite: 'settings:alertDelais',
                action: 'update_delai',
                valeurAvant: `${key}=${avant}`,
                valeurApres: `${key}=${value}`,
                horodatage: new Date().toISOString(),
              },
              ...s.journal,
            ],
          };
        }),

      updateUser: (userId, patch) =>
        update((s) => {
          if (!s.sessionUserId) return s;
          const prev = s.utilisateurs.find((u) => u.id === userId);
          if (!prev) return s;
          return {
            ...s,
            utilisateurs: s.utilisateurs.map((u) =>
              u.id === userId ? { ...u, ...patch } : u,
            ),
            journal: [
              {
                id: uid('j'),
                utilisateurId: s.sessionUserId,
                entite: `utilisateur:${userId}`,
                action: 'update_user',
                valeurAvant: JSON.stringify({
                  role: prev.role,
                  actif: prev.actif,
                  nom: prev.nom,
                }),
                valeurApres: JSON.stringify({
                  role: patch.role ?? prev.role,
                  actif: patch.actif ?? prev.actif,
                  nom: patch.nom ?? prev.nom,
                }),
                horodatage: new Date().toISOString(),
              },
              ...s.journal,
            ],
          };
        }),

      updateEquipe: (equipeId, patch) =>
        update((s) => {
          if (!s.sessionUserId) return s;
          const prev = s.equipes.find((e) => e.id === equipeId);
          return {
            ...s,
            equipes: s.equipes.map((e) => (e.id === equipeId ? { ...e, ...patch } : e)),
            journal: [
              {
                id: uid('j'),
                utilisateurId: s.sessionUserId,
                entite: `equipe:${equipeId}`,
                action: 'update_equipe',
                valeurAvant: prev
                  ? `${prev.libelle} · ${prev.compagnons.join(', ')}`
                  : undefined,
                valeurApres: patch.libelle
                  ? `${patch.libelle} · ${(patch.compagnons ?? prev?.compagnons ?? []).join(', ')}`
                  : patch.compagnons?.join(', '),
                horodatage: new Date().toISOString(),
              },
              ...s.journal,
            ],
          };
        }),

      updateChecklistModele: (modeleId, patch) =>
        update((s) => {
          if (!s.sessionUserId) return s;
          const prev = s.checklistModeles.find((m) => m.id === modeleId);
          return {
            ...s,
            checklistModeles: s.checklistModeles.map((m) =>
              m.id === modeleId ? { ...m, ...patch } : m,
            ),
            journal: [
              {
                id: uid('j'),
                utilisateurId: s.sessionUserId,
                entite: `modele:${modeleId}`,
                action: 'update_modele',
                valeurAvant: prev ? `${prev.libelle} (${prev.items.length} items)` : undefined,
                valeurApres: patch.libelle
                  ? `${patch.libelle} (${(patch.items ?? prev?.items ?? []).length} items)`
                  : `${(patch.items ?? prev?.items ?? []).length} items`,
                horodatage: new Date().toISOString(),
              },
              ...s.journal,
            ],
          };
        }),

      updateJoursFeries: (dates) =>
        update((s) => {
          if (!s.sessionUserId) return s;
          return {
            ...s,
            settings: { ...s.settings, joursFeries: [...dates].sort() },
            journal: [
              {
                id: uid('j'),
                utilisateurId: s.sessionUserId,
                entite: 'settings:joursFeries',
                action: 'update_feries',
                valeurAvant: `${s.settings.joursFeries.length} jours`,
                valeurApres: `${dates.length} jours`,
                horodatage: new Date().toISOString(),
              },
              ...s.journal,
            ],
          };
        }),

      updateColorCodes: (codes) =>
        update((s) => ({
          ...s,
          settings: {
            ...s.settings,
            colorCodes: {
              en_cours: '#3b82f6',
              divers: '#94a3b8',
              resine: '#8b5cf6',
              nettoyage: '#84cc16',
              bloque: '#dc2626',
              ...s.settings.colorCodes,
              ...codes,
            },
          },
        })),

      updateCommandeTypeLabel: (type, label) =>
        update((s) => ({
          ...s,
          settings: {
            ...s.settings,
            commandeTypeLabels: {
              ...(s.settings.commandeTypeLabels ?? {}),
              [type]: label,
            },
          },
        })),

      archiveAffaire: (id, motif) => {
        if (!motif.trim()) return { ok: false, error: 'Motif d’archivage obligatoire.' };
        update((s) => {
          if (!s.sessionUserId) return s;
          const prev = s.affaires.find((a) => a.id === id);
          return {
            ...s,
            affaires: s.affaires.map((a) =>
              a.id === id
                ? { ...a, archived: true, archivedMotif: motif.trim() }
                : a,
            ),
            journal: [
              {
                id: uid('j'),
                utilisateurId: s.sessionUserId,
                entite: `affaire:${id}`,
                action: 'archive',
                valeurAvant: prev?.statut,
                valeurApres: `archivé : ${motif.trim()}`,
                horodatage: new Date().toISOString(),
              },
              ...s.journal,
            ],
          };
        });
        return { ok: true };
      },

      restoreAffaire: (id) =>
        update((s) => {
          if (!s.sessionUserId) return s;
          return {
            ...s,
            affaires: s.affaires.map((a) =>
              a.id === id
                ? { ...a, archived: false, archivedMotif: undefined }
                : a,
            ),
            journal: [
              {
                id: uid('j'),
                utilisateurId: s.sessionUserId,
                entite: `affaire:${id}`,
                action: 'restore',
                valeurApres: 'restauré',
                horodatage: new Date().toISOString(),
              },
              ...s.journal,
            ],
          };
        }),

      archiveContrat: (id, motif) => {
        if (!motif.trim()) return { ok: false, error: 'Motif d’archivage obligatoire.' };
        update((s) => {
          if (!s.sessionUserId) return s;
          return {
            ...s,
            contrats: s.contrats.map((c) =>
              c.id === id ? { ...c, archived: true } : c,
            ),
            journal: [
              {
                id: uid('j'),
                utilisateurId: s.sessionUserId,
                entite: `contrat:${id}`,
                action: 'archive',
                valeurApres: motif.trim(),
                horodatage: new Date().toISOString(),
              },
              ...s.journal,
            ],
          };
        });
        return { ok: true };
      },

      restoreContrat: (id) =>
        update((s) => {
          if (!s.sessionUserId) return s;
          return {
            ...s,
            contrats: s.contrats.map((c) =>
              c.id === id ? { ...c, archived: false } : c,
            ),
            journal: [
              {
                id: uid('j'),
                utilisateurId: s.sessionUserId,
                entite: `contrat:${id}`,
                action: 'restore',
                valeurApres: 'restauré',
                horodatage: new Date().toISOString(),
              },
              ...s.journal,
            ],
          };
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
