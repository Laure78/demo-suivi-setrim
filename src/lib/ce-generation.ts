/**
 * À l'ouverture d'un exercice (01/07), chaque ContratEntretien
 * génère une Affaire de type contrat_entretien positionnée sur son mois contractuel.
 * Délègue au cycle de vie Affaire (lien unique devis → planning → alertes → facturation).
 */

export {
  genererLiensContratsExercice as genererAffairesExercice,
} from '@/lib/affaire-lifecycle';
