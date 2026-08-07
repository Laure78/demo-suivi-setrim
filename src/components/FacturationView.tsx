'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { eur, eur0 } from '@/lib/format';
import { AffaireSheet, type AffaireDetail } from '@/components/AffaireSheet';

type AffaireFactRow = {
  id: string;
  numeroDevis: string;
  client: string;
  adresse: string;
  montantHt: number;
  dateFin: string | null;
  statut: string;
  lateDays: number;
};

export function FacturationView({
  portefeuilleHt,
  portefeuilleJ,
  acomptesEncaisse,
  resteFacturer,
  aFacturer,
  acompteDu,
  impayesTotal,
  impayesCount,
}: {
  portefeuilleHt: number;
  portefeuilleJ: number;
  acomptesEncaisse: number;
  resteFacturer: number;
  aFacturer: AffaireFactRow[];
  acompteDu: AffaireFactRow[];
  impayesTotal: number;
  impayesCount: number;
}) {
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AffaireDetail | null>(null);
  const router = useRouter();

  async function openSheet(id: string) {
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

  function closeSheet() {
    setSheetId(null);
    setDetail(null);
    router.refresh();
  }

  return (
    <>
      <p className="hint" style={{ marginBottom: 12 }}>
        Même objet que le portefeuille : chaque ligne ouvre l&apos;affaire (devis → planning →
        tâches → factures).
      </p>
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
          <span className="v">{eur0(resteFacturer)}</span>
          <span className="hint">
            {aFacturer.length} chantier{aFacturer.length > 1 ? 's' : ''} terminé
            {aFacturer.length > 1 ? 's' : ''} sans facture de solde
          </span>
        </div>
        <div className="card stat alarm">
          <span className="eyebrow">Impayés contrats d&apos;entretien</span>
          <span className="v">{eur0(impayesTotal)}</span>
          <span className="hint">{impayesCount} factures</span>
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
          {aFacturer.map((a) => (
            <tr
              key={a.id}
              className="row"
              onClick={() => openSheet(a.id)}
              style={{ cursor: 'pointer' }}
            >
              <td className="mono">{a.numeroDevis}</td>
              <td>
                <span className="cli">{a.client}</span>
                <div className="adr">{a.adresse}</div>
              </td>
              <td className="num">{eur(a.montantHt)}</td>
              <td className="mono">
                {a.dateFin
                  ? new Date(a.dateFin).toLocaleDateString('fr-FR')
                  : '—'}
              </td>
              <td>
                Valérie{' '}
                {a.lateDays > 0 ? (
                  <span className="pill no">{a.lateDays} j de retard</span>
                ) : null}
              </td>
            </tr>
          ))}
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
            <tr
              key={a.id}
              className="row"
              onClick={() => openSheet(a.id)}
              style={{ cursor: 'pointer' }}
            >
              <td className="mono">{a.numeroDevis}</td>
              <td>
                <span className="cli">{a.client}</span>
                <div className="adr">{a.adresse}</div>
              </td>
              <td className="num">{eur(a.montantHt)}</td>
              <td>
                <span className="pill wait">Acompte non émis</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="hint">
        Cliquez une ligne pour ouvrir la fiche affaire et émettre acompte / solde — cela coche
        l&apos;alerte et alimente le même portefeuille.
      </p>

      {sheetId ? (
        <AffaireSheet
          detail={detail}
          onClose={closeSheet}
          onRefresh={refreshDetail}
        />
      ) : null}
    </>
  );
}
