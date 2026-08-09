export const ACCES_LABEL: Record<string, string> = {
  administrateur: 'Administrateur',
  collaborateur: 'Collaborateur',
};

export function isAdministrateur(acces: string | null | undefined): boolean {
  return acces === 'administrateur';
}
