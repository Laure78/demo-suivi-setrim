import { Shell } from '@/components/Shell';
import { ContratsView } from '@/components/ContratsView';
import { prisma } from '@/lib/prisma';
import { assurerLiensGlobaux } from '@/lib/affaire-lifecycle';

export const dynamic = 'force-dynamic';

export default async function ContratsPage() {
  await assurerLiensGlobaux();

  const contrats = await prisma.contratEntretien.findMany({
    include: {
      affaires: {
        select: {
          id: true,
          numeroDevis: true,
          statut: true,
          dateDebut: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { moisContractuel: 'asc' },
  });

  return (
    <Shell title="Contrats d'entretien">
      <ContratsView
        contrats={contrats.map((c) => ({
          id: c.id,
          immeuble: c.immeuble,
          syndic: c.syndic,
          montantHt: Number(c.montantHt),
          nbCompagnons: c.nbCompagnons,
          moisContractuel: c.moisContractuel,
          etat: c.etat,
          note: c.note,
          datePosee: c.datePosee?.toISOString() ?? null,
          exercice: c.exercice,
          affaire: c.affaires[0]
            ? {
                id: c.affaires[0].id,
                numeroDevis: c.affaires[0].numeroDevis,
                statut: c.affaires[0].statut,
                dateDebut: c.affaires[0].dateDebut?.toISOString() ?? null,
              }
            : null,
        }))}
      />
    </Shell>
  );
}
