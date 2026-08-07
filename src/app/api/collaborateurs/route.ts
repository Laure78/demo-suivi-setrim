import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { ROLE_LABEL } from '@/lib/format';
import { ensureBureauUsers, isBureauUser, sortUsersBureauFirst } from '@/lib/bureau-users';

const DEMO_PASSWORD = 'setrim2026';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  await ensureBureauUsers();

  const users = sortUsersBureauFirst(
    await prisma.user.findMany({
      where: { actif: true },
      select: {
        id: true,
        initiales: true,
        nom: true,
        email: true,
        role: true,
        terrain: true,
        avatarUrl: true,
      },
    }),
  );

  return NextResponse.json(
    users.map((u) => ({
      ...u,
      roleLabel: ROLE_LABEL[u.role] ?? u.role,
    })),
  );
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  // Bureau uniquement
  if (!['assistante', 'responsable', 'dirigeant'].includes(session.user.role)) {
    return NextResponse.json(
      { error: 'Seuls Audrey, Mélissa, Valérie ou Denis peuvent gérer les collaborateurs.' },
      { status: 403 },
    );
  }

  const body = await req.json();

  // Suppression via POST (compatible si DELETE n’est pas encore routé)
  if (body.action === 'delete') {
    const id = String(body.id ?? '').trim();
    if (!id) return NextResponse.json({ error: 'Identifiant manquant' }, { status: 400 });
    if (id === session.user.id) {
      return NextResponse.json({ error: 'Vous ne pouvez pas vous supprimer vous-même.' }, { status: 400 });
    }
    if (isBureauUser(id)) {
      return NextResponse.json(
        {
          error:
            'Les 5 comptes bureau (Audrey, Mélissa, Valérie, Denis, Philippe) ne peuvent pas être supprimés.',
        },
        { status: 400 },
      );
    }
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || !user.actif) {
      return NextResponse.json({ error: 'Collaborateur introuvable' }, { status: 404 });
    }
    await prisma.user.update({ where: { id }, data: { actif: false } });
    await prisma.threadMeta.deleteMany({ where: { id } });
    await prisma.pushSubscription.deleteMany({ where: { userId: id } });
    const all = await prisma.user.findMany({ where: { actif: true }, select: { nom: true } });
    await prisma.threadMeta.updateMany({
      where: { id: 'gen' },
      data: { sousTitre: all.map((u) => u.nom).join(', ') },
    });
    return NextResponse.json({ ok: true, id, nom: user.nom });
  }

  const nom = String(body.nom ?? '').trim();
  let initiales = String(body.initiales ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 2);
  const emailRaw = String(body.email ?? '').trim().toLowerCase();
  const role = (body.role as Role) || Role.assistante;
  const terrain = Boolean(body.terrain);

  if (!nom) return NextResponse.json({ error: 'Le nom est obligatoire.' }, { status: 400 });

  if (!initiales) {
    const parts = nom.split(/\s+/);
    initiales = ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? parts[0]?.[1] ?? '')).toUpperCase();
  }
  if (initiales.length < 2) {
    return NextResponse.json({ error: 'Indiquez 2 initiales (ex. KA).' }, { status: 400 });
  }

  const email = emailRaw || `${nom.toLowerCase().replace(/[^a-z0-9]+/g, '.')}@setrim.fr`;
  const id = email.split('@')[0].replace(/[^a-z0-9]/g, '').slice(0, 24) || `u${Date.now()}`;

  const clash = await prisma.user.findFirst({
    where: { OR: [{ email }, { initiales }, { id }] },
  });
  if (clash) {
    return NextResponse.json(
      { error: 'Un collaborateur existe déjà avec cet email ou ces initiales.' },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const user = await prisma.user.create({
    data: {
      id,
      nom,
      initiales,
      email,
      role,
      terrain,
      passwordHash,
    },
  });

  await prisma.threadMeta.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      titre: user.nom,
      sousTitre: ROLE_LABEL[user.role] ?? user.role,
      avatar: user.initiales,
      cls: '',
      ordre: 20,
    },
    update: {
      titre: user.nom,
      sousTitre: ROLE_LABEL[user.role] ?? user.role,
      avatar: user.initiales,
    },
  });

  // Mettre à jour le sous-titre du fil Équipe
  const all = await prisma.user.findMany({ where: { actif: true }, select: { nom: true } });
  await prisma.threadMeta.upsert({
    where: { id: 'gen' },
    create: {
      id: 'gen',
      titre: 'Équipe SETRIM',
      sousTitre: all.map((u) => u.nom).join(', '),
      avatar: 'ST',
      cls: 'grp',
      ordre: 0,
    },
    update: { sousTitre: all.map((u) => u.nom).join(', ') },
  });

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      nom: user.nom,
      initiales: user.initiales,
      email: user.email,
      role: user.role,
      terrain: user.terrain,
      roleLabel: ROLE_LABEL[user.role] ?? user.role,
    },
    password: DEMO_PASSWORD,
  });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  if (!['assistante', 'responsable', 'dirigeant'].includes(session.user.role)) {
    return NextResponse.json(
      { error: 'Seuls Audrey, Mélissa, Valérie ou Denis peuvent retirer un collaborateur.' },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? new URL(req.url).searchParams.get('id') ?? '').trim();
  if (!id) return NextResponse.json({ error: 'Identifiant manquant' }, { status: 400 });

  if (id === session.user.id) {
    return NextResponse.json({ error: 'Vous ne pouvez pas vous supprimer vous-même.' }, { status: 400 });
  }

  if (isBureauUser(id)) {
    return NextResponse.json(
      {
        error:
          'Les 5 comptes bureau (Audrey, Mélissa, Valérie, Denis, Philippe) ne peuvent pas être supprimés.',
      },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || !user.actif) {
    return NextResponse.json({ error: 'Collaborateur introuvable' }, { status: 404 });
  }

  // Soft delete — conserve l'historique des messages / tâches
  await prisma.user.update({
    where: { id },
    data: { actif: false },
  });

  await prisma.threadMeta.deleteMany({ where: { id } });
  await prisma.pushSubscription.deleteMany({ where: { userId: id } });

  const all = await prisma.user.findMany({ where: { actif: true }, select: { nom: true } });
  await prisma.threadMeta.updateMany({
    where: { id: 'gen' },
    data: { sousTitre: all.map((u) => u.nom).join(', ') },
  });

  return NextResponse.json({ ok: true, id, nom: user.nom });
}
