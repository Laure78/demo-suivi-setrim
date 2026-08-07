import { Shell } from '@/components/Shell';
import { prisma } from '@/lib/prisma';
import { eur, MOIS_EXERCICE } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function ContratsPage() {
  const contrats = await prisma.contratEntretien.findMany({
    orderBy: { moisContractuel: 'asc' },
  });

  return (
    <Shell title="Contrats d'entretien">
      <p className="hint" style={{ marginBottom: 12 }}>
        Exercice du 1<sup>er</sup> juillet 2026 au 30 juin 2027. Le mois de passage est contractuel :
        à l&apos;ouverture de l&apos;exercice, chaque contrat crée son intervention. Alerte à J-30
        pour poser la date, urgence à J-15 si rien n&apos;est calé.
      </p>
      <div className="plan-wrap">
        <table className="months">
          <thead>
            <tr>
              <th className="lbl">Syndic / immeuble</th>
              <th className="mnt" style={{ textAlign: 'right' }}>
                Montant HT
              </th>
              <th className="gars">Compagnons</th>
              {MOIS_EXERCICE.map((m) => (
                <th key={m}>{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {contrats.map((c) => (
              <tr key={c.id}>
                <td className="lbl">
                  <span className="cli">{c.syndic}</span>
                  <div className="adr">{c.immeuble}</div>
                  {c.note ? (
                    <div
                      className="adr"
                      style={{
                        color: c.etat === 'alert' ? 'var(--flamme)' : 'var(--zinc)',
                      }}
                    >
                      {c.etat === 'alert' ? '▲ ' : ''}
                      {c.note}
                    </div>
                  ) : null}
                </td>
                <td className="num" style={{ textAlign: 'right' }}>
                  {eur(Number(c.montantHt))}
                </td>
                <td className="mono">{c.nbCompagnons}</td>
                {MOIS_EXERCICE.map((_, i) => (
                  <td key={i}>
                    <span className={`mk ${i === c.moisContractuel ? c.etat : ''}`} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="legend">
        <span>
          <i style={{ background: 'var(--bleu)' }} />
          Mois contractuel
        </span>
        <span>
          <i style={{ background: '#F5C842' }} />
          Date posée au planning
        </span>
        <span>
          <i style={{ background: 'var(--vert)' }} />
          Intervention réalisée
        </span>
        <span>
          <i style={{ background: 'var(--flamme)' }} />
          Échéance dépassée sans date
        </span>
      </div>
    </Shell>
  );
}
