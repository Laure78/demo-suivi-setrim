/** Libellés FR — traçabilité admin (factures / commandes / DP). */

import type {
  CommandeStatut,
  CommandeType,
  DemandePrixStatut,
  FactureStatut,
  FactureType,
} from './types';

export const FACTURE_TYPE_LABEL: Record<FactureType, string> = {
  ACOMPTE: 'Acompte',
  SITUATION: 'Situation',
  SOLDE: 'Solde',
  CE: 'CE',
};

export const FACTURE_STATUT_LABEL: Record<FactureStatut, string> = {
  EMISE: 'Émise',
  RELANCEE: 'Relancée',
  REGLEE: 'Réglée',
  LITIGE: 'Litige',
};

export const COMMANDE_TYPE_LABEL: Record<CommandeType, string> = {
  BENNE: 'Benne',
  ROULOTTE: 'Roulotte',
  NACELLE: 'Nacelle',
  ECHAFAUDAGE: 'Échafaudage',
  MATERIAUX: 'Matériaux',
  LOCATION: 'Location',
};

export const COMMANDE_STATUT_LABEL: Record<CommandeStatut, string> = {
  A_PASSER: 'À passer',
  COMMANDEE: 'Commandée',
  LIVREE: 'Livrée',
  ANNULEE: 'Annulée',
};

export const DP_STATUT_LABEL: Record<DemandePrixStatut, string> = {
  ENVOYEE: 'Envoyée',
  RELANCEE: 'Relancée',
  RECUE: 'Reçue',
  ABANDONNEE: 'Abandonnée',
};

export function factureStatutClass(s: FactureStatut): string {
  if (s === 'REGLEE') return 'bg-emerald-100 text-emerald-900';
  if (s === 'LITIGE') return 'bg-purple-100 text-purple-900';
  if (s === 'RELANCEE') return 'bg-amber-100 text-amber-900';
  return 'bg-red-100 text-red-800';
}

export function commandeStatutClass(s: CommandeStatut): string {
  if (s === 'LIVREE') return 'bg-emerald-100 text-emerald-900';
  if (s === 'COMMANDEE') return 'bg-sky-100 text-sky-900';
  if (s === 'ANNULEE') return 'bg-slate-200 text-slate-600';
  return 'bg-amber-100 text-amber-900';
}

export function dpStatutClass(s: DemandePrixStatut): string {
  if (s === 'RECUE') return 'bg-emerald-100 text-emerald-900';
  if (s === 'RELANCEE') return 'bg-amber-100 text-amber-900';
  if (s === 'ABANDONNEE') return 'bg-slate-200 text-slate-600';
  return 'bg-sky-100 text-sky-900';
}
