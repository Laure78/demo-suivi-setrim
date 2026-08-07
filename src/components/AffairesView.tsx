'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { eur, eur0, formatDateFr, STATUT_PLURAL } from '@/lib/format';
import { AffaireSheet, type AffaireDetail } from '@/components/AffaireSheet';

export type AffaireRow = {
  id: string;
  numeroDevis: string;
  client: string;
  adresse: string;
  montantHt: number;
  acompteHt: number;
  joursCharge: number;
  statut: string;
  dateDevis: string | null;
  note: string;
  hasAcompte: boolean;
  hasSolde: boolean;
  hasEncaisse: boolean;
  tachesOuvertes: number;
  tachesRetard: number;
};

const TABS = ['commande', 'programme', 'encours', 'solde'] as const;

export function AffairesView({
  affaires,
  counts,
}: {
  affaires: AffaireRow[];
  counts: Record<string, number>;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]>('commande');
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AffaireDetail | null>(null);
  const router = useRouter();

  const rows = useMemo(() => affaires.filter((a) => a.statut === tab), [affaires, tab]);
  const tot = rows.reduce((s, a) => s + a.montantHt, 0);
  const totj = rows.reduce((s, a) => s + a.joursCharge, 0);

  // Totaux portefeuille = Commandes + Programmés
  const portefeuille = useMemo(
    () => affaires.filter((a) => a.statut === 'commande' || a.statut === 'programme'),
    [affaires],
  );
  const pfHt = portefeuille.reduce((s, a) => s + a.montantHt, 0);
  const pfJ = portefeuille.reduce((s, a) => s + a.joursCharge, 0);

  async function openSheet(id: string) {
    setSheetId(id);
    const r = await fetch(`/api/affaires/${id}`);
    if (r.ok) setDetail(await r.json());
  }

  function closeSheet() {
    setSheetId(null);
    setDetail(null);
    router.refresh();
  }

  return (
    <>
      <div className="import-bar">
        <label className="btn-primary" style={{ cursor: 'pointer' }}>
          Importer les devis
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const fd = new FormData();
              fd.append('file', f);
              const r = await fetch('/api/affaires/import', { method: 'POST', body: fd });
              const j = await r.json();
              alert(j.message ?? (r.ok ? 'Import terminé' : 'Échec import'));
              router.refresh();
              e.target.value = '';
            }}
          />
        </label>
        <span className="hint" style={{ margin: 0 }}>
          Export Excel Batappli — n° devis · date · client · adresse · montant HT · montant TTC
        </span>
      </div>

      <div className="totals" style={{ marginBottom: 14, borderTop: '1px solid var(--trait)' }}>
        <div>
          <span className="eyebrow">Portefeuille (commandes + programmés)</span>
          <span className="v">{eur0(pfHt)}</span>
        </div>
        <div>
          <span className="eyebrow">Jours de charge</span>
          <span className="v">{pfJ} j</span>
        </div>
        <div>
          <span className="eyebrow">Moyenne / jour</span>
          <span className="v">{pfJ ? eur0(pfHt / pfJ) : '—'}</span>
        </div>
      </div>

      <p className="hint" style={{ marginBottom: 12 }}>
        Les trois premiers onglets sont vos trois bannettes. Une affaire naît du devis Batappli et
        garde le même numéro jusqu&apos;à l&apos;encaissement. Les chantiers programmés et en cours
        apparaissent automatiquement au planning.
      </p>
      <div className="tabs">
        {TABS.map((k) => (
          <button
            key={k}
            type="button"
            data-t={k}
            className={tab === k ? 'on' : ''}
            onClick={() => setTab(k)}
          >
            {STATUT_PLURAL[k]}
            <span className="c">{counts[k] ?? 0}</span>
          </button>
        ))}
      </div>
      <table>
        <thead>
          <tr>
            <th>Devis</th>
            <th>Client / adresse du chantier</th>
            <th style={{ textAlign: 'right' }}>Montant HT</th>
            <th style={{ textAlign: 'right' }}>Jours</th>
            <th>Acompte · Solde · Encaissé</th>
            <th>Tâches ouvertes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id} className="row" onClick={() => openSheet(a.id)}>
              <td className="mono">
                {a.numeroDevis}
                <div className="adr">{formatDateFr(a.dateDevis)}</div>
              </td>
              <td>
                <span className="cli">{a.client}</span>
                <div className="adr">{a.adresse}</div>
                {a.note ? (
                  <div className="adr" style={{ color: 'var(--flamme)' }}>
                    ▲ {a.note}
                  </div>
                ) : null}
              </td>
              <td className="num">
                {eur(a.montantHt)}
                {a.acompteHt ? (
                  <div className="adr mono">ac. {eur(a.acompteHt)}</div>
                ) : null}
              </td>
              <td className="num">{a.joursCharge}</td>
              <td>
                <div className="dots">
                  <span className={`dot${a.hasAcompte ? ' on' : ''}`} />
                  <span
                    className={`dot${a.hasSolde ? ' on' : a.statut === 'solde' ? ' late' : ''}`}
                  />
                  <span className={`dot${a.hasEncaisse ? ' on' : ''}`} />
                </div>
              </td>
              <td className="mono">
                {a.tachesOuvertes}
                {a.tachesRetard > 0 ? (
                  <span className="pill no"> {a.tachesRetard} en retard</span>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="totals">
        <div>
          <span className="eyebrow">Total {STATUT_PLURAL[tab].toLowerCase()}</span>
          <span className="v">{eur0(tot)}</span>
        </div>
        <div>
          <span className="eyebrow">Jours de charge</span>
          <span className="v">{totj} j</span>
        </div>
        <div>
          <span className="eyebrow">Moyenne par jour</span>
          <span className="v">{totj ? eur0(tot / totj) : '—'}</span>
        </div>
      </div>
      <p className="hint">
        Le portefeuille, c&apos;est ce total sur les onglets Commandes et Programmés. Une fois la
        date posée, le chantier rejoint le planning.
      </p>

      {sheetId ? (
        <AffaireSheet
          detail={detail}
          onClose={closeSheet}
          onRefresh={() => openSheet(sheetId)}
        />
      ) : null}
    </>
  );
}
