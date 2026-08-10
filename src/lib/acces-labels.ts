export const ACCES_LABEL: Record<string, string> = {
  administrateur: 'Administrateur',
  collaborateur: 'Collaborateur',
  externe: 'Participant externe',
};

export function isAdministrateur(acces: string | null | undefined): boolean {
  return acces === 'administrateur';
}

export function isExterne(acces: string | null | undefined): boolean {
  return acces === 'externe';
}

export function isInterne(acces: string | null | undefined): boolean {
  return acces === 'administrateur' || acces === 'collaborateur';
}
