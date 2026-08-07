/**
 * Modèle de données SETRIM / Sétrime — plateforme interne unique.
 * Source de vérité : tout ce qui doit être suivi vit ici.
 */

export type Role = 'dirigeant' | 'responsable' | 'assistante' | 'suivi_chantier';

export type UserId = string;

export type Utilisateur = {
  id: UserId;
  nom: string;
  email: string;
  /** Mot de passe démo (clair) — à remplacer par hash serveur en prod */
  password: string;
  role: Role;
  telephone: string;
  actif: boolean;
  preferencesNotifications: {
    push: boolean;
    emailDigest: boolean;
  };
};

export type Contact = {
  id: string;
  nom: string;
  telephone?: string;
  email?: string;
  fonction?: string;
};

export type Syndic = {
  id: string;
  nom: string;
  contacts: Contact[];
  telephone: string;
  email: string;
  notes: string;
  archived?: boolean;
};

export type Immeuble = {
  id: string;
  syndicId: string;
  adresse: string;
  codePostal: string;
  ville: string;
  acces: string;
  notesTerrain: string;
  archived?: boolean;
};

export type DevisType = 'TRAVAUX' | 'CE' | 'RESINE' | 'NETTOYAGE' | 'DIVERS';
export type DevisStatut = 'EN_ATTENTE' | 'SIGNE' | 'REFUSE' | 'ANNULE';
export type DevisSource = 'SAISIE' | 'IMPORT_EXCEL';

export type Devis = {
  id: string;
  numeroBatappli: string;
  date: string; // YYYY-MM-DD
  montantHT: number;
  montantTTC: number;
  type: DevisType;
  immeubleId: string;
  statut: DevisStatut;
  source: DevisSource;
  fichierPdf?: string;
  archived?: boolean;
};

export type AffaireStatut =
  | 'PORTEFEUILLE'
  | 'PLANIFIE'
  | 'EN_COURS'
  | 'TERMINE'
  | 'FACTURE'
  | 'SOLDE'
  | 'SUSPENDU';

export type Affaire = {
  id: string;
  devisId: string;
  immeubleId: string;
  statut: AffaireStatut;
  /** Saisi manuellement à la signature — OBLIGATOIRE */
  joursChargeEstimes: number | null;
  acompteAttendu: number;
  acompteRecu: number;
  dateAcompte?: string;
  motifSuspension?: string;
  dateMotif?: string;
  dateDerniereAction: string;
  checklistId?: string;
  commentaire: string;
  archived?: boolean;
  archivedMotif?: string;
};

export type ContratCEStatut = 'ACTIF' | 'EN_RESILIATION' | 'RESILIE' | 'ATTENTE_OS';

export type ContratEntretien = {
  id: string;
  immeubleId: string;
  syndicId: string;
  montantHTAnnuel: number;
  nbCompagnons: number;
  nbJours: number;
  /** Mois 1-12 — engagement contractuel */
  moisPassageContractuel: number;
  exerciceDebut: string; // MM-DD typiquement 07-01
  exerciceFin: string; // 06-30
  taciteReconduction: boolean;
  preavisMois: number;
  statut: ContratCEStatut;
  dateEffetResiliation?: string;
  commentaire: string;
  archived?: boolean;
};

export type PassageCEStatut =
  | 'A_PROGRAMMER'
  | 'PROGRAMME'
  | 'REALISE'
  | 'HORS_DELAI'
  | 'FACTURE';

export type PassageCE = {
  id: string;
  contratId: string;
  exercice: string; // ex. 2025-2026
  datePrevue?: string;
  dateRealisee?: string;
  equipeId?: string;
  factureId?: string;
  statut: PassageCEStatut;
  bonIntervention?: string;
  photos: string[];
  compteRendu: string;
};

export type Equipe = {
  id: string;
  libelle: string;
  compagnons: string[];
  actif: boolean;
  color: string;
  bg: string;
};

export type AffectationType =
  | 'CHANTIER'
  | 'ABSENT'
  | 'CONGES'
  | 'FERIE'
  | 'RDV'
  | 'FORMATION'
  | 'INTEMPERIE';

export type Affectation = {
  id: string;
  date: string;
  equipeId: string;
  affaireId?: string;
  passageCeId?: string;
  type: AffectationType;
  commentaire: string;
};

export type ChecklistModeleItem = {
  ordre: number;
  libelle: string;
  obligatoire: boolean;
  delaiJours: number;
};

export type ChecklistModele = {
  id: string;
  libelle: string;
  typeChantier: DevisType | 'TOUS';
  items: ChecklistModeleItem[];
};

export type ChecklistItemHistoryKind =
  | 'create'
  | 'check'
  | 'uncheck'
  | 'edit'
  | 'archive'
  | 'restore'
  | 'reorder'
  | 'add_to_modele';

