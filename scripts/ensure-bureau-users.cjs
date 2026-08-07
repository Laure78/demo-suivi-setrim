/**
 * Réactive Valérie (et les 4 autres comptes bureau) sur la base liée à Railway.
 * Usage: npx @railway/cli run node scripts/ensure-bureau-users.cjs
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const DEMO_PASSWORD = 'setrim2026';

const BUREAU = [
  { id: 'audrey', initiales: 'AU', nom: 'Audrey', email: 'audrey@setrim.fr', role: 'assistante', terrain: false },
  { id: 'melissa', initiales: 'ME', nom: 'Mélissa', email: 'melissa@setrim.fr', role: 'assistante', terrain: false },
  { id: 'valerie', initiales: 'VA', nom: 'Valérie', email: 'valerie@setrim.fr', role: 'responsable', terrain: false },
  { id: 'denis', initiales: 'DE', nom: 'Denis', email: 'denis@setrim.fr', role: 'dirigeant', terrain: true },
  { id: 'philippe', initiales: 'PH', nom: 'Philippe', email: 'philippe@setrim.fr', role: 'conducteur', terrain: true },
];

async function main() {
  // Depuis la machine locale, Railway injecte souvent l’URL interne injoignable :
  // préférer l’URL publique si elle est fournie.
  if (process.env.DATABASE_PUBLIC_URL) {
    process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL;
  }

  const prisma = new PrismaClient();
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);

  for (const u of BUREAU) {
    await prisma.user.upsert({
      where: { id: u.id },
      create: { ...u, passwordHash: hash, actif: true },
      update: {
        nom: u.nom,
        initiales: u.initiales,
        email: u.email,
        role: u.role,
        terrain: u.terrain,
        actif: true,
      },
    });
  }

  const roleLabel = {
    assistante: 'Assistante',
    responsable: 'Responsable',
    dirigeant: 'Dirigeant',
    conducteur: 'Conducteur de travaux',
  };

  for (const u of BUREAU) {
    await prisma.threadMeta.upsert({
      where: { id: u.id },
      create: {
        id: u.id,
        titre: u.nom,
        sousTitre: roleLabel[u.role] ?? u.role,
        avatar: u.initiales,
        cls: '',
        ordre: 10,
      },
      update: {
        titre: u.nom,
        sousTitre: roleLabel[u.role] ?? u.role,
        avatar: u.initiales,
      },
    });
  }

  const all = await prisma.user.findMany({
    where: { actif: true },
    select: { id: true, nom: true },
    orderBy: { nom: 'asc' },
  });

  await prisma.threadMeta.updateMany({
    where: { id: 'gen' },
    data: { sousTitre: all.map((x) => x.nom).join(', ') },
  });

  console.log('Bureau OK — Valérie active');
  console.log('Actifs:', all.map((x) => x.nom).join(', '));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
