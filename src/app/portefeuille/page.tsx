import { Shell } from '@/components/Shell';
import { AffairesView } from '@/components/AffairesView';
import { prisma } from '@/lib/prisma';
import { daysLate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function PortefeuillePage() {
  const affaires = await prisma.affaire.findMany({
    include: {
      factures: true,
      taches: { where: { fait: false }, select: { dateEcheance: true } },
    },
    orderBy: { dateDevis: 'desc' },
  });

  const counts = {
    commande: 0,
    programme: 0,
    encours: 0,
    solde: 0,
  };
  for (const a of affaires) counts[a.statut]++;

  return (
    <Shell title="Portefeuille">
      <AffairesView
        counts={counts}
        affaires={affaires.map((a) => {
          const hasAcompte = a.factures.some((f) => f.type === 'acompte');
          const hasSolde = a.factures.some((f) => f.type === 'solde');
          const hasEncaisse = a.factures.some((f) => f.dateEncaissement);
          return {
            id: a.id,
            numeroDevis: a.numeroDevis,
            client: a.client,
            adresse: a.adresse,
            montantHt: Number(a.montantHt),
            acompteHt: Number(a.acompteHt),
            joursCharge: a.joursCharge,
            statut: a.statut,
            dateDevis: a.dateDevis?.toISOString() ?? null,
            note: a.note,
            hasAcompte,
            hasSolde,
            hasEncaisse,
            tachesOuvertes: a.taches.length,
            tachesRetard: a.taches.filter((t) => daysLate(t.dateEcheance) > 0).length,
          };
        })}
      />
    </Shell>
  );
}