export type ChecklistItemHistoryEntry = {
  id: string;
  at: string;
  userId: UserId;
  userName: string;
  kind: ChecklistItemHistoryKind;
  detail: string;
  /** Horodatage de réalisation conservé lors d'un décochage */
  previousDateFait?: string;
  previousFaitPar?: string;
};

export type ChecklistItem = {
  id: string;
  checklistId: string;
  libelle: string;
  obligatoire: boolean;
  echeance: string;
  fait: boolean;
  dateFait?: string;
  faitPar?: string;
  commentaire: string;
  pieceJointe?: string;
  /** Ordre d'affichage (glisser-déposer) */
  ordre: number;
  /** Responsable */
  assigneeId?: UserId;
  actionId?: string;
  messageId?: string;
  /** Créé manuellement (hors modèle) */
  manuel?: boolean;
  archived?: boolean;
  archiveMotif?: string;
  archivedAt?: string;
  archivedBy?: string;
  history: ChecklistItemHistoryEntry[];
};

export type Checklist = {
  id: string;
  affaireId: string;
  modeleId: string;
};

export type ActionPriorite = 'basse' | 'normale' | 'haute' | 'bloquante';
export type ActionStatut = 'OUVERT' | 'FAIT' | 'ANNULE';

/** Action assignable — créée manuellement ou depuis un message. */
export type ActionItem = {
  id: string;
  libelle: string;
  echeance: string;
  assigneeId: UserId;
  priorite: ActionPriorite;
  statut: ActionStatut;
  affaireId?: string;
  checklistItemId?: string;
  messageId?: string;
  creePar: UserId;
  createdAt: string;
  dateFait?: string;
  faitPar?: string;
};

export type NotaType = 'AUTO' | 'MANUEL';
export type NotaStatut = 'OUVERT' | 'FAIT' | 'ANNULE';
export type NotaPriorite = 'basse' | 'normale' | 'haute' | 'bloquante';

export type NotaReport = {
  date: string;
  motif: string;
  parUserId: UserId;
  ancienneEcheance: string;
  nouvelleEcheance: string;
};

export type Nota = {
  id: string;
  objet: string;
  type: NotaType;
  /** ex. affaire:xyz / contrat:abc / facture:… / commande:… */
  entiteLiee: string;
  echeance: string;
  responsableId: UserId;
  priorite: NotaPriorite;
  statut: NotaStatut;
  dateCloture?: string;
  creePar: UserId;
  createdAt: string;
  /** Clé stable pour dédupliquer les notas AUTO */
  alertKey?: string;
  /** Bloque la planification (ex. acompte non reçu) */
  bloquePlanification?: boolean;
  /** Niveau relance facture 1 / 2 / 3 */
  niveauRelance?: 1 | 2 | 3;
  archived?: boolean;
  archiveMotif?: string;
  archivedAt?: string;
  archivedBy?: string;
  reports?: NotaReport[];
  /** Clôturé automatiquement par le moteur (règle plus applicable) — peut être recréé */
  engineSuppressed?: boolean;
};

export type AuditEvent = {
  id: string;
  at: string;
  userId: UserId;
  userName: string;
  action: string;
  detail: string;
};

export type FactureType = 'ACOMPTE' | 'SITUATION' | 'SOLDE' | 'CE';
export type FactureStatut = 'EMISE' | 'RELANCEE' | 'REGLEE' | 'LITIGE';

export type RelanceFacture = {
  niveau: 1 | 2 | 3;
  date: string;
  commentaire: string;
  parUserId?: UserId;
  parNom?: string;
};

export type Facture = {
  id: string;
  affaireId?: string;
  passageCeId?: string;
  numero: string;
  type: FactureType;
  dateEmission: string;
  montant: number;
  statut: FactureStatut;
  dateReglement?: string;
  relances: RelanceFacture[];
  fichierPdf?: string;
  archived?: boolean;
  creePar?: UserId;
  creeParNom?: string;
  createdAt?: string;
  historique?: AuditEvent[];
};

export type CommandeType =
  | 'BENNE'
  | 'ROULOTTE'
  | 'NACELLE'
  | 'MATERIAUX'
  | 'LOCATION'
  | 'ECHAFAUDAGE';

export type CommandeStatut =
  | 'A_PASSER'
  | 'COMMANDEE'
  | 'LIVREE'
  | 'ANNULEE';

export type Commande = {
  id: string;
  affaireId: string;
  type: CommandeType;
  fournisseur: string;
  dateBesoin: string;
  dateCommande?: string;
  montant: number;
  statut: CommandeStatut;
  bonCommande?: string;
  creePar?: UserId;
  creeParNom?: string;
  createdAt?: string;
  historique?: AuditEvent[];
};

export type DemandePrixStatut = 'ENVOYEE' | 'RELANCEE' | 'RECUE' | 'ABANDONNEE';

