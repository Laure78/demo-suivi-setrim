'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { eur, MOIS_EXERCICE, formatDateFr } from '@/lib/format';
import { AIDES } from '@/lib/aides';
import { AideLabel } from '@/components/AideTip';
import { AffaireSheet, type AffaireDetail } from '@/components/AffaireSheet';
import {
  labelStatutListe,
  statutContratAffichage,
  type CeStatutCle,
} from '@/lib/ce-statut';

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

type FiltreStatut = 'tous' | CeStatutCle | 'hors_mois';

export function ContratsView({ contrats }: { contrats: ContratRow[] }) {
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AffaireDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [filtre, setFiltre] = useState<FiltreStatut>('tous');
  const router = useRouter();

  const rows = useMemo(() => {
    const enriched = contrats.map((c) => {
      const st = statutContratAffichage({
        etat: c.etat,
        datePosee: c.datePosee,
        moisContractuel: c.moisContractuel,
        exercice: '2026-2027',
      });
      return { ...c, st, statutLabel: labelStatutListe(st) };
    });
    enriched.sort((a, b) => {
      if (a.moisContractuel !== b.moisContractuel) {
        return a.moisContractuel - b.moisContractuel;
      }
      return a.syndic.localeCompare(b.syndic, 'fr');
    });
    if (filtre === 'tous') return enriched;
    if (filtre === 'hors_mois') return enriched.filter((c) => c.st.horsMois);
    return enriched.filter((c) => c.st.cle === filtre);
  }, [contrats, filtre]);

  const nbAlerte = useMemo(
    () =>
      contrats.filter((c) => {
        const st = statutContratAffichage({
          etat: c.etat,
          datePosee: c.datePosee,
          moisContractuel: c.moisContractuel,
        });
        return st.cle === 'a_programmer' && st.alerteRetard;
      }).length,
    [contrats],
  );

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
        ? `Exercice lié : ${j.created ?? 0} affaire(s) CE (planning synchronisé · alertes J-15).`
        : j.error ?? 'Échec',
    );
    router.refresh();
  }

  return (
    <>
      <p className="hint" style={{ marginBottom: 12 }}>
        <AideLabel aide={AIDES.contrats}>
          <span>
            Exercice du 1<sup>er</sup> juillet 2026 au 30 juin 2027. Posez la date sur la fiche :
            le créneau apparaît au planning (bleu). Modifier le planning met à jour le contrat, et
            l&apos;inverse aussi. Cliquez une ligne pour ouvrir l&apos;affaire.
          </span>
        </AideLabel>
      </p>

      {nbAlerte > 0 ? (
        <p
          className="hint"
          style={{
            marginBottom: 12,
            padding: '10px 12px',
            background: 'rgba(196, 70, 40, 0.08)',
            borderLeft: '3px solid var(--flamme)',
            color: 'var(--flamme)',
            fontWeight: 600,
          }}
        >
          ▲ {nbAlerte} contrat{nbAlerte > 1 ? 's' : ''} non programmé
          {nbAlerte > 1 ? 's' : ''} dont le mois contractuel est en cours ou passé.
        </p>
      ) : null}

      <div className="import-bar" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn-primary"
          onClick={genererExercice}
          disabled={busy}
        >
          Lier exercice → affaires / planning / alertes
        </button>
        <label className="filter-client" style={{ marginLeft: 'auto' }}>
          <span className="eyebrow">Statut</span>
          <select
            value={filtre}
            onChange={(e) => setFiltre(e.target.value as FiltreStatut)}
            aria-label="Filtrer par statut"
          >
            <option value="tous">Tous</option>
            <option value="a_programmer">À programmer</option>
            <option value="programme">Programmé</option>
            <option value="realise">Réalisé</option>
            <option value="hors_mois">Hors mois contractuel</option>
          </select>
        </label>
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
              <th>Date programmée</th>
              <th>Statut</th>
              {MOIS_EXERCICE.map((m) => (
                <th key={m}>{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr
                key={c.id}
                className="row"
                style={{
                  cursor: c.affaire ? 'pointer' : undefined,
                  background: c.st.alerteRetard
                    ? 'rgba(196, 74, 42, 0.06)'
                    : c.st.horsMois
                      ? 'rgba(245, 200, 66, 0.12)'
                      : undefined,
                }}
                onClick={() => c.affaire && openAffaire(c.affaire.id)}
              >
                <td className="lbl">
                  <span className="cli">{c.syndic}</span>
                  <div className="adr">{c.immeuble}</div>
                  {c.st.alerteRetard ? (
                    <div className="adr" style={{ color: 'var(--flamme)' }}>
                      ▲ Mois contractuel en cours ou passé — à programmer
                    </div>
                  ) : null}
                  {c.note && !c.st.alerteRetard ? (
                    <div className="adr" style={{ color: 'var(--zinc)' }}>
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
                <td className="mono">
                  {c.datePosee ? formatDateFr(c.datePosee) : '—'}
                </td>
                <td>
                  <span
                    className={`pill${
                      c.st.cle === 'realise'
                        ? ' ok'
                        : c.st.alerteRetard || c.st.horsMois
                          ? ' no'
                          : c.st.cle === 'programme'
                            ? ' wait'
                            : ''
                    }`}
                  >
                    {c.statutLabel}
                  </span>
                </td>
                {MOIS_EXERCICE.map((_, i) => (
                  <td key={i}>
                    <span
                      className={`mk ${
                        i === c.moisContractuel
                          ? c.st.cle === 'realise'
                            ? 'done'
                            : c.st.cle === 'programme'
                              ? 'pose'
                              : c.st.alerteRetard
                                ? 'alert'
                                : 'contract'
                          : ''
                      }`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length ? (
        <p className="hint">Aucun contrat pour ce filtre.</p>
      ) : null}
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
          À programmer (mois en cours / passé)
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
          initialTab="plan"
        />
      ) : null}
    </>
  );
}
