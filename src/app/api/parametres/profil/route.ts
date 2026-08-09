import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { displayNom } from '@/lib/entreprise-settings';
import { ROLE_LABEL } from '@/lib/format';
import { ACCES_LABEL } from '@/lib/acces-labels';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      nom: true,
      prenom: true,
      nomFamille: true,
      telephone: true,
      email: true,
      initiales: true,
      role: true,
      acces: true,
      avatarUrl: true,
      terrain: true,
    },
  });
  if (!user) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

  return NextResponse.json({
    ...user,
    displayName: displayNom(user),
    roleLabel: ROLE_LABEL[user.role] ?? user.role,
    accesLabel: ACCES_LABEL[user.acces] ?? user.acces,
  });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const body = await req.json();
  const action = String(body.action ?? 'profil');

  if (action === 'revoke_sessions') {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { tokenVersion: { increment: 1 } },
    });
    return NextResponse.json({ ok: true, revoke: true });
  }

  if (action === 'password') {
    const current = String(body.currentPassword ?? '');
    const next = String(body.newPassword ?? '');
    if (next.length < 8) {
      return NextResponse.json(
        { error: 'Le nouveau mot de passe doit faire au moins 8 caractères.' },
        { status: 400 },
      );
    }
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
    const ok = await bcrypt.compare(current, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: 'Mot de passe actuel incorrect.' }, { status: 400 });
    }
    const passwordHash = await bcrypt.hash(next, 10);
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        passwordHash,
        mustChangePassword: false,
        tokenVersion: { increment: 1 },
      },
    });
    return NextResponse.json({ ok: true, passwordChanged: true });
  }

  const prenom = String(body.prenom ?? '').trim();
  const nomFamille = String(body.nomFamille ?? '').trim();
  const telephone = String(body.telephone ?? '').trim();
  const email = String(body.email ?? '')
    .trim()
    .toLowerCase();
  let initiales = String(body.initiales ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 2);

  if (!prenom && !nomFamille) {
    return NextResponse.json({ error: 'Indiquez au moins un prénom ou un nom.' }, { status: 400 });
  }
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Email invalide.' }, { status: 400 });
  }
  if (!initiales) {
    initiales = ((prenom[0] ?? '') + (nomFamille[0] ?? prenom[1] ?? 'X')).toUpperCase();
  }

  const clash = await prisma.user.findFirst({
    where: {
      AND: [
        { id: { not: session.user.id } },
        { OR: [{ email }, { initiales }] },
      ],
    },
  });
  if (clash) {
    return NextResponse.json(
      { error: 'Cet email ou ces initiales sont déjà utilisés.' },
      { status: 400 },
    );
  }

  const display = [prenom, nomFamille].filter(Boolean).join(' ');
  const avatarUrl =
    body.avatarUrl === null
      ? null
      : typeof body.avatarUrl === 'string'
        ? String(body.avatarUrl).trim() || null
        : undefined;

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      prenom,
      nomFamille,
      nom: display || prenom || nomFamille,
      telephone,
      email,
      initiales,
      ...(avatarUrl !== undefined ? { avatarUrl } : {}),
    },
    select: {
      id: true,
      nom: true,
      prenom: true,
      nomFamille: true,
      telephone: true,
      email: true,
      initiales: true,
      role: true,
      acces: true,
      avatarUrl: true,
    },
  });

  return NextResponse.json({
    ...updated,
    displayName: displayNom(updated),
    roleLabel: ROLE_LABEL[updated.role] ?? updated.role,
    accesLabel: ACCES_LABEL[updated.acces] ?? updated.acces,
  });
}
