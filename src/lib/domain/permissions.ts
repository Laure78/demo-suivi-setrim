import type { Role, Utilisateur } from './types';

/** Tout le monde lit tout. Seuls dirigeant & responsable : supprimer, délais, modèles. */
export function canAdmin(user: Utilisateur | null | undefined): boolean {
  if (!user) return false;
  return user.role === 'dirigeant' || user.role === 'responsable';
}

export function canDelete(user: Utilisateur | null | undefined): boolean {
  return canAdmin(user);
}

export function canEditChecklistModeles(user: Utilisateur | null | undefined): boolean {
  return canAdmin(user);
}

export function canEditAlertDelais(user: Utilisateur | null | undefined): boolean {
  return canAdmin(user);
}

export function roleHomeHint(role: Role): string {
  switch (role) {
    case 'dirigeant':
      return 'Mobile chantier — consulte, coche, valide, reçoit les escalades.';
    case 'responsable':
      return 'Desktop — plan de charge, CE, relances.';
    case 'assistante':
      return 'Desktop — devis, factures, commandes, acomptes.';
    case 'suivi_chantier':
      return 'Desktop + mobile — check-lists, notas, commandes, roulottes.';
  }
}
