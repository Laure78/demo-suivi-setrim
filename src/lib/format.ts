/** Formatage monétaire et dates — vocabulaire SETRIM */

export function eur(n: number | string, digits = 2): string {
  const v = typeof n === 'string' ? Number(n) : n;
  return (
    v.toLocaleString('fr-FR', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }) + ' €'
  );
}

export function eur0(n: number | string): string {
  return eur(n, 0);
}

export function formatDateFr(d: Date | string | null | undefined): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateShort(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

export function formatDateTimeFr(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function daysLate(echeance: Date, now = new Date()): number {
  const a = new Date(echeance);
  a.setHours(12, 0, 0, 0);
  const b = new Date(now);
  b.setHours(12, 0, 0, 0);
  const diff = Math.floor((b.getTime() - a.getTime()) / 86_400_000);
  return diff > 0 ? diff : 0;
}

export const STATUT_LABEL: Record<string, string> = {
  commande: 'Commande',
  programme: 'Programmé',
  encours: 'En cours',
  solde: 'Soldé',
};

export const STATUT_PLURAL: Record<string, string> = {
  commande: 'Commandes',
  programme: 'Programmés',
  encours: 'En cours',
  solde: 'Soldés',
};

export const NIVEAU_LABEL: Record<number, string> = {
  1: 'Info',
  2: 'À faire',
  3: 'Urgent',
};

/** Types de pièces du dossier affaire */
export const PIECE_TYPE_LABEL: Record<string, string> = {
  devis: 'Devis',
  os: 'Ordre de service',
  autorisation: 'Autorisation travaux / stationnement',
  facture: 'Facture',
  photo: 'Photo chantier',
  autre: 'Autre document',
};

export const PIECE_TYPES = [
  'devis',
  'os',
  'autorisation',
  'facture',
  'photo',
  'autre',
] as const;

/** Traitement d'une facture (acompte / solde) */
export const FACTURE_TRAITEMENT = [
  { value: 'non_emise', label: 'Non émise' },
  { value: 'emise', label: 'Émise' },
  { value: 'encaissee', label: 'Encaissée' },
] as const;

export type FactureTraitement = (typeof FACTURE_TRAITEMENT)[number]['value'];

export function factureTraitement(f: {
  dateEmission: string | null;
  dateEncaissement: string | null;
} | null | undefined): FactureTraitement {
  if (!f) return 'non_emise';
  if (f.dateEncaissement) return 'encaissee';
  if (f.dateEmission) return 'emise';
  return 'non_emise';
}

export const ROLE_LABEL: Record<string, string> = {
  assistante: 'Assistante travaux',
  responsable: 'Resp. administrative et financière',
  dirigeant: 'Dirigeant · conducteur de travaux',
  conducteur: 'Conducteur de travaux',
};

export const SCREENS = [
  { id: 'aujourdhui', href: '/aujourdhui', label: "Aujourd'hui", k: '1' },
  { id: 'messages', href: '/messages', label: 'Messages', k: '2' },
  { id: 'portefeuille', href: '/portefeuille', label: 'Portefeuille', k: '3' },
  { id: 'planning', href: '/planning', label: 'Planning', k: '4' },
  { id: 'contrats', href: '/contrats', label: "Contrats d'entretien", k: '5' },
  { id: 'facturation', href: '/facturation', label: 'Facturation', k: '6' },
] as const;

export const MOIS_EXERCICE = [
  'Juil.',
  'Août',
  'Sept.',
  'Oct.',
  'Nov.',
  'Déc.',
  'Janv.',
  'Févr.',
  'Mars',
  'Avr.',
  'Mai',
  'Juin',
] as const;

/** Modèles de tâches proposés à la création d'une affaire */
export const MODELES_TACHES = [
  { titre: "Demande d'autorisation de travaux / de stationnement", offsetDays: -15, niveau: 3 },
  { titre: 'Demande de prix fournisseur', offsetDays: -10, niveau: 2 },
  { titre: 'Commande de benne / roulotte', offsetDays: -2, niveau: 2 },
  { titre: 'Reprise de benne / roulotte', offsetDays: 1, niveau: 3, afterEnd: true },
  { titre: "Pose puis dépose d'échafaudage", offsetDays: 0, niveau: 2 },
  { titre: "Facture d'acompte", offsetDays: 0, niveau: 3 },
  { titre: 'Facture de solde', offsetDays: 0, niveau: 3, afterEnd: true },
  { titre: 'Relance impayé', offsetDays: 30, niveau: 3, afterInvoice: true },
] as const;
