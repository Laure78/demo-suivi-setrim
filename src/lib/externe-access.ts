import type { Acces, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export function isExterne(acces: string | null | undefined): boolean {
  return acces === 'externe';
}

export function isInterne(acces: string | null | undefined): boolean {
  return acces === 'administrateur' || acces === 'collaborateur';
}

export type AccessDuration = 'days_30' | 'months_6' | 'chantier' | 'unlimited';
export type HistoryMode = 'share_all' | 'from_now';

export function computeAccessExpiresAt(
  duration: AccessDuration,
  from = new Date(),
): Date | null {
  if (duration === 'unlimited' || duration === 'chantier') return null;
  const d = new Date(from);
  if (duration === 'days_30') {
    d.setDate(d.getDate() + 30);
    return d;
  }
  if (duration === 'months_6') {
    d.setMonth(d.getMonth() + 6);
    return d;
  }
  return null;
}

export function historyFromForMode(mode: HistoryMode, at = new Date()): Date | null {
  return mode === 'share_all' ? null : at;
}

/** Membership actif (non révoqué, non expiré). */
export async function getActiveMembership(userId: string, threadKey: string) {
  const m = await prisma.threadMember.findUnique({
    where: { threadKey_userId: { threadKey, userId } },
  });
  if (!m || m.revokedAt) return null;
  if (m.accessExpiresAt && m.accessExpiresAt.getTime() < Date.now()) return null;
  return m;
}

export async function threadHasExternes(threadKey: string): Promise<boolean> {
  const n = await prisma.threadMember.count({
    where: {
      threadKey,
      revokedAt: null,
      OR: [{ accessExpiresAt: null }, { accessExpiresAt: { gt: new Date() } }],
      user: { acces: 'externe', actif: true },
    },
  });
  return n > 0;
}

export async function listActiveExterneMembers(threadKey: string) {
  return prisma.threadMember.findMany({
    where: {
      threadKey,
      revokedAt: null,
      OR: [{ accessExpiresAt: null }, { accessExpiresAt: { gt: new Date() } }],
      user: { acces: 'externe', actif: true },
    },
    include: {
      user: {
        select: {
          id: true,
          nom: true,
          societe: true,
          fonction: true,
          email: true,
          initiales: true,
        },
      },
    },
    orderBy: { invitedAt: 'asc' },
  });
}

/**
 * Droits de lecture / écriture sur un fil.
 * Internes : accès libre (comportement actuel).
 * Externes : uniquement via membership actif.
 */
export async function assertThreadAccess(opts: {
  userId: string;
  acces: Acces | string;
  threadKey: string;
}): Promise<
  | { ok: true; historyFrom: Date | null; isExterne: boolean }
  | { ok: false; status: number; error: string }
> {
  if (isInterne(opts.acces)) {
    return { ok: true, historyFrom: null, isExterne: false };
  }
  if (!isExterne(opts.acces)) {
    return { ok: false, status: 403, error: 'Accès refusé' };
  }
  const m = await getActiveMembership(opts.userId, opts.threadKey);
  if (!m) {
    return {
      ok: false,
      status: 403,
      error: 'Vous n’êtes pas invité sur cette discussion.',
    };
  }
  return { ok: true, historyFrom: m.historyFrom, isExterne: true };
}

/** Filtre Prisma pour les messages visibles selon le rôle. */
export function messagesVisibilityWhere(
  access: { historyFrom: Date | null; isExterne: boolean },
): Prisma.MessageWhereInput {
  const where: Prisma.MessageWhereInput = {};
  if (access.isExterne) {
    where.interne = false;
    if (access.historyFrom) {
      where.createdAt = { gte: access.historyFrom };
    }
  }
  return where;
}

export async function logExternalAudit(input: {
  action: string;
  actorId?: string | null;
  targetUserId?: string | null;
  targetEmail?: string | null;
  threadKey?: string | null;
  detail?: string;
}) {
  await prisma.externalAuditLog.create({
    data: {
      action: input.action,
      actorId: input.actorId ?? null,
      targetUserId: input.targetUserId ?? null,
      targetEmail: input.targetEmail ?? null,
      threadKey: input.threadKey ?? null,
      detail: input.detail ?? '',
    },
  });
}

/** Destinataires push d’un fil : internes actifs + externes membres du fil uniquement. */
export async function notifyIdsForThread(
  threadKey: string,
  excludeUserId: string,
): Promise<string[]> {
  const internes = await prisma.user.findMany({
    where: {
      actif: true,
      id: { not: excludeUserId },
      acces: { in: ['administrateur', 'collaborateur'] },
    },
    select: { id: true },
  });

  const externes = await prisma.threadMember.findMany({
    where: {
      threadKey,
      revokedAt: null,
      userId: { not: excludeUserId },
      OR: [{ accessExpiresAt: null }, { accessExpiresAt: { gt: new Date() } }],
      user: { acces: 'externe', actif: true },
    },
    select: { userId: true },
  });

  return [...internes.map((u) => u.id), ...externes.map((m) => m.userId)];
}

export function initialesFromNom(nom: string): string {
  const parts = nom.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase().slice(0, 2);
  }
  return (nom.slice(0, 2) || 'EX').toUpperCase();
}

export async function uniqueExterneId(email: string): Promise<string> {
  const base = `ext-${email
    .split('@')[0]
    ?.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24) || 'user'}`;
  let id = base;
  let n = 0;
  while (await prisma.user.findUnique({ where: { id } })) {
    n += 1;
    id = `${base}-${n}`;
  }
  return id;
}

export async function uniqueInitiales(seed: string): Promise<string> {
  let base = seed.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 2) || 'EX';
  if (base.length < 2) base = (base + 'X').slice(0, 2);
  let candidate = base;
  let n = 0;
  while (await prisma.user.findUnique({ where: { initiales: candidate } })) {
    n += 1;
    candidate = `${base[0]}${n}`.slice(0, 3);
  }
  return candidate;
}
