export const SUPPORT_STATUT_LABEL: Record<string, string> = {
  envoyee: 'Envoyée',
  en_cours: 'En cours',
  resolue: 'Résolue',
};

export const SUPPORT_URGENCE_LABEL: Record<string, string> = {
  basse: 'Basse',
  normale: 'Normale',
  haute: 'Haute',
};

export const FACTURE_ABO_STATUT_LABEL: Record<string, string> = {
  payee: 'Payée',
  en_attente: 'En attente',
};

export const PERIODICITE_LABEL: Record<string, string> = {
  mensuelle: 'Mensuelle',
  annuelle: 'Annuelle',
};

export const MODE_REGLEMENT_LABEL: Record<string, string> = {
  prelevement: 'Prélèvement',
  virement: 'Virement',
  cheque: 'Chèque',
};

export const PARAM_TABS = [
  { id: 'profil', label: 'Mon profil', admin: false },
  { id: 'notifications', label: 'Notifications', admin: false },
  { id: 'support', label: 'Support', admin: false },
  { id: 'utilisateurs', label: 'Utilisateurs', admin: true },
  { id: 'entreprise', label: 'Entreprise et facturation', admin: true },
  { id: 'abonnement', label: 'Abonnement', admin: true },
] as const;

export type ParamTabId = (typeof PARAM_TABS)[number]['id'];

export const GESTES_BASE = [
  {
    titre: 'Choisir qui je suis',
    texte: 'Pastilles en haut à droite (bureau) ou menu Plus (téléphone) pour basculer de compte.',
  },
  {
    titre: 'Messagerie',
    texte: 'Menu Messagerie (touche 8) : Équipe SETRIM et messages directs. Fils chantier sur la fiche affaire.',
  },
  {
    titre: 'Aujourd’hui',
    texte: 'Vos tâches du jour et les chantiers planifiés — cochez « C’est fait » sur le post-it.',
  },
  {
    titre: 'Planning',
    texte: 'Agenda des équipes : vert = chantier, bleu = contrat d’entretien.',
  },
  {
    titre: 'Tutoriel',
    texte: 'Menu Tutoriel (touche 6) : guide complet de la plateforme.',
  },
] as const;
