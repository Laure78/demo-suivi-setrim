import type { Affaire, Immeuble, PersistedState, Syndic, Utilisateur } from './types';

export function getUser(state: PersistedState, id: string | null | undefined): Utilisateur | undefined {
  if (!id) return undefined;
  return state.utilisateurs.find((u) => u.id === id);
}

export function getImmeuble(state: PersistedState, id: string): Immeuble | undefined {
  return state.immeubles.find((i) => i.id === id);
}

export function getSyndic(state: PersistedState, id: string): Syndic | undefined {
  return state.syndics.find((s) => s.id === id);
}

export function getSyndicForImmeuble(state: PersistedState, immeubleId: string): Syndic | undefined {
  const imm = getImmeuble(state, immeubleId);
  return imm ? getSyndic(state, imm.syndicId) : undefined;
}

export function getDevis(state: PersistedState, id: string) {
  return state.devis.find((d) => d.id === id);
}

export function getAffaire(state: PersistedState, id: string): Affaire | undefined {
  return state.affaires.find((a) => a.id === id);
}

export function adresseCourte(imm: Immeuble | undefined): string {
  if (!imm) return '—';
  return `${imm.adresse}, ${imm.codePostal} ${imm.ville}`;
}

export function joursConsommes(state: PersistedState, affaireId: string): number {
  return state.affectations.filter(
    (a) => a.affaireId === affaireId && a.type === 'CHANTIER',
  ).length;
}

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
