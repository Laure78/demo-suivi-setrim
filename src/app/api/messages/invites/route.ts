import { randomBytes } from 'crypto';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { isInterne } from '@/lib/acces-labels';
import {
  computeAccessExpiresAt,
  historyFromForMode,
  logExternalAudit,
  type AccessDuration,
  type HistoryMode,
} from '@/lib/externe-access';
import { invitationEmailBody, sendMail } from '@/lib/mail';

function appOrigin(req: Request) {
  const env = process.env.AUTH_URL || process.env.NEXTAUTH_URL;
  if (env) return env.replace(/\/$/, '');
  return new URL(req.url).origin;
}

/** Créer une invitation externe sur un fil. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || !isInterne(session.user.acces)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const body = await req.json();
  const threadKey = String(body.threadKey ?? '').trim();
  const email = String(body.email ?? '')
    .trim()
    .toLowerCase();
  const nom = String(body.nom ?? '').trim();
  const societe = String(body.societe ?? '').trim();
  const fonction = String(body.fonction ?? '').trim();
  const message = String(body.message ?? '').trim();
  const historyMode = (String(body.historyMode ?? 'from_now') as HistoryMode) || 'from_now';
  const accessDuration =
    (String(body.accessDuration ?? 'months_6') as AccessDuration) || 'months_6';

  if (!threadKey || !email || !nom) {
    return NextResponse.json(
      { error: 'Email, nom et discussion sont obligatoires.' },
      { status: 400 },
    );
  }
  if (!['share_all', 'from_now'].includes(historyMode)) {
    return NextResponse.json({ error: 'Choix d’historique invalide.' }, { status: 400 });
  }
  if (!['days_30', 'months_6', 'chantier', 'unlimited'].includes(accessDuration)) {
    return NextResponse.json({ error: 'Durée d’accès invalide.' }, { status: 400 });
  }

  // Ne pas inviter un compte interne existant
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && isInterne(existing.acces)) {
    return NextResponse.json(
      { error: 'Cet email appartient déjà à un collaborateur SETRIM.' },
      { status: 400 },
    );
  }

  const token = randomBytes(24).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  const accessExpiresAt = computeAccessExpiresAt(accessDuration);

  // Annuler les invitations ouvertes pour le même email + fil
  await prisma.externalInvite.updateMany({
    where: {
      threadKey,
      email,
      acceptedAt: null,
      cancelledAt: null,
    },
    data: { cancelledAt: new Date() },
  });

  const invite = await prisma.externalInvite.create({
    data: {
      token,
      threadKey,
      email,
      nom,
      societe,
      fonction,
      message,
      historyMode,
      accessDuration,
      accessExpiresAt,
      invitedById: session.user.id,
      expiresAt,
    },
  });

  const meta = await prisma.threadMeta.findUnique({ where: { id: threadKey } });
  const link = `${appOrigin(req)}/invitation/${token}`;
  const mailBody = invitationEmailBody({
    nom,
    inviterNom: session.user.name ?? 'SETRIM',
    threadTitre: meta?.titre ?? threadKey,
    message,
    link,
    expiresLabel: '7 jours',
  });
  const mail = await sendMail({
    to: email,
    subject: `Invitation SETRIM — ${meta?.titre ?? 'discussion'}`,
    text: mailBody,
  });

  await logExternalAudit({
    action: 'invite',
    actorId: session.user.id,
    targetEmail: email,
    threadKey,
    detail: `history=${historyMode}; duration=${accessDuration}; mail=${mail.sent ? 'ok' : 'manuel'}`,
  });

  // Message système dans le fil
  await prisma.message.create({
    data: {
      threadKey,
      auteurId: session.user.id,
      systeme: true,
      texte: `Invitation envoyée à ${nom}${societe ? ` (${societe})` : ''} — ${email}`,
    },
  });

  return NextResponse.json({
    ok: true,
    invite: {
      id: invite.id,
      email: invite.email,
      nom: invite.nom,
      expiresAt: invite.expiresAt.toISOString(),
      link,
      mailSent: mail.sent,
      mailReason: mail.reason,
    },
    // historyFrom preview (appliqué à l’acceptation)
    historyFromPreview:
      historyFromForMode(historyMode)?.toISOString() ?? null,
  });
}
