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
      'Les alertes en haut signalent retards et points à traiter. La cloche (en-tête) ouvre les urgences du jour.',
      'Après connexion, vous arrivez sur cet accueil — les urgences s’affichent à la 1ʳᵉ ouverture du jour s’il y en a.',
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
      'Rôles d’accès : Valérie et Denis = Administrateur ; Audrey, Mélissa, Philippe = Collaborateur ; Participants externes = messagerie invitée uniquement.',
      'Sur téléphone : le sélecteur « Je suis » et la déconnexion sont dans l’écran Plus (barre du bas).',
      'Les équipes chantier du planning ne sont pas les comptes bureau : ce sont les équipes terrain.',
    ],
  },
  {
    id: 'bandeau',
    titre: 'Bandeau et messagerie',
    resume:
      'Sur ordinateur : menu latéral (dont Messagerie), bascule « Je suis », cloche des urgences et bouton Messagerie (vert) en haut à droite. Sur téléphone : barre d’onglets en bas + cloche dans l’en-tête.',
    points: [
      'Ordinateur : Messagerie via le menu à gauche (touche 8) ou le bouton vert du bandeau.',
      'Cloche : ouvre à tout moment « Vos urgences du jour » (pastille = nombre d’urgences).',
      'S’il y a des messages non lus, un badge affiche le nombre.',
      'Quand vous êtes déjà sur la messagerie, le bouton (ordinateur) est mis en évidence.',
      'Téléphone : Messages est le premier onglet de la barre navy en bas ; le logo SETRIM reste en haut.',
    ],
    lien: { href: '/messages', label: 'Ouvrir la messagerie' },
  },
  {
    id: 'urgences',
    titre: 'Urgences du jour (3 niveaux)',
    resume:
      'À la première connexion de la journée, une fenêtre récapitule ce qui vous concerne. Sur téléphone, elle glisse depuis le bas. Les alertes urgentes peuvent aussi arriver sur l’appareil (navigateur / app installée).',
    points: [
      'Trois blocs : En retard (rouge, nb de jours) · Aujourd’hui (interventions, échéances, mentions) · À anticiper (7 jours).',
      'Chaque ligne : objet, chantier/contrat, responsable — gestes Fait, Reporter (demain / 3 jours / date), Ouvrir la fiche.',
      'Filtrage : vous voyez ce dont vous êtes responsable, ou les messages où vous êtes mentionné ; le planning du jour est partagé au bureau.',
      'Si rien à traiter : pas de fenêtre automatique (ou message positif court si vous rouvrez la cloche).',
      'Après fermeture : ne se rouvre pas le même jour. Ce qui est coché / reporté dans la fenêtre ne redéclenche pas de notification push le même jour.',
      'Niveau push : urgent = immédiat (même en plage de silence) ; normal = résumé le matin. Activation dans Paramètres → Notifications (pas au premier chargement).',
      'Bannière discrète pour installer l’app sur le bureau ; refermable 30 jours. Une fois installée, les clics ouvrent la bonne fiche.',
    ],
  },
  {
    id: 'nav-mobile',
    titre: 'Navigation téléphone',
    resume:
      'Sous 768 px, le menu latéral disparaît. Une barre d’onglets fixe en bas donne accès aux écrans principaux.',
    points: [
      'Cinq onglets : Messages, Planning, Affaires, Contrats, Plus.',
      'L’onglet actif est en bleu (#0079C2) ; la barre est navy comme le menu bureau.',
      'Plus regroupe Aujourd’hui, Clients, Facturation, Tutoriel, Accueil, Paramètres, « Je suis » et déconnexion.',
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
      'Dans la fiche client : lier un chantier (liste déroulante + Lier), retirer un lien, ou ouvrir l’affaire.',
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
      'Suivi des contrats d’entretien sur l’exercice (juillet → juin), synchronisé avec le planning.',
    points: [
      'Bandeau : contrats exercice, à programmer, programmés, réalisés + compteur rouge « en retard ».',
      'Liste regroupée par mois contractuel (juillet → juin), avec montant HT cumulé.',
      'Statut calculé côté serveur (une seule règle) : À programmer, Programmé, Réalisé, En retard, Hors mois contractuel — pastille unique partout.',
      'Recherche + filtres statut / mois / syndic. Actions rapides : Programmer / Fiche.',
      'Programmer depuis la fiche → créneau bleu « Contrat d’entretien » au planning (sync dans les deux sens).',
      'Supprimer le créneau → contrat « À programmer ». Bouton « Réalisée » → Réalisé.',
      'Pas de statut saisi à la main : le calcul vient de la date posée, de la réalisation et du mois contractuel.',
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
      'Interface type WhatsApp : rail, liste, conversation. Équipe SETRIM et messages directs.',
    points: [
      'Accès : menu latéral « Messagerie » (touche 8), bouton vert du bandeau, onglet Messages (téléphone).',
      'Filtres : Tous / Directs / Non lus.',
      'Liste : Équipe SETRIM et discussions privées — les plus récentes remontent en haut ; les épinglées restent au-dessus.',
      'Nouveau message : bouton + en haut de la liste (ou sur l’écran vide) — choisissez un destinataire et envoyez.',
      'Conversation : clic droit / appui long → options WhatsApp. Bouton « Inviter un externe » pour syndics, MOE, fournisseurs.',
      'Fil avec externes : bandeau jaune permanent, pastille société, notes internes (invisible aux externes), rappel avant le 1er envoi.',
      'Chaque message affiche qui parle (prénom coloré ou « Vous ») ; avatar à gauche pour les autres ; les réponses citent le message d’origine.',
      'Les discussions de chantier (fil affaire) restent sur la fiche chantier ; elles apparaissent aussi ici dès qu’un externe y est invité.',
      'Sur téléphone : liste plein écran, puis conversation avec flèche retour.',
      'Épinglage discussion, sourdine, archives, importants / réactions / messages masqués : mémorisés sur cet appareil.',
    ],
    lien: { href: '/messages', label: 'Ouvrir la messagerie' },
  },
  {
    id: 'externes',
    titre: 'Participants externes',
    resume:
      'Troisième rôle d’accès : messagerie uniquement, sur les fils où la personne a été invitée. Pas de chantiers, planning ni montants.',
    points: [
      'Invitation depuis l’en-tête d’un fil : e-mail, nom, société, fonction, historique (défaut : à partir de maintenant), durée d’accès.',
      'Lien à usage unique (7 jours) : l’externe définit son mot de passe et arrive directement sur le fil.',
      'Un même externe invité sur plusieurs fils garde un seul compte.',
      'Échanges internes sur le même fil : case « Note interne » — invisible aux externes (plus simple qu’un second fil).',
      'Admin : Paramètres → Participants externes — retirer d’un fil ou révoquer tout (sessions coupées). Journal des invitations.',
      'Pièces jointes des fils ouverts aux externes : liens contrôlés (/api/files/…), pas d’URL publique.',
    ],
    lien: { href: '/parametres?tab=externes', label: 'Participants externes' },
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
      '9 — Paramètres',
    ],
  },
  {
    id: 'parametres',
    titre: 'Paramètres',
    resume:
      'Profil, notifications et support pour tous. Utilisateurs, entreprise et abonnement pour Valérie et Denis.',
    points: [
      'Accès : menu « Paramètres » (touche 9) ou Plus sur téléphone.',
      'Mon profil : prénom, nom, email, mobile, initiales, mot de passe, déconnexion de toutes les sessions. Rôle en lecture seule.',
      'Notifications : activer les alertes sur cet appareil (geste explicite), état permission / app installée, types d’alertes, urgence minimum, plage de silence (sauf urgent).',
      'Support : coordonnées, formulaire « Signaler un problème » (n° de suivi), historique, 5 gestes de base.',
      'Administrateurs : Utilisateurs, Participants externes (révocation, journal), Entreprise et facturation, Abonnement.',
      'Changer de formule / ajouter des users / résilier = demande au support (pas de paiement en ligne).',
      'Bandeau d’alerte admin si échéance à moins de 30 jours ou facture en attente.',
    ],
    lien: { href: '/parametres', label: 'Ouvrir les paramètres' },
  },
];
