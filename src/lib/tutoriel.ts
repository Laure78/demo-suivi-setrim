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
    'Cette plateforme sert au suivi des affaires d’étanchéité au quotidien : tâches du bureau, chantiers, fiches clients, planning des équipes, messagerie interne, contrats d’entretien et facturation. Ce tutoriel décrit l’outil tel qu’il est aujourd’hui.',
};

export const TUTORIEL_SECTIONS: TutorielSection[] = [
  {
    id: 'accueil',
    titre: 'Accueil (tableau de bord)',
    resume:
      'Cliquez le logo SETRIM (menu latéral sur ordinateur, en-tête sur téléphone) pour ouvrir l’accueil : indicateurs et accès rapide à tous les écrans.',
    points: [
      'Cartes cliquables : tâches, chantiers du jour, affaires, clients, planning, facturation, contrats, messagerie.',
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
      '5 accès individuels : Audrey, Mélissa, Valérie, Denis, Philippe — chacun son email et son mot de passe.',
      'Sur l’écran de connexion, cliquez une personne ou saisissez ses identifiants.',
      'Le sélecteur « Je suis » (pastilles AU · ME · VA…) bascule entre les 5 comptes bureau ; la pastille « Connecté » rappelle qui est en session.',
      'Sur téléphone : le sélecteur « Je suis » et la déconnexion sont dans l’écran Plus (barre du bas).',
      'Les équipes chantier du planning ne sont pas les comptes bureau : ce sont les équipes terrain.',
    ],
  },
  {
    id: 'bandeau',
    titre: 'Bandeau et messagerie',
    resume:
      'Sur ordinateur : menu latéral (dont Messagerie), bascule « Je suis » et bouton Messagerie (vert) en haut à droite. Sur téléphone : barre d’onglets en bas.',
    points: [
      'Ordinateur : Messagerie via le menu à gauche (touche 8) ou le bouton vert du bandeau.',
      'S’il y a des messages non lus, un badge affiche le nombre.',
      'Quand vous êtes déjà sur la messagerie, le bouton (ordinateur) passe en bleu.',
      'Téléphone : Messages est le premier onglet de la barre navy en bas ; le logo SETRIM reste en haut.',
    ],
    lien: { href: '/messages', label: 'Ouvrir la messagerie' },
  },
  {
    id: 'nav-mobile',
    titre: 'Navigation téléphone',
    resume:
      'Sous 768 px, le menu latéral disparaît. Une barre d’onglets fixe en bas donne accès aux écrans principaux.',
    points: [
      'Cinq onglets : Messages, Planning, Affaires, Contrats, Plus.',
      'L’onglet actif est en bleu (#0079C2) ; la barre est navy comme le menu bureau.',
      'Plus regroupe Aujourd’hui, Clients, Facturation, Tutoriel, Accueil, « Je suis » et déconnexion.',
      'En détail (ex. fiche via lien ?affaire=… ou conversation ?thread=…), une flèche retour apparaît à gauche de l’en-tête.',
    ],
    lien: { href: '/plus', label: 'Ouvrir Plus' },
  },
  {
    id: 'aujourdhui',
    titre: "Aujourd'hui",
    resume: 'Le tableau de bord du jour : vos tâches et les chantiers / interventions du jour.',
    points: [
      'Cochez « C’est fait » sur le post-it : la tâche est terminée, vous restez sur Aujourd’hui.',
      'Si la tâche est liée à un chantier : « Voir l’affaire » ouvre la fiche ici (panneau), sans passer par le portefeuille.',
      'Créez une nouvelle tâche depuis le formulaire (échéance, niveau, affaire liée éventuelle).',
      'Les cartes « chantiers du jour » (plus bas) ouvrent l’affaire dans le portefeuille — ce ne sont pas les post-it tâches.',
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
      'Le Fil chantier : messages partagés avec l’équipe — uniquement sur la fiche affaire.',
      'Sur une tâche de la fiche : cocher = faite (pas besoin de supprimer).',
      'Bouton Modifier : infos de l’affaire, rattachement à une fiche client (ou création d’une nouvelle fiche).',
      'Onglet Planning de la fiche : dates, équipe, recalage — l’agenda général se met à jour.',
      'Import possible depuis les données Batappli / devis selon la config démo.',
    ],
    lien: { href: '/portefeuille', label: 'Ouvrir le portefeuille' },
  },
  {
    id: 'clients',
    titre: 'Clients',
    resume: 'Fiches clients (syndics, agences, particuliers) liées aux chantiers.',
    points: [
      'Menu « Clients » (touche 7) : liste searchable + bouton « Nouvelle fiche client ».',
      'Sur une fiche : nom, contact, téléphone, e-mail, adresse siège, notes.',
      'Les noms déjà présents sur les affaires du portefeuille génèrent une fiche automatiquement au premier passage.',
      'Depuis une fiche affaire (Modifier), choisissez une fiche existante ou créez-en une nouvelle.',
      'Dans la fiche client, la liste « Chantiers liés » ouvre directement l’affaire.',
    ],
    lien: { href: '/clients', label: 'Ouvrir les clients' },
  },
  {
    id: 'planning',
    titre: 'Planning',
    resume: 'Agenda type calendrier : Jour, Semaine, Mois, Année — avec code couleurs chantier / CE.',
    points: [
      'Changez de vue avec les onglets (Jour / Semaine / Mois / Année).',
      'Légende à gauche : vert = chantier (travaux, plusieurs jours possibles) ; bleu = contrat d’entretien (½ journée à 1 journée).',
      'Sur un créneau CE : immeuble/syndic, « Contrat d’entretien », durée et nombre de compagnons.',
      'Pour déplacer un chantier ou un CE lié à une affaire : cliquez le créneau → date (+ durée pour CE) → « Enregistrer » (sync avec la fiche contrat / affaire).',
      'Supprimer un créneau CE : le contrat repasse « À programmer » (signal affiché).',
      'Ajoutez une « Tâche à faire (post-it) » depuis le + du planning : liée à une affaire, elle apparaît sur la fiche chantier et dans Aujourd’hui (alertes) chez le responsable.',
      'Dans la fiche affaire (onglet Planning), modifiez date / équipe d’un créneau ou utilisez « Recaler le planning ».',
      'Les équipes A/B/C (et les 2 prestataires) sont le terrain, pas le bureau.',
    ],
    lien: { href: '/planning', label: 'Ouvrir le planning' },
  },
  {
    id: 'contrats',
    titre: "Contrats d'entretien",
    resume:
      'Suivi des contrats d’entretien sur l’exercice (Juillet → Juin), synchronisé avec le planning.',
    points: [
      'Mois contractuel = obligation de passage. Tri par mois ; colonnes Date programmée et Statut.',
      'Filtre : À programmer / Programmé / Réalisé / Hors mois contractuel. Alerte rouge si mois en cours ou passé sans date.',
      'Fiche (onglet Planning) : date + durée ½ j ou 1 j + compagnons + équipe → créneau bleu au planning.',
      'Lien « Voir dans le planning ». Déplacer le créneau met à jour le contrat ; le supprimer → « À programmer » (contrat conservé).',
      'Hors mois contractuel : warning, pas de blocage. Bouton « Réalisée » → réalisé pour l’exercice.',
      'Alerte J-30 pour caler la date, J-15 pour préparer l’entretien. RDV ½–1 j (bleu #0A6EA8).',
    ],
    lien: { href: '/contrats', label: 'Ouvrir les contrats' },
  },
  {
    id: 'facturation',
    titre: 'Facturation',
    resume: 'Acomptes, soldes et suivi des factures liées aux affaires.',
    points: [
      'Consultez l’état des factures (acompte, solde, relances).',
      'Sur la fiche affaire, cochez le traitement : non émise → émise → encaissée.',
      'Les factures restent rattachées à la fiche affaire du portefeuille.',
    ],
    lien: { href: '/facturation', label: 'Ouvrir la facturation' },
  },
  {
    id: 'messagerie',
    titre: 'Messagerie (style WhatsApp)',
    resume:
      'Interface type WhatsApp Desktop : rail, liste, conversation. Équipe, directs et fils chantier.',
    points: [
      'Accès : menu latéral « Messagerie » (touche 8), bouton vert du bandeau, onglet Messages (téléphone).',
      'Rail : Messages / Chantiers / Archivées / Épinglées. Filtres : Tous / Chantiers / Directs / Non lus.',
      'Conversation : bulles, séparateurs de date, pièces jointes, @mentions, « Créer une action ».',
      'Fil chantier : lien « Fiche chantier » vers le portefeuille.',
      'Sur téléphone : liste plein écran, puis conversation avec flèche retour.',
      'Épinglage, sourdine et archives sont mémorisés sur cet appareil.',
    ],
    lien: { href: '/messages', label: 'Ouvrir la messagerie' },
  },
  {
    id: 'aide-survol',
    titre: 'Aide au survol',
    resume:
      'Sur chaque écran, des pastilles bleues « ? » affichent une consigne quand vous pointez avec la souris (ou au focus clavier).',
    points: [
      'Survolez un « ? » pour lire l’aide locale (menu, tâches, messagerie, planning, clients…).',
      'Le tutoriel (menu, touche 6) reste le guide complet.',
      'Sur téléphone, touchez le « ? » pour afficher la consigne.',
    ],
  },
  {
    id: 'raccourcis',
    titre: 'Raccourcis clavier (bureau)',
    resume: 'Sur ordinateur, les touches numériques ouvrent les écrans principaux.',
    points: [
      '1 — Aujourd’hui',
      '8 — Messagerie',
      '2 — Portefeuille',
      '3 — Planning',
      '4 — Contrats d’entretien',
      '5 — Facturation',
      '6 — Tutoriel (cette page)',
      '7 — Clients',
    ],
  },
];
