import { Acces, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ROLE_LABEL } from '@/lib/format';
import {
  ACCES_LABEL,
  countAdminsActifs,
  logAdminAction,
  motDePasseProvisoire,
  requireAdmin,
} from '@/lib/acces';
import { ensureEntrepriseSettings } from '@/lib/entreprise-settings';

export async function GET() {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  await ensureEntrepriseSettings();

  const [users, journal, abo, actifs] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ acces: 'asc' }, { nom: 'asc' }],
      select: {
        id: true,
        nom: true,
        email: true,
        initiales: true,
        role: true,
        acces: true,
        actif: true,
        lastLoginAt: true,
        mustChangePassword: true,
        createdAt: true,
      },
    }),
    prisma.adminAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 40,
      include: { auteur: { select: { nom: true } } },
    }),
    prisma.abonnement.findUnique({ where: { entrepriseId: 'setrim' } }),
    prisma.user.count({ where: { actif: true } }),
  ]);

  const usersInclus = abo?.usersInclus ?? 5;

  return NextResponse.json({
    users: users.map((u) => ({
      ...u,
      roleLabel: ROLE_LABEL[u.role] ?? u.role,
      accesLabel: ACCES_LABEL[u.acces] ?? u.acces,
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
    })),
    journal: journal.map((j) => ({
      id: j.id,
      action: j.action,
      detail: j.detail,
      cibleId: j.cibleId,
      auteur: j.auteur.nom,
      createdAt: j.createdAt.toISOString(),
    })),
    quota: {
      actifs,
      inclus: usersInclus,
      formule: abo?.formule ?? 'Bureau 5',
      procheLimite: actifs >= usersInclus,
      depasse: actifs > usersInclus,
    },
  });
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const body = await req.json();
  const nom = String(body.nom ?? '').trim();
  const email = String(body.email ?? '').trim().toLowerCase();
  const acces =
    body.acces === 'administrateur' ? Acces.administrateur : Acces.collaborateur;
  const role = (Object.values(Role) as string[]).includes(String(body.role))
    ? (body.role as Role)
    : Role.assistante;
  const terrain = Boolean(body.terrain);

  if (!nom) return NextResponse.json({ error: 'Le nom est obligatoire.' }, { status: 400 });
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Email invalide.' }, { status: 400 });
  }

  await ensureEntrepriseSettings();
  const [abo, actifs] = await Promise.all([
    prisma.abonnement.findUnique({ where: { entrepriseId: 'setrim' } }),
    prisma.user.count({ where: { actif: true } }),
  ]);
  const inclus = abo?.usersInclus ?? 5;
  if (actifs >= inclus) {
    return NextResponse.json(
      {
        error: `Formule « ${abo?.formule ?? 'Bureau 5'} » : ${actifs}/${inclus} comptes actifs. Ajoutez des utilisateurs via Paramètres → Abonnement (demande au support) avant d’en créer un de plus.`,
        quota: { actifs, inclus },
      },
      { status: 400 },
    );
  }

  const parts = nom.split(/\s+/);
  let initiales = String(body.initiales ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 2);
  if (!initiales) {
    initiales = ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? parts[0]?.[1] ?? '')).toUpperCase();
  }
  if (initiales.length < 2) {
    return NextResponse.json({ error: 'Indiquez 2 initiales (ex. KA).' }, { status: 400 });
  }

  const id =
    email.split('@')[0].replace(/[^a-z0-9]/g, '').slice(0, 24) || `u${Date.now()}`;

  const clash = await prisma.user.findFirst({
    where: { OR: [{ email }, { initiales }, { id }] },
  });
  if (clash) {
    return NextResponse.json(
      { error: 'Un compte existe déjà avec cet email ou ces initiales.' },
      { status: 409 },
    );
  }

  const provisoire = motDePasseProvisoire();
  const passwordHash = await bcrypt.hash(provisoire, 10);
  const user = await prisma.user.create({
    data: {
      id,
      nom,
      email,
      initiales,
      role,
      acces,
      terrain,
      passwordHash,
      actif: true,
      mustChangePassword: true,
    },
  });

  await logAdminAction({
    auteurId: gate.user.id,
    action: 'cree',
    cibleId: user.id,
    detail: `${user.nom} · ${ACCES_LABEL[user.acces]} · ${user.email}`,
  });

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      nom: user.nom,
      email: user.email,
      acces: user.acces,
      accesLabel: ACCES_LABEL[user.acces],
    },
    motDePasseProvisoire: provisoire,
  });
}

