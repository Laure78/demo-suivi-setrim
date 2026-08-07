import { Shell } from '@/components/Shell';
import { FacturationView } from '@/components/FacturationView';
import { prisma } from '@/lib/prisma';
import { daysLate } from '@/lib/format';
import { AffaireStatut } from '@prisma/client';
import { assurerLiensGlobaux } from '@/lib/affaire-lifecycle';

export const dynamic = 'force-dynamic';

export default async function FacturationPage() {
  await assurerLiensGlobaux();

  const affaires = await prisma.affaire.findMany({
    include: { factures: true },
  });

  const portefeuille = affaires.filter(
    (a) => a.statut === AffaireStatut.commande || a.statut === AffaireStatut.programme,
  );
  const portefeuilleHt = portefeuille.reduce((s, a) => s + Number(a.montantHt), 0);
  const portefeuilleJ = portefeuille.reduce((s, a) => s + a.joursCharge, 0);

  const acomptesEncaisse = affaires
    .flatMap((a) => a.factures)
    .filter((f) => f.type === 'acompte' && f.dateEncaissement)
    .reduce((s, f) => s + Number(f.montant), 0);

  const aFacturer = affaires.filter(
    (a) =>
      !a.factures.some((f) => f.type === 'solde') &&
      (a.statut === AffaireStatut.solde ||
        a.statut === AffaireStatut.encours ||
        !!a.dateFin),
  );
  const acompteDu = affaires.filter(
    (a) => a.statut !== AffaireStatut.solde && !a.factures.some((f) => f.type === 'acompte'),
  );

  const impayesCe = await prisma.contratEntretien.findMany({
    where: { note: { contains: 'non régl' } },
  });
  const impayesTotal = impayesCe.reduce((s, c) => s + Number(c.montantHt), 0);

  return (
    <Shell title="Facturation">
      <FacturationView
        portefeuilleHt={portefeuilleHt}
        portefeuilleJ={portefeuilleJ}
        acomptesEncaisse={acomptesEncaisse}
        resteFacturer={aFacturer.reduce((s, a) => s + Number(a.montantHt), 0)}
        aFacturer={aFacturer.map((a) => ({
          id: a.id,
          numeroDevis: a.numeroDevis,
          client: a.client,
          adresse: a.adresse,
          montantHt: Number(a.montantHt),
          dateFin: a.dateFin?.toISOString() ?? null,
          statut: a.statut,
          lateDays: a.dateFin ? daysLate(a.dateFin) : 0,
        }))}
        acompteDu={acompteDu.map((a) => ({
          id: a.id,
          numeroDevis: a.numeroDevis,
          client: a.client,
          adresse: a.adresse,
          montantHt: Number(a.montantHt),
          dateFin: a.dateFin?.toISOString() ?? null,
          statut: a.statut,
          lateDays: 0,
        }))}
        impayesTotal={impayesTotal}
        impayesCount={impayesCe.length}
      />
    </Shell>
  );
}
