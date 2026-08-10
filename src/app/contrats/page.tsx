import { Shell } from '@/components/Shell';
import { ContratsView } from '@/components/ContratsView';
import { prisma } from '@/lib/prisma';
import { assurerLiensGlobaux } from '@/lib/affaire-lifecycle';
import { statutContratAffichage } from '@/lib/ce-statut';

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
        contrats={contrats.map((c) => {
          const affaire = c.affaires[0] ?? null;
          const statut = statutContratAffichage({
            etat: c.etat,
            datePosee: c.datePosee,
            moisContractuel: c.moisContractuel,
            exercice: c.exercice,
            realise: affaire?.statut === 'solde' || c.etat === 'done',
          });
          return {
            id: c.id,
            immeuble: c.immeuble,
            syndic: c.syndic,
            montantHt: Number(c.montantHt),
            nbCompagnons: c.nbCompagnons,
            moisContractuel: c.moisContractuel,
            note: c.note,
            datePosee: c.datePosee?.toISOString() ?? null,
            exercice: c.exercice,
            statut,
            affaire: affaire
              ? {
                  id: affaire.id,
                  numeroDevis: affaire.numeroDevis,
                  statut: affaire.statut,
                  dateDebut: affaire.dateDebut?.toISOString() ?? null,
                }
              : null,
          };
        })}
      />
    </Shell>
  );
}
