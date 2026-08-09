import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { BUREAU_ACCES } from '@/lib/bureau-acces';

/** Mot de passe des collaborateurs ajoutés (hors les 5 accès bureau). */
export const COLLAB_PASSWORD = 'setrim2026';

/** Les 5 du bureau SETRIM — ordre fixe pour Messagerie / sélecteur. */
export const BUREAU_USERS = BUREAU_ACCES.map((u) => ({
  id: u.id,
  initiales: u.initiales,
  nom: u.nom,
  email: u.email,
  role: Role[u.role],
  terrain: u.terrain,
  password: u.password,
}));

export const BUREAU_ORDER = BUREAU_USERS.map((u) => u.id);

export function isBureauUser(id: string): boolean {
  return (BUREAU_ORDER as readonly string[]).includes(id);
}

/** Garantit les 5 accès individuels (email + mot de passe personnel). */
export async function ensureBureauUsers() {
  for (const u of BUREAU_USERS) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { id: u.id },
      create: {
        id: u.id,
        initiales: u.initiales,
        nom: u.nom,
        email: u.email,
        role: u.role,
        terrain: u.terrain,
        passwordHash,
        actif: true,
      },
      update: {
        nom: u.nom,
        initiales: u.initiales,
        email: u.email,
        role: u.role,
        terrain: u.terrain,
        actif: true,
        passwordHash,
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
