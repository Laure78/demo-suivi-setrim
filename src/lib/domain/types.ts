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
};

export type Checklist = {
  id: string;
  affaireId: string;
  modeleId: string;
};

export type NotaType = 'AUTO' | 'MANUEL';
export type NotaStatut = 'OUVERT' | 'FAIT' | 'ANNULE';
export type NotaPriorite = 'basse' | 'normale' | 'haute' | 'bloquante';

export type Nota = {
  id: string;
  objet: string;
  type: NotaType;
  /** ex. affaire:xyz / contrat:abc / facture:… */
  entiteLiee: string;
  echeance: string;
  responsableId: UserId;
  priorite: NotaPriorite;
  statut: NotaStatut;
  dateCloture?: string;
  creePar: UserId;
  createdAt: string;
};

export type FactureType = 'ACOMPTE' | 'SITUATION' | 'SOLDE' | 'CE';
export type FactureStatut = 'EMISE' | 'RELANCEE' | 'REGLEE' | 'LITIGE';

export type RelanceFacture = {
  niveau: 1 | 2 | 3;
  date: string;
  commentaire: string;
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
};

export type Message = {
  id: string;
  auteurId: UserId;
  destinataires: UserId[];
  /** Fil général = 'general' ; fil affaire = affaireId ; DM = dm:userA:userB */
  threadId: string;
  affaireId?: string;
  corps: string;
  piecesJointes: string[];
  luPar: UserId[];
  date: string;
  isImportant: boolean;
};

export type DocumentType = 'DEVIS' | 'FACTURE' | 'PHOTO' | 'PV' | 'PLAN' | 'BON' | 'AUTRE';

export type Document = {
  id: string;
  entiteLiee: string;
  type: DocumentType;
  fichier: string;
  nomFichier: string;
  date: string;
  deposePar: UserId;
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

export type AppSettings = {
  alertDelais: AlertDelais;
  joursFeries: string[];
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
