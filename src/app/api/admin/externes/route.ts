import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { isAdministrateur } from '@/lib/acces-labels';
import { logExternalAudit } from '@/lib/externe-access';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !isAdministrateur(session.user.acces)) {
    return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 });
  }

  const externes = await prisma.user.findMany({
    where: { acces: 'externe' },
    orderBy: { createdAt: 'desc' },
    include: {
      threadMemberships: {
        where: { revokedAt: null },
        include: {
          invitedBy: { select: { nom: true } },
        },
      },
    },
  });

  const metas = await prisma.threadMeta.findMany({
    where: {
      id: {
        in: [
          ...new Set(externes.flatMap((u) => u.threadMemberships.map((m) => m.threadKey))),
        ],
      },
    },
  });
  const titreByThread = new Map(metas.map((m) => [m.id, m.titre]));

  const audits = await prisma.externalAuditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 40,
    include: { actor: { select: { nom: true } } },
  });

  return NextResponse.json({
    users: externes.map((u) => ({
      id: u.id,
      nom: u.nom,
      email: u.email,
      societe: u.societe,
      fonction: u.fonction,
      telephone: u.telephone,
      actif: u.actif,
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
      fils: u.threadMemberships.map((m) => ({
        threadKey: m.threadKey,
        titre: titreByThread.get(m.threadKey) ?? m.threadKey,
        invitedAt: m.invitedAt.toISOString(),
        invitedBy: m.invitedBy?.nom ?? '—',
        accessExpiresAt: m.accessExpiresAt?.toISOString() ?? null,
        historyFrom: m.historyFrom?.toISOString() ?? null,
      })),
    })),
    audits: audits.map((a) => ({
      id: a.id,
      action: a.action,
      actor: a.actor?.nom ?? '—',
      targetEmail: a.targetEmail,
      threadKey: a.threadKey,
      detail: a.detail,
      createdAt: a.createdAt.toISOString(),
    })),
  });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id || !isAdministrateur(session.user.acces)) {
    return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 });
  }

  const body = await req.json();
  const action = String(body.action ?? '');
  const userId = String(body.userId ?? '');
  const threadKey = body.threadKey ? String(body.threadKey) : null;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.acces !== 'externe') {
    return NextResponse.json({ error: 'Participant introuvable' }, { status: 404 });
  }

  if (action === 'revoke_thread' && threadKey) {
    await prisma.threadMember.updateMany({
      where: { userId, threadKey, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });
    await logExternalAudit({
      action: 'revoke_thread',
      actorId: session.user.id,
      targetUserId: userId,
      targetEmail: user.email,
      threadKey,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === 'revoke_all') {
    await prisma.threadMember.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await prisma.user.update({
      where: { id: userId },
      data: { actif: false, tokenVersion: { increment: 1 } },
    });
    await logExternalAudit({
      action: 'revoke_all',
      actorId: session.user.id,
      targetUserId: userId,
      targetEmail: user.email,
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
}
