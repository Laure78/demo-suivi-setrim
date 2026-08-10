import { randomBytes } from 'crypto';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { isInterne } from '@/lib/acces-labels';
import { logExternalAudit } from '@/lib/externe-access';
import { invitationEmailBody, sendMail } from '@/lib/mail';

function appOrigin(req: Request) {
  const env = process.env.AUTH_URL || process.env.NEXTAUTH_URL;
  if (env) return env.replace(/\/$/, '');
  return new URL(req.url).origin;
}

/** Annuler ou renvoyer une invitation. */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || !isInterne(session.user.acces)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }
  const { id } = await ctx.params;
  const body = await req.json();
  const action = String(body.action ?? '');

  const invite = await prisma.externalInvite.findUnique({ where: { id } });
  if (!invite || invite.acceptedAt || invite.cancelledAt) {
    return NextResponse.json({ error: 'Invitation introuvable.' }, { status: 404 });
  }

  if (action === 'cancel') {
    await prisma.externalInvite.update({
      where: { id },
      data: { cancelledAt: new Date() },
    });
    await logExternalAudit({
      action: 'cancel',
      actorId: session.user.id,
      targetEmail: invite.email,
      threadKey: invite.threadKey,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === 'resend') {
    const token = randomBytes(24).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    const updated = await prisma.externalInvite.update({
      where: { id },
      data: { token, expiresAt },
    });
    const meta = await prisma.threadMeta.findUnique({
      where: { id: invite.threadKey },
    });
    const link = `${appOrigin(req)}/invitation/${token}`;
    const mail = await sendMail({
      to: invite.email,
      subject: `Invitation SETRIM — ${meta?.titre ?? 'discussion'}`,
      text: invitationEmailBody({
        nom: invite.nom,
        inviterNom: session.user.name ?? 'SETRIM',
        threadTitre: meta?.titre ?? invite.threadKey,
        message: invite.message,
        link,
        expiresLabel: '7 jours',
      }),
    });
    await logExternalAudit({
      action: 'resend',
      actorId: session.user.id,
      targetEmail: invite.email,
      threadKey: invite.threadKey,
    });
    return NextResponse.json({
      ok: true,
      link,
      mailSent: mail.sent,
      mailReason: mail.reason,
      expiresAt: updated.expiresAt.toISOString(),
    });
  }

  return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
}
