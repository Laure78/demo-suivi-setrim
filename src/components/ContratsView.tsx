'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { eur, MOIS_EXERCICE } from '@/lib/format';
import { AIDES } from '@/lib/aides';
import { AideLabel } from '@/components/AideTip';
import { AffaireSheet, type AffaireDetail } from '@/components/AffaireSheet';

type ContratRow = {
  id: string;
  immeuble: string;
  syndic: string;
  montantHt: number;
  nbCompagnons: number;
  moisContractuel: number;
  etat: string;
  note: string;
  datePosee: string | null;
  affaire: {
    id: string;
    numeroDevis: string;
    statut: string;
    dateDebut: string | null;
  } | null;
};

export function ContratsView({ contrats }: { contrats: ContratRow[] }) {
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AffaireDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function openAffaire(id: string) {
    setSheetId(id);
    setDetail(null);
    const r = await fetch(`/api/affaires/${id}`);
    if (r.ok) setDetail(await r.json());
  }

  async function refreshDetail() {
    if (!sheetId) return;
    const r = await fetch(`/api/affaires/${sheetId}`);
    if (r.ok) setDetail(await r.json());
    router.refresh();
  }

  async function genererExercice() {
    setBusy(true);
    const r = await fetch('/api/contrats/generer-exercice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exercice: '2026-2027' }),
    });
    const j = await r.json();
    setBusy(false);
    alert(
      j.ok
        ? `Exercice lié : ${j.created ?? 0} affaire(s) CE créées (planning · alerte J-15 avant entretien · RDV ½–1 j).`
        : j.error ?? 'Échec',
    );
    router.refresh();
  }

  return (
    <>
      <p className="hint" style={{ marginBottom: 12 }}>
        <AideLabel aide={AIDES.contrats}>
          <span>
            Exercice du 1<sup>er</sup> juillet 2026 au 30 juin 2027. Mois contractuel = date
            anniversaire. Chaque contrat crée une affaire : RDV de ½ journée à 1 journée, alerte
            J-30 pour caler la date, puis tâche « Préparer l&apos;entretien annuel » à J-15 avant
            le passage. Cliquez une ligne pour ouvrir l&apos;affaire.
          </span>
        </AideLabel>
      </p>

      <div className="import-bar" style={{ marginBottom: 12 }}>
        <button
          type="button"
          className="btn-primary"
          onClick={genererExercice}
          disabled={busy}
        >
          Lier exercice → affaires / planning / alertes
        </button>
      </div>

      <div className="plan-wrap">
        <table className="months">
          <thead>
            <tr>
              <th className="lbl">Syndic / immeuble</th>
              <th className="mnt" style={{ textAlign: 'right' }}>
                Montant HT
              </th>
              <th className="gars">Compagnons</th>
              <th>Affaire</th>
              {MOIS_EXERCICE.map((m) => (
                <th key={m}>{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {contrats.map((c) => (
              <tr
                key={c.id}
                className="row"
                style={{ cursor: c.affaire ? 'pointer' : undefined }}
                onClick={() => c.affaire && openAffaire(c.affaire.id)}
              >
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
                  {eur(c.montantHt)}
                </td>
                <td className="mono">{c.nbCompagnons}</td>
                <td className="mono">
                  {c.affaire ? (
                    <span className="pill wait">{c.affaire.numeroDevis}</span>
                  ) : (
                    '—'
                  )}
                </td>
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

      {sheetId ? (
        <AffaireSheet
          detail={detail}
          onClose={() => {
            setSheetId(null);
            setDetail(null);
            router.refresh();
          }}
          onRefresh={refreshDetail}
        />
      ) : null}
    </>
  );
}
