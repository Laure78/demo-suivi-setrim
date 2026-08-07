import { Shell } from '@/components/Shell';
import { prisma } from '@/lib/prisma';
import { eur, eur0, daysLate } from '@/lib/format';
import { AffaireStatut } from '@prisma/client';

export const dynamic = 'force-dynamic';

export default async function FacturationPage() {
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
    (a) => a.statut === AffaireStatut.solde && !a.factures.some((f) => f.type === 'solde'),
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
      <div className="fact-grid">
        <div className="card stat">
          <span className="eyebrow">Portefeuille</span>
          <span className="v">{eur0(portefeuilleHt)}</span>
          <span className="hint">{portefeuilleJ} jours de charge</span>
        </div>
        <div className="card stat">
          <span className="eyebrow">Acomptes encaissés</span>
          <span className="v">{eur0(acomptesEncaisse)}</span>
        </div>
        <div className="card stat alarm">
          <span className="eyebrow">Reste à facturer</span>
          <span className="v">
            {eur0(aFacturer.reduce((s, a) => s + Number(a.montantHt), 0))}
          </span>
          <span className="hint">
            {aFacturer.length} chantier{aFacturer.length > 1 ? 's' : ''} terminé
            {aFacturer.length > 1 ? 's' : ''} sans facture de solde
          </span>
        </div>
        <div className="card stat alarm">
          <span className="eyebrow">Impayés contrats d&apos;entretien</span>
          <span className="v">{eur0(impayesTotal)}</span>
          <span className="hint">{impayesCe.length} factures</span>
        </div>
      </div>

      <div className="sec-head">
        <span className="eyebrow">Chantiers terminés sans facture de solde</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Devis</th>
            <th>Client</th>
            <th style={{ textAlign: 'right' }}>Montant HT</th>
            <th>Fin d&apos;intervention</th>
            <th>Responsable</th>
          </tr>
        </thead>
        <tbody>
          {aFacturer.map((a) => {
            const late = a.dateFin ? daysLate(a.dateFin) : 0;
            return (
              <tr key={a.id} className="row">
                <td className="mono">{a.numeroDevis}</td>
                <td>
                  <span className="cli">{a.client}</span>
                  <div className="adr">{a.adresse}</div>
                </td>
                <td className="num">{eur(Number(a.montantHt))}</td>
                <td className="mono">
                  {a.dateFin
                    ? a.dateFin.toLocaleDateString('fr-FR')
                    : '—'}
                </td>
                <td>
                  Valérie{' '}
                  {late > 0 ? <span className="pill no">{late} j de retard</span> : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="sec-head">
        <span className="eyebrow">Acomptes à établir</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Devis</th>
            <th>Client</th>
            <th style={{ textAlign: 'right' }}>Montant HT</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>
          {acompteDu.map((a) => (
            <tr key={a.id} className="row">
              <td className="mono">{a.numeroDevis}</td>
              <td>
                <span className="cli">{a.client}</span>
                <div className="adr">{a.adresse}</div>
              </td>
              <td className="num">{eur(Number(a.montantHt))}</td>
              <td>
                <span className="pill wait">Acompte non émis</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="hint">
        Réponse à « est-ce que le chantier est facturé ? » : les trois pastilles sur l&apos;affaire,
        et ces deux listes.
      </p>
    </Shell>
  );
}
