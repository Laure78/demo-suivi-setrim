/** Types — source de vérité unique SETRIM suivi chantier. */

export type UserId = 'denis' | 'philippe' | 'melissa' | 'audrey' | 'valerie';

export type TeamId = 'equipe-a' | 'equipe-b' | 'equipe-c';

export type ChecklistTemplateId = 'refection' | 'neuf' | 'entretien';

/** Statut dérivé des dates (calculé). */
export type ChantierStatus = 'en_cours' | 'programme' | 'termine';

export type ContratStatus = 'a_facturer' | 'a_venir' | 'fait';

export type ActionPhoto = {
  id: string;
  /** data URL base64 (démo localStorage) */
  dataUrl: string;
  addedAt: string;
  addedBy: string;
};

export type ActionItem = {
  id: string;
  label: string;
  dueDate: string; // YYYY-MM-DD
  done: boolean;
  doneAt?: string;
  doneBy?: string;
  /** Responsable de l'action (pour Mes actions + escalade) */
  assigneeId: UserId;
  photos?: ActionPhoto[];
};

export type Chantier = {
  id: string;
  title: string;
  client: string;
  address: string;
  startDate: string;
  endDate: string;
  teamId: TeamId;
  templateId: ChecklistTemplateId;
  actions: ActionItem[];
  devisNumero?: string;
  montantHT?: number;
};

export type Contrat = {
  id: string;
  client: string;
  anniversaryDate: string;
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

export type Message = {
  id: string;
  threadId: string;
  authorId: UserId;
  authorName: string;
  text: string;
  createdAt: string;
  isImportant: boolean;
};

export type JournalKind =
  | 'check'
  | 'uncheck'
  | 'add_action'
  | 'photo'
  | 'message_important';

/** Journal horodaté par chantier. */
export type JournalEntry = {
  id: string;
  chantierId: string;
  createdAt: string;
  userId: UserId;
  userName: string;
  kind: JournalKind;
  text: string;
  actionId?: string;
  /** Miniature optionnelle (événement photo) */
  photoDataUrl?: string;
};

export type PersistedState = {
  version: number;
  activeUserId: UserId;
  chantiers: Chantier[];
  contrats: Contrat[];
  messages: Message[];
  journal: JournalEntry[];
  unreadByUser: Record<string, Record<string, number>>;
};
