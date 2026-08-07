import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';

const DEMO_PASSWORD = 'setrim2026';

/** Les 5 du bureau SETRIM — ordre fixe pour Messages / sélecteur. */
export const BUREAU_USERS = [
  {
    id: 'audrey',
    initiales: 'AU',
    nom: 'Audrey',
    email: 'audrey@setrim.fr',
    role: Role.assistante,
    terrain: false,
  },
  {
    id: 'melissa',
    initiales: 'ME',
    nom: 'Mélissa',
    email: 'melissa@setrim.fr',
    role: Role.assistante,
    terrain: false,
  },
  {
    id: 'valerie',
    initiales: 'VA',
    nom: 'Valérie',
    email: 'valerie@setrim.fr',
    role: Role.responsable,
    terrain: false,
  },
  {
    id: 'denis',
    initiales: 'DE',
    nom: 'Denis',
    email: 'denis@setrim.fr',
    role: Role.dirigeant,
    terrain: true,
  },
  {
    id: 'philippe',
    initiales: 'PH',
    nom: 'Philippe',
    email: 'philippe@setrim.fr',
    role: Role.conducteur,
    terrain: true,
  },
] as const;

export const BUREAU_ORDER = BUREAU_USERS.map((u) => u.id);

export function isBureauUser(id: string): boolean {
  return (BUREAU_ORDER as readonly string[]).includes(id);
}

/** Garantit Valérie et les 4 autres comptes démo (idempotent). */
export async function ensureBureauUsers() {
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  for (const u of BUREAU_USERS) {
    await prisma.user.upsert({
      where: { id: u.id },
      create: { ...u, passwordHash: hash, actif: true },
      update: {
        nom: u.nom,
        initiales: u.initiales,
        email: u.email,
        role: u.role,
        terrain: u.terrain,
        actif: true,
      },
    });
  }

  // Retirer le compte démo « Stagiaire » s’il existe encore
  const stagiaire = await prisma.user.findUnique({ where: { id: 'stagiaire' } });
  if (stagiaire?.actif) {
    await prisma.user.update({
      where: { id: 'stagiaire' },
      data: { actif: false },
    });
    await prisma.threadMeta.deleteMany({ where: { id: 'stagiaire' } });
    await prisma.pushSubscription.deleteMany({ where: { userId: 'stagiaire' } });
  }
}

/** Si le fil Équipe est vide, pose le message type de Valérie. */
export async function ensureValerieMessageEquipe() {
  const count = await prisma.message.count({
    where: { threadKey: 'gen', systeme: false },
  });
  if (count > 0) return;

  const valerie = await prisma.user.findUnique({ where: { id: 'valerie' } });
  if (!valerie) return;

  await prisma.message.create({
    data: {
      threadKey: 'gen',
      auteurId: 'valerie',
      texte:
        "Bonjour à tous. Rappel : les situations de travaux partent lundi, j'ai besoin des avancements avant vendredi 16h.",
    },
  });
}

export function sortUsersBureauFirst<T extends { id: string; nom: string }>(users: T[]): T[] {
  const rank = new Map<string, number>(BUREAU_ORDER.map((id, i) => [id, i]));
  return [...users].sort((a, b) => {
    const ra = rank.get(a.id) ?? 1000;
    const rb = rank.get(b.id) ?? 1000;
    if (ra !== rb) return ra - rb;
    return a.nom.localeCompare(b.nom, 'fr');
  });
}