export async function PATCH(req: Request) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const body = await req.json();
  const id = String(body.id ?? '').trim();
  const action = String(body.action ?? '').trim();
  if (!id || !action) {
    return NextResponse.json({ error: 'Paramètres manquants.' }, { status: 400 });
  }

  const cible = await prisma.user.findUnique({ where: { id } });
  if (!cible) return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 });

  if (action === 'set_acces') {
    const acces =
      body.acces === 'administrateur' ? Acces.administrateur : Acces.collaborateur;

    if (id === gate.user.id && acces !== Acces.administrateur) {
      return NextResponse.json(
        {
          error:
            'Vous ne pouvez pas retirer votre propre rôle administrateur. Demandez à un autre administrateur.',
        },
        { status: 400 },
      );
    }

    if (
      cible.acces === Acces.administrateur &&
      acces !== Acces.administrateur &&
      cible.actif
    ) {
      const restants = await countAdminsActifs(id);
      if (restants < 1) {
        return NextResponse.json(
          {
            error:
              'Impossible : il doit rester au moins un administrateur actif (Valérie ou Denis).',
          },
          { status: 400 },
        );
      }
    }

    await prisma.user.update({ where: { id }, data: { acces } });
    await logAdminAction({
      auteurId: gate.user.id,
      action: 'modifie_role',
      cibleId: id,
      detail: `${cible.nom} → ${ACCES_LABEL[acces]}`,
    });
    return NextResponse.json({ ok: true, acces, accesLabel: ACCES_LABEL[acces] });
  }

  if (action === 'desactiver') {
    if (id === gate.user.id) {
      return NextResponse.json(
        { error: 'Vous ne pouvez pas désactiver votre propre compte.' },
        { status: 400 },
      );
    }
    if (cible.acces === Acces.administrateur && cible.actif) {
      const restants = await countAdminsActifs(id);
      if (restants < 1) {
        return NextResponse.json(
          {
            error:
              'Impossible de désactiver le dernier administrateur actif.',
          },
          { status: 400 },
        );
      }
    }
    await prisma.user.update({ where: { id }, data: { actif: false } });
    await prisma.pushSubscription.deleteMany({ where: { userId: id } });
    await logAdminAction({
      auteurId: gate.user.id,
      action: 'desactive',
      cibleId: id,
      detail: cible.nom,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === 'reactiver') {
    await ensureEntrepriseSettings();
    const [abo, actifs] = await Promise.all([
      prisma.abonnement.findUnique({ where: { entrepriseId: 'setrim' } }),
      prisma.user.count({ where: { actif: true } }),
    ]);
    const inclus = abo?.usersInclus ?? 5;
    if (!cible.actif && actifs >= inclus) {
      return NextResponse.json(
        {
          error: `Limite atteinte (${actifs}/${inclus}). Demandez des utilisateurs supplémentaires via Abonnement avant de réactiver.`,
        },
        { status: 400 },
      );
    }
    await prisma.user.update({ where: { id }, data: { actif: true } });
    await logAdminAction({
      auteurId: gate.user.id,
      action: 'reactive',
      cibleId: id,
      detail: cible.nom,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === 'reset_mdp') {
    const provisoire = motDePasseProvisoire();
    const passwordHash = await bcrypt.hash(provisoire, 10);
    await prisma.user.update({
      where: { id },
      data: { passwordHash, mustChangePassword: true },
    });
    await logAdminAction({
      auteurId: gate.user.id,
      action: 'reset_mdp',
      cibleId: id,
      detail: cible.nom,
    });
    return NextResponse.json({ ok: true, motDePasseProvisoire: provisoire });
  }

  return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 });
}
