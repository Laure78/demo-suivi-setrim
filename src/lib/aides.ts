/** Textes d’aide au survol (icône ?). À aligner avec le tutoriel si le comportement change. */

export const AIDES = {
  accueil:
    'Tableau de bord : vue d’ensemble (tâches, chantiers, affaires, clients, facturation). Cliquez le logo SETRIM pour y revenir.',
  who: 'Les 5 accès individuels bureau. Cliquez une pastille pour basculer (chacun a son mot de passe). Pastille Connecté = session en cours.',
  messagerie:
    'Messagerie type WhatsApp. Inviter un externe depuis l’en-tête du fil. Menu message (répondre, réagir…). Touche 8.',
  urgences:
    'Cloche : urgences du jour (en retard, aujourd’hui, à anticiper). S’ouvre à la 1ʳᵉ connexion du jour. Fait / Reporter / Ouvrir la fiche.',
  tutoriel: 'Guide complet du fonctionnement de la plateforme. Mis à jour quand l’outil évolue (dernière maj : Août 2026).',
  navAujourdhui: 'Vos tâches du jour et les chantiers planifiés aujourd’hui.',
  navMessagerie:
    'Équipe SETRIM, directs, fils ouverts aux externes. Invitation depuis l’en-tête. Touche 8.',
  navPortefeuille: 'Toutes les affaires (commande → soldé). Cliquez une ligne pour ouvrir la fiche.',
  navClients:
    'Fiches clients : contact, téléphone, notes. Rattachez chaque chantier à un syndic / client. Touche 7.',
  navPlanning:
    'Agenda des équipes : Jour / Semaine / Mois / Année. Vert = chantier, bleu = CE (½–1 j).',
  navContrats:
    'Contrats d’entretien (juillet → juin). Statuts calculés. Date ↔ planning synchronisés.',
  navFacturation: 'Acomptes, soldes et impayés à suivre.',
  navAdministration:
    'Comptes utilisateurs (onglet dans Paramètres). Réservé à Valérie et Denis.',
  parametres:
    'Profil, notifications, support. Administrateurs : utilisateurs, participants externes, entreprise, abonnement. Touche 9.',
  navPlus:
    'Sur téléphone : autres écrans (Aujourd’hui, Clients, Facturation, Tutoriel), bascule « Je suis » et déconnexion.',
  tachesJour:
    'Sur le post-it : « C’est fait » coche la tâche (vous restez sur Aujourd’hui). « Voir l’affaire » ouvre la fiche chantier sans quitter la page. Rouge = urgent.',
  nouvelleTache:
    'Créez une tâche pour vous. Vous pouvez la lier à une affaire du portefeuille.',
  chantiersJour: 'Cliquez un chantier pour ouvrir l’affaire dans le portefeuille.',
  planning:
    'Vert = chantier (travaux). Bleu = contrat d’entretien (½ j à 1 j). Déplacer un CE met à jour la date du contrat. Supprimer un CE → contrat à reprogrammer.',
  planDates:
    'Chantier lié à une affaire : date de début + nombre de jours → Enregistrer les dates (toute la période se recalcule, week-ends exclus).',
  planTache:
    'Tâche = post-it numérique. Liée à une affaire → fiche chantier + alertes Aujourd’hui chez le responsable. Urgent = pastille rouge sur le planning.',
  portefeuille:
    'Le devis validé = l’affaire. Modifier : infos + fiche client. Onglet Planning : créneaux et recalage → agenda à jour.',
  clients:
    'Fiche client : contact, tél., notes. Section Chantiers liés : Lier / Retirer un chantier du portefeuille.',
  contrats:
    'Mois contractuel = obligation. Statut calculé (À programmer / Programmé / Réalisé / En retard / Hors mois). Programmer → créneau bleu au planning.',
  facturation:
    'Suivi des acomptes et soldes. Cliquez une affaire pour ouvrir la fiche et facturer.',
  msgListe:
    'Discussions : Équipe SETRIM et directs. Bouton + pour un nouveau message. Les fils chantier sont sur la fiche affaire.',
  msgComposer:
    'Saisie en bas : texte, photo ou pièce jointe. Bouton vert pour envoyer. Survolez un message → + tâche.',
  msgTache: 'Transforme ce message en tâche sur Aujourd’hui.',
} as const;
