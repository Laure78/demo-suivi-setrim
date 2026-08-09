import { prisma } from '@/lib/prisma';

/**
 * Crée une fiche client pour chaque nom d’affaire encore orphelin,
 * et rattache les affaires sans clientId.
 */
export async function assurerFichesClients() {
  const affaires = await prisma.affaire.findMany({
    select: { id: true, client: true, clientId: true, adresse: true },
  });

  const byNom = new Map<string, string>(); // nom normalisé → clientId
  const existing = await prisma.client.findMany({ select: { id: true, nom: true } });
  for (const c of existing) {
    byNom.set(c.nom.trim().toLowerCase(), c.id);
  }

  let created = 0;
  let linked = 0;

  for (const a of affaires) {
    const nom = (a.client || '').trim();
    if (!nom) continue;

    let clientId = a.clientId;
    if (!clientId) {
      const key = nom.toLowerCase();
      clientId = byNom.get(key) ?? null;
      if (!clientId) {
        const c = await prisma.client.create({
          data: {
            nom,
            adresse: a.adresse || '',
          },
        });
        clientId = c.id;
        byNom.set(key, c.id);
        created++;
      }
      await prisma.affaire.update({
        where: { id: a.id },
        data: { clientId },
      });
      linked++;
    } else if (!byNom.has(nom.toLowerCase())) {
      byNom.set(nom.toLowerCase(), clientId);
    }
  }

  return { created, linked };
}
