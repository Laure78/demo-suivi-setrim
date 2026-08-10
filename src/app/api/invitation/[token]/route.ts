import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import {
  historyFromForMode,
  initialesFromNom,
  logExternalAudit,
  uniqueExterneId,
  uniqueInitiales,
  type HistoryMode,
} from '@/lib/externe-access';
import { Acces, Role } from '@prisma/client';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const invite = await prisma.externalInvite.findUnique({ where: { token } });
  if (!invite || invite.cancelledAt) {
    return NextResponse.json({ error: 'Invitation invalide ou annulée.' }, { status: 404 });
  }
  if (invite.acceptedAt) {
    return NextResponse.json({ error: 'Invitation déjà utilisée.', used: true }, { status: 410 });
  }
  if (invite.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: 'Ce lien a expiré (valable 7 jours).' }, { status: 410 });
  }
  const meta = await prisma.threadMeta.findUnique({ where: { id: invite.threadKey } });
  return NextResponse.json({
    nom: invite.nom,
    email: invite.email,
    societe: invite.societe,
    fonction: invite.fonction,
    message: invite.message,
    threadTitre: meta?.titre ?? 'Discussion',
    historyMode: invite.historyMode,
    expiresAt: invite.expiresAt.toISOString(),
  });
}

/** Accepter l’invitation : créer / rattacher le compte et définir le mot de passe. */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const body = await req.json();
  const password = String(body.password ?? '');
  const telephone = String(body.telephone ?? '').trim();

  if (password.length < 8) {
    return NextResponse.json(
      { error: 'Mot de passe : 8 caractères minimum.' },
      { status: 400 },
    );
  }

  const invite = await prisma.externalInvite.findUnique({ where: { token } });
  if (!invite || invite.cancelledAt) {
    return NextResponse.json({ error: 'Invitation invalide ou annulée.' }, { status: 404 });
  }
  if (invite.acceptedAt) {
    return NextResponse.json({ error: 'Invitation déjà utilisée.' }, { status: 410 });
  }
  if (invite.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: 'Ce lien a expiré.' }, { status: 410 });
  }

  const hash = await bcrypt.hash(password, 10);
  const historyFrom = historyFromForMode(invite.historyMode as HistoryMode);

  let user = await prisma.user.findUnique({ where: { email: invite.email } });

  if (user) {
    if (user.acces !== Acces.externe) {
      return NextResponse.json(
        { error: 'Cet email est déjà utilisé par un compte interne.' },
        { status: 400 },
      );
    }
    await prisma.user.update({
      where: { id: user.id },
      data: {
        nom: invite.nom,
        prenom: invite.nom.split(/\s+/)[0] ?? invite.nom,
        societe: invite.societe || user.societe,
        fonction: invite.fonction || user.fonction,
        telephone: telephone || user.telephone,
        passwordHash: hash,
        mustChangePassword: false,
        actif: true,
        tokenVersion: { increment: 1 },
      },
    });
  } else {
    const id = await uniqueExterneId(invite.email);
    const initiales = await uniqueInitiales(initialesFromNom(invite.nom));
    user = await prisma.user.create({
      data: {
        id,
        email: invite.email,
        nom: invite.nom,
        prenom: invite.nom.split(/\s+/)[0] ?? invite.nom,
        nomFamille: invite.nom.split(/\s+/).slice(1).join(' '),
        initiales,
        societe: invite.societe,
        fonction: invite.fonction,
        telephone,
        passwordHash: hash,
        role: Role.externe,
        acces: Acces.externe,
        terrain: false,
        mustChangePassword: false,
        actif: true,
      },
    });
  }

  await prisma.threadMember.upsert({
    where: {
      threadKey_userId: { threadKey: invite.threadKey, userId: user.id },
    },
    create: {
      threadKey: invite.threadKey,
      userId: user.id,
      invitedById: invite.invitedById,
      historyFrom,
      accessExpiresAt: invite.accessExpiresAt,
    },
    update: {
      revokedAt: null,
      historyFrom,
      accessExpiresAt: invite.accessExpiresAt,
      invitedById: invite.invitedById,
      invitedAt: new Date(),
    },
  });

  await prisma.externalInvite.update({
    where: { id: invite.id },
    data: { acceptedAt: new Date() },
  });

  await prisma.message.create({
    data: {
      threadKey: invite.threadKey,
      auteurId: user.id,
      systeme: true,
      texte: `${invite.nom}${invite.societe ? ` (${invite.societe})` : ''} a rejoint la discussion`,
    },
  });

  await logExternalAudit({
    action: 'accept',
    actorId: user.id,
    targetUserId: user.id,
    targetEmail: invite.email,
    threadKey: invite.threadKey,
  });

  return NextResponse.json({
    ok: true,
    email: user.email,
    threadKey: invite.threadKey,
  });
}
