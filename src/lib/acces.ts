import { Acces } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { ACCES_LABEL, isAdministrateur } from '@/lib/acces-labels';

export { ACCES_LABEL, isAdministrateur };

/** Session + utilisateur actif admin en base (source de vérité). */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: 'Non autorisé' }, { status: 401 }) };
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, nom: true, acces: true, actif: true },
  });
  if (!user || !user.actif) {
    return { error: NextResponse.json({ error: 'Non autorisé' }, { status: 401 }) };
  }
  if (!isAdministrateur(user.acces)) {
    return {
      error: NextResponse.json(
        { error: 'Réservé aux administrateurs (Valérie, Denis).' },
        { status: 403 },
      ),
    };
  }
  return { session, user };
}

export async function countAdminsActifs(excludeId?: string) {
  return prisma.user.count({
    where: {
      acces: Acces.administrateur,
      actif: true,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
}

export async function logAdminAction(input: {
  auteurId: string;
  action: string;
  cibleId?: string | null;
  detail?: string;
}) {
  await prisma.adminAuditLog.create({
    data: {
      auteurId: input.auteurId,
      action: input.action,
      cibleId: input.cibleId ?? null,
      detail: input.detail ?? '',
    },
  });
}

/** Mot de passe provisoire à la création / reset (à changer à la 1re connexion). */
export function motDePasseProvisoire(): string {
  const n = Math.floor(100000 + Math.random() * 900000);
  return `Setrim${n}`;
}
