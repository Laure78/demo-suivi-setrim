/**
 * Les 5 accès individuels bureau SETRIM (connexion démo).
 * Fichier sans dépendances serveur — utilisable côté client (login / bascule).
 */

export type BureauAcces = {
  id: string;
  initiales: string;
  nom: string;
  email: string;
  role: 'assistante' | 'responsable' | 'dirigeant' | 'conducteur';
  terrain: boolean;
  /** Mot de passe individuel (démo). */
  password: string;
};

export const BUREAU_ACCES: readonly BureauAcces[] = [
  {
    id: 'audrey',
    initiales: 'AU',
    nom: 'Audrey',
    email: 'audrey@setrim.fr',
    role: 'assistante',
    terrain: false,
    password: 'Audrey2026',
  },
  {
    id: 'melissa',
    initiales: 'ME',
    nom: 'Mélissa',
    email: 'melissa@setrim.fr',
    role: 'assistante',
    terrain: false,
    password: 'Melissa2026',
  },
  {
    id: 'valerie',
    initiales: 'VA',
    nom: 'Valérie',
    email: 'valerie@setrim.fr',
    role: 'responsable',
    terrain: false,
    password: 'Valerie2026',
  },
  {
    id: 'denis',
    initiales: 'DE',
    nom: 'Denis',
    email: 'denis@setrim.fr',
    role: 'dirigeant',
    terrain: true,
    password: 'Denis2026',
  },
  {
    id: 'philippe',
    initiales: 'PH',
    nom: 'Philippe',
    email: 'philippe@setrim.fr',
    role: 'conducteur',
    terrain: true,
    password: 'Philippe2026',
  },
] as const;

export function bureauPasswordFor(idOrEmail: string): string | null {
  const key = idOrEmail.trim().toLowerCase();
  const u = BUREAU_ACCES.find(
    (x) => x.id === key || x.email.toLowerCase() === key,
  );
  return u?.password ?? null;
}
