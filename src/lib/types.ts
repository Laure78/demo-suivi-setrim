/** Types de la démo suivi chantier / étanchéité — source de vérité unique. */

export type UserId =
  | 'dirigeant'
  | 'assistante-1'
  | 'assistante-2'
  | 'responsable'
  | 'melissa';

export type TeamId = 'equipe-a' | 'equipe-b' | 'equipe-c';

/** Statut dérivé des dates (calculé, pas stocké séparément). */
export type ChantierStatus = 'en_cours' | 'programme' | 'termine';

export type ContratStatus = 'a_facturer' | 'fait';

export type ActionItem = {
  id: string;
  label: string;
  dueDate: string; // YYYY-MM-DD
  done: boolean;
  doneAt?: string; // ISO datetime
  doneBy?: string; // nom affiché
};

/**
 * Chantier — modèle unique partagé par :
 * tableau de bord, fiche, messagerie, planning.
 */
export type Chantier = {
  id: string;
  title: string;
  client: string;
  address: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  teamId: TeamId;
  actions: ActionItem[];
  /** Optionnel — issu d'un import Batappli */
  devisNumero?: string;
  montantHT?: number;
};

export type Contrat = {
  id: string;
  client: string;
  anniversaryDate: string; // YYYY-MM-DD
  status: ContratStatus;
};

export type AppUser = {
  id: UserId;
  name: string;
  role: string;
};

export type Team = {
  id: TeamId;
  label: string;
  shortLabel: string;
  color: string;
  bg: string;
};

/** Message interne — threadId = 'general' ou id chantier. */
export type Message = {
  id: string;
  threadId: string;
  authorId: UserId;
  authorName: string;
  text: string;
  createdAt: string; // ISO
  /** Marqué « important » à l'envoi → pin + alerte dashboard */
  isImportant: boolean;
};

/** État persisté dans localStorage. */
export type PersistedState = {
  version: number;
  activeUserId: UserId;
  chantiers: Chantier[];
  contrats: Contrat[];
  messages: Message[];
  /**
   * Non-lus par utilisateur puis par thread.
   * Prêt pour un back-end multi-utilisateur.
   */
  unreadByUser: Record<string, Record<string, number>>;
};
