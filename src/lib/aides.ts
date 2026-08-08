/** Textes d’aide au survol (icône ?). À aligner avec le tutoriel si le comportement change. */

export const AIDES = {
  accueil:
    'Tableau de bord : vue d’ensemble (tâches, chantiers, affaires, facturation). Cliquez le logo SETRIM pour y revenir.',
  who: 'Changez de personne du bureau pour voir l’écran comme elle. Les 5 comptes sont Audrey, Mélissa, Valérie, Denis et Philippe.',
  messagerie:
    'Messagerie interne : fil Équipe SETRIM et conversations privées. Les messages restent en historique.',
  remarques: 'Notez une remarque sur l’écran en cours (idée, bug, point métier).',
  tutoriel: 'Guide complet du fonctionnement de la plateforme. Mis à jour quand l’outil évolue.',
  navAujourdhui: 'Vos tâches du jour et les chantiers planifiés aujourd’hui.',
  navPortefeuille: 'Toutes les affaires (commande → soldé). Cliquez une ligne pour ouvrir la fiche.',
  navPlanning: 'Agenda des équipes chantier : vues Jour, Semaine, Mois, Année.',
  navContrats: 'Contrats d’entretien sur l’exercice (juillet → juin).',
  navFacturation: 'Acomptes, soldes et impayés à suivre.',
  tachesJour:
    'Cochez « C’est fait » quand la tâche est terminée. Le rouge = urgent, le jaune = à faire.',
  nouvelleTache:
    'Créez une tâche pour vous. Vous pouvez la lier à une affaire du portefeuille.',
  chantiersJour: 'Cliquez un chantier pour ouvrir l’affaire dans le portefeuille.',
  planning:
    'Changez de vue (Jour / Semaine / Mois / Année). Ajoutez une « Tâche à faire (post-it) » : elle passe sur la fiche chantier et dans Aujourd’hui / alertes.',
  planTache:
    'Tâche = post-it numérique. Liée à une affaire → fiche chantier + alertes Aujourd’hui chez le responsable. Urgent = pastille rouge sur le planning.',
  portefeuille:
    'Le devis validé = l’affaire. Onglets : commande, programmé, en cours, soldé. Onglet Planning de la fiche : modifier les créneaux met à jour l’agenda.',
  contrats:
    'Mois contractuel = date anniversaire. Cliquez une ligne pour ouvrir l’affaire liée. Bouton « Lier exercice » pour générer planning et alertes.',
  facturation:
    'Suivi des acomptes et soldes. Cliquez une affaire pour ouvrir la fiche et facturer.',
  msgProfil: 'Choisissez un emoji visible dans la messagerie et auprès de l’équipe.',
  msgListe: 'Équipe SETRIM (tout le monde) ou un collègue en privé. Recherchez par nom.',
  msgComposer:
    'Texte, photo ou pièce jointe. Survolez un message pour en faire une tâche. Pas de suppression : historique conservé.',
  msgTache: 'Transforme ce message en tâche sur Aujourd’hui.',
} as const;