export type DemandePrix = {
  id: string;
  affaireId: string;
  fournisseur: string;
  objet: string;
  dateDemande: string;
  dateReponse?: string;
  montantRecu?: number;
  statut: DemandePrixStatut;
  creePar?: UserId;
  creeParNom?: string;
  createdAt?: string;
  historique?: AuditEvent[];
};

export type PieceJointe = {
  id: string;
  nom: string;
  mime: string;
  /** data URL (photo / fichier) — démo local + sync API */
  dataUrl: string;
};

export type Message = {
  id: string;
  auteurId: UserId;
  destinataires: UserId[];
  /** Fil général = 'general' ; fil affaire = affaireId ; DM = dm:userA:userB */
  threadId: string;
  affaireId?: string;
  corps: string;
  piecesJointes: PieceJointe[];
  luPar: UserId[];
  date: string;
  isImportant: boolean;
  /** Action créée depuis ce message */
  actionId?: string;
};

export type DocumentType = 'DEVIS' | 'FACTURE' | 'PHOTO' | 'PV' | 'PLAN' | 'BON' | 'AUTRE';

export type Document = {
  id: string;
  /** affaire:id | contrat:id | immeuble:id */
  entiteLiee: string;
  type: DocumentType;
  /** data URL ou référence fichier */
  fichier: string;
  nomFichier: string;
  mime?: string;
  date: string;
  deposePar: UserId;
  deposeParNom?: string;
  archived?: boolean;
  archiveMotif?: string;
};

export type JournalActivite = {
  id: string;
  utilisateurId: UserId;
  entite: string;
  action: string;
  valeurAvant?: string;
  valeurApres?: string;
  horodatage: string;
};

/** Délais d'alerte paramétrables (jours) — rien en dur côté métier */
export type AlertDelais = {
  acompteNonRecu: number;
  affaireDormante: number;
  suspensionRelance: number;
  termineNonFacture: number;
  factureImpaye1: number;
  factureImpaye2: number;
  factureImpaye3: number;
  passageCeJ45: number;
  passageCeJ15: number;
  ceAFacturer: number;
  reconductionJ90: number;
  commandeAvantBesoin: number;
  demandePrixSansReponse: number;
};

export type ImportSheetKind = 'portefeuille' | 'planning' | 'planning_ce';

/** fieldId → libellé d'en-tête Excel mémorisé */
export type ColumnMapping = Record<string, string>;

export type ColorCodes = {
  en_cours: string;
  divers: string;
  resine: string;
  nettoyage: string;
  bloque: string;
};

export type AppSettings = {
  alertDelais: AlertDelais;
  joursFeries: string[];
  /** Mapping colonnes par type d'onglet — rétabli au prochain import */
  importMappings?: Partial<Record<ImportSheetKind, ColumnMapping>>;
  /** Libellés types de commande (paramétrables) */
  commandeTypeLabels?: Partial<Record<string, string>>;
  /** Codes couleur portefeuille */
  colorCodes?: ColorCodes;
};

export const DEFAULT_COLOR_CODES: ColorCodes = {
  en_cours: '#3b82f6',
  divers: '#94a3b8',
  resine: '#8b5cf6',
  nettoyage: '#84cc16',
  bloque: '#dc2626',
};

export const DEFAULT_COMMANDE_TYPE_LABELS: Record<string, string> = {
  BENNE: 'Benne',
  ROULOTTE: 'Roulotte',
  NACELLE: 'Nacelle',
  ECHAFAUDAGE: 'Échafaudage',
  MATERIAUX: 'Matériaux',
  LOCATION: 'Location',
};

export type PersistedState = {
  version: number;
  sessionUserId: UserId | null;
  utilisateurs: Utilisateur[];
  syndics: Syndic[];
  immeubles: Immeuble[];
  devis: Devis[];
  affaires: Affaire[];
  contrats: ContratEntretien[];
  passagesCe: PassageCE[];
  equipes: Equipe[];
  affectations: Affectation[];
  checklistModeles: ChecklistModele[];
  checklists: Checklist[];
  checklistItems: ChecklistItem[];
  actions: ActionItem[];
  notas: Nota[];
  factures: Facture[];
  commandes: Commande[];
  demandesPrix: DemandePrix[];
  messages: Message[];
  documents: Document[];
  journal: JournalActivite[];
  settings: AppSettings;
};

export const DEFAULT_ALERT_DELAIS: AlertDelais = {
  acompteNonRecu: 15,
  affaireDormante: 30,
  suspensionRelance: 15,
  termineNonFacture: 7,
  factureImpaye1: 30,
  factureImpaye2: 45,
  factureImpaye3: 60,
  passageCeJ45: 45,
  passageCeJ15: 15,
  ceAFacturer: 7,
  reconductionJ90: 90,
  commandeAvantBesoin: 3,
  demandePrixSansReponse: 7,
};

export const ROLE_LABELS: Record<Role, string> = {
  dirigeant: 'Dirigeant',
  responsable: 'Responsable',
  assistante: 'Assistante',
  suivi_chantier: 'Suivi chantier',
};
