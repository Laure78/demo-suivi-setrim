/**
 * Contenu de la rubrique Tutoriel.
 * À mettre à jour dès qu’une fonctionnalité change (voir .cursor/rules/tutoriel-maj.mdc).
 */

export type TutorielSection = {
  id: string;
  titre: string;
  resume: string;
  points: string[];
  lien?: { href: string; label: string };
};

export const TUTORIEL_MAJ = 'Août 2026';

export const TUTORIEL_INTRO = {
  titre: 'Comment fonctionne SETRIM',
  texte:
    'Cette plateforme sert au suivi des affaires d’étanchéité au quotidien : tâches du bureau, chantiers, planning des équipes, messagerie interne, contrats d’entretien et facturation. Ce tutoriel décrit l’outil tel qu’il est aujourd’hui.',
};

export const TUTORIEL_SECTIONS: TutorielSection[] = [
  {
    id: 'accueil',
    titre: 'Accueil (tableau de bord)',
    resume:
      'Cliquez le logo SETRIM (menu latéral ou drawer mobile) pour ouvrir l’accueil : indicateurs et accès rapide à tous les écrans.',
    points: [
      'Cartes cliquables : tâches, chantiers du jour, affaires, facturation, contrats, messagerie.',
      'Les alertes en haut signalent retards et points à traiter.',
      'Après connexion, vous arrivez sur cet accueil.',
    ],
    lien: { href: '/', label: 'Ouvrir l’accueil' },
  },
  {
    id: 'connexion',
    titre: 'Connexion et « Je suis »',
    resume:
      'La démo propose les 5 personnes du bureau. Sur le terrain, 15 ouvriers / chefs de chantier sont organisés en équipes A, B, C ; 2 prestataires interviennent en externe.',
    points: [
      'Connectez-vous avec un compte bureau (Audrey, Mélissa, Valérie, Denis, Philippe).',
      'Le sélecteur « Je suis » change d’utilisateur pour tester les vues de chacun.',
      'Les équipes chantier du planning ne sont pas les comptes bureau : ce sont les équipes terrain.',
    ],
  },
  {
    id: 'aujourdhui',
    titre: "Aujourd'hui",
    resume: 'Le tableau de bord du jour : vos tâches et les chantiers / interventions du jour.',
    points: [
      'Cochez une tâche pour la marquer faite.',
      'Créez une nouvelle tâche depuis le formulaire (échéance, niveau, affaire liée éventuelle).',
      'Les pastilles « chantiers du jour » renvoient vers la fiche affaire.',
      'Un badge dans le menu signale les tâches en retard.',
    ],
    lien: { href: '/aujourdhui', label: "Ouvrir Aujourd'hui" },
  },
  {
    id: 'portefeuille',
    titre: 'Portefeuille (affaires)',
    resume: 'Toutes les affaires : commande, programmé, en cours, soldé.',
    points: [
      'Ouvrez une fiche pour voir tâches, fil chantier, pièces jointes, planning et factures.',
      'Sur une tâche de la fiche : cocher = faite (pas besoin de supprimer).',
      'Vous pouvez modifier les infos de l’affaire et ajouter des créneaux planning.',
      'Import possible depuis les données Batappli / devis selon la config démo.',
    ],
    lien: { href: '/portefeuille', label: 'Ouvrir le portefeuille' },
  },
  {
    id: 'planning',
    titre: 'Planning',
    resume: 'Agenda type calendrier : Jour, Semaine, Mois, Année.',
    points: [
      'Changez de vue avec les onglets (Jour / Semaine / Mois / Année).',
      'Ajoutez une « Tâche à faire (post-it) » depuis le + du planning : liée à une affaire, elle apparaît sur la fiche chantier et dans Aujourd’hui (alertes) chez le responsable.',
      'Dans la fiche affaire (onglet Planning), modifiez date et équipe d’un créneau puis Enregistrer : l’agenda se met à jour.',
      'Recaler le planning recrée les créneaux sur la période (jours + équipe).',
      'Les équipes A/B/C sont le terrain, pas le bureau.',
    ],
    lien: { href: '/planning', label: 'Ouvrir le planning' },
  },
  {
    id: 'contrats',
    titre: "Contrats d'entretien",
    resume: 'Suivi des contrats d’entretien sur l’exercice (mois Juillet → Juin).',
    points: [
      'Visualisez les passages et l’avancement par contrat.',
      'Générez ou suivez l’exercice en cours selon les actions disponibles à l’écran.',
    ],
    lien: { href: '/contrats', label: 'Ouvrir les contrats' },
  },
  {
    id: 'facturation',
    titre: 'Facturation',
    resume: 'Acomptes, soldes et suivi des factures liées aux affaires.',
    points: [
      'Consultez l’état des factures (acompte, solde, relances).',
      'Les factures restent rattachées à la fiche affaire du portefeuille.',
    ],
    lien: { href: '/facturation', label: 'Ouvrir la facturation' },
  },
  {
    id: 'messagerie',
    titre: 'Messagerie',
    resume:
      'Fil « Équipe SETRIM » et conversations privées entre collègues. Les messages restent en historique.',
    points: [
      'Accès depuis le bouton Messagerie du bandeau (pas uniquement le menu latéral).',
      'Envoyez texte, photo ou pièce jointe.',
      'Survolez un message pour en faire une tâche (+ tâche).',
      'Les messages ne se suppriment pas : ils constituent l’historique d’équipe.',
      'Profil : choisissez un emoji visible dans la messagerie (pas de photo de profil).',
      'Les comptes bureau peuvent ajouter un collaborateur ; les 5 du bureau ne sont pas retirables.',
    ],
    lien: { href: '/messages', label: 'Ouvrir la messagerie' },
  },
  {
    id: 'remarques',
    titre: 'Remarques',
    resume: 'Carnet de remarques sur l’écran en cours (retours démo / points à noter).',
    points: [
      'Bouton Remarques dans le bandeau (ou menu mobile).',
      'Utile pour noter un bug, une idée ou un point métier pendant la démo.',
    ],
  },
  {
    id: 'aide-survol',
    titre: 'Aide au survol',
    resume:
      'Sur chaque écran, des pastilles bleues « ? » affichent une consigne quand vous pointez avec la souris (ou au focus clavier).',
    points: [
      'Survolez un « ? » pour lire l’aide locale (menu, tâches, messagerie, planning…).',
      'Le tutoriel (menu, touche 6) reste le guide complet.',
      'Sur téléphone, touchez le « ? » pour afficher la consigne.',
    ],
  },
  {
    id: 'raccourcis',
    titre: 'Raccourcis clavier (bureau)',
    resume: 'Sur ordinateur, les touches 1 à 6 ouvrent les écrans principaux.',
    points: [
      '1 — Aujourd’hui',
      '2 — Portefeuille',
      '3 — Planning',
      '4 — Contrats d’entretien',
      '5 — Facturation',
      '6 — Tutoriel (cette page)',
    ],
  },
];
