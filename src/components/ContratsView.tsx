'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { eur, formatDateFr } from '@/lib/format';
import { AIDES } from '@/lib/aides';
import { AideLabel } from '@/components/AideTip';
import { AffaireSheet, type AffaireDetail } from '@/components/AffaireSheet';
import { CeStatutPill } from '@/components/CeStatutPill';
import {
  labelMoisContractuel,
  type CeStatutAffichage,
  type CeStatutCle,
} from '@/lib/ce-statut';

export type ContratRow = {
  id: string;
  immeuble: string;
  syndic: string;
  montantHt: number;
  nbCompagnons: number;
  moisContractuel: number;
  note: string;
  datePosee: string | null;
  exercice: string;
  /** Calculé côté serveur — ne pas recalculer ici */
  statut: CeStatutAffichage;
  affaire: {
    id: string;
    numeroDevis: string;
    statut: string;
    dateDebut: string | null;
  } | null;
};

type FiltreStatut = 'tous' | CeStatutCle | 'exercice';

export function ContratsView({ contrats }: { contrats: ContratRow[] }) {
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AffaireDetail | null>(null);
  const [initialTab, setInitialTab] = useState<'plan' | 'taches'>('plan');
  const [busy, setBusy] = useState(false);
  const [filtre, setFiltre] = useState<FiltreStatut>('exercice');
  const [q, setQ] = useState('');
  const [filtreMois, setFiltreMois] = useState<number | 'tous'>('tous');
  const [filtreSyndic, setFiltreSyndic] = useState('tous');
  const router = useRouter();

  const syndics = useMemo(() => {
    const s = [...new Set(contrats.map((c) => c.syndic).filter(Boolean))];
    return s.sort((a, b) => a.localeCompare(b, 'fr'));
  }, [contrats]);

  const kpis = useMemo(() => {
    const total = contrats.length;
    const aProgrammer = contrats.filter((c) => c.statut.cle === 'a_programmer').length;
    const programmes = contrats.filter(
      (c) => c.statut.cle === 'programme' || c.statut.cle === 'hors_mois',
    ).length;
    const realises = contrats.filter((c) => c.statut.cle === 'realise').length;
    const enRetard = contrats.filter((c) => c.statut.cle === 'en_retard').length;
    return { total, aProgrammer, programmes, realises, enRetard };
  }, [contrats]);

  const rows = useMemo(() => {
    let list = [...contrats];

    if (filtre === 'a_programmer') {
      list = list.filter((c) => c.statut.cle === 'a_programmer');
    } else if (filtre === 'programme') {
      list = list.filter(
        (c) => c.statut.cle === 'programme' || c.statut.cle === 'hors_mois',
      );
    } else if (filtre === 'realise') {
      list = list.filter((c) => c.statut.cle === 'realise');
    } else if (filtre === 'en_retard') {
      list = list.filter((c) => c.statut.cle === 'en_retard');
    } else if (filtre === 'hors_mois') {
      list = list.filter((c) => c.statut.cle === 'hors_mois');
    }

    if (filtreMois !== 'tous') {
      list = list.filter((c) => c.moisContractuel === filtreMois);
    }
    if (filtreSyndic !== 'tous') {
      list = list.filter((c) => c.syndic === filtreSyndic);
    }

    const needle = q.trim().toLowerCase();
    if (needle) {
      list = list.filter(
        (c) =>
          c.immeuble.toLowerCase().includes(needle) ||
          c.syndic.toLowerCase().includes(needle) ||
          c.note.toLowerCase().includes(needle) ||
          (c.affaire?.numeroDevis ?? '').toLowerCase().includes(needle),
      );
    }

    list.sort((a, b) => {
      if (a.moisContractuel !== b.moisContractuel) {
        return a.moisContractuel - b.moisContractuel;
      }
      return a.syndic.localeCompare(b.syndic, 'fr');
    });
    return list;
  }, [contrats, filtre, filtreMois, filtreSyndic, q]);

  const groups = useMemo(() => {
    const map = new Map<
      number,
      { mois: number; rows: ContratRow[]; montant: number }
    >();
    for (const c of rows) {
      const g = map.get(c.moisContractuel) ?? {
        mois: c.moisContractuel,
        rows: [],
        montant: 0,
      };
      g.rows.push(c);
      g.montant += c.montantHt;
      map.set(c.moisContractuel, g);
    }
    return [...map.values()].sort((a, b) => a.mois - b.mois);
  }, [rows]);

  async function openAffaire(id: string, tab: 'plan' | 'taches' = 'plan') {
    setInitialTab(tab);
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
        ? `Exercice lié : ${j.created ?? 0} affaire(s) CE (planning synchronisé).`
        : j.error ?? 'Échec',
    );
    router.refresh();
  }

  return (
    <>
      <p className="hint" style={{ marginBottom: 12 }}>
        <AideLabel aide={AIDES.contrats}>
          <span>
            Exercice du 1<sup>er</sup> juillet 2026 au 30 juin 2027. Programmer une date
            crée le créneau bleu au planning. Déplacer le créneau met à jour le contrat.
          </span>
        </AideLabel>
      </p>

      <div className="ce-kpi" role="toolbar" aria-label="Synthèse contrats">
        <button
          type="button"
          className={`ce-kpi-card${filtre === 'exercice' || filtre === 'tous' ? ' on' : ''}`}
          onClick={() => setFiltre('exercice')}
        >
          <span className="ce-kpi-n">{kpis.total}</span>
          <span className="ce-kpi-l">Contrats exercice</span>
        </button>
        <button
          type="button"
          className={`ce-kpi-card${filtre === 'a_programmer' ? ' on' : ''}`}
          onClick={() => setFiltre('a_programmer')}
        >
          <span className="ce-kpi-n">{kpis.aProgrammer}</span>
          <span className="ce-kpi-l">À programmer</span>
        </button>
        <button
          type="button"
          className={`ce-kpi-card${filtre === 'programme' ? ' on' : ''}`}
          onClick={() => setFiltre('programme')}
        >
          <span className="ce-kpi-n">{kpis.programmes}</span>
          <span className="ce-kpi-l">Programmés</span>
        </button>
        <button
          type="button"
          className={`ce-kpi-card${filtre === 'realise' ? ' on' : ''}`}
          onClick={() => setFiltre('realise')}
        >
          <span className="ce-kpi-n">{kpis.realises}</span>
          <span className="ce-kpi-l">Réalisés</span>
        </button>
        {kpis.enRetard > 0 ? (
          <button
            type="button"
            className={`ce-kpi-card ce-kpi-retard${filtre === 'en_retard' ? ' on' : ''}`}
            onClick={() => setFiltre('en_retard')}
          >
            <span className="ce-kpi-n">{kpis.enRetard}</span>
            <span className="ce-kpi-l">En retard</span>
          </button>
        ) : null}
      </div>

      <div className="ce-toolbar">
        <input
          type="search"
          className="ce-search"
          placeholder="Immeuble, adresse, syndic…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Rechercher un contrat"
        />
        <select
          value={filtre}
          onChange={(e) => setFiltre(e.target.value as FiltreStatut)}
          aria-label="Filtrer par statut"
        >
          <option value="exercice">Tous les statuts</option>
          <option value="a_programmer">À programmer</option>
          <option value="programme">Programmé</option>
          <option value="hors_mois">Hors mois contractuel</option>
          <option value="en_retard">En retard</option>
          <option value="realise">Réalisé</option>
        </select>
        <select
          value={filtreMois === 'tous' ? 'tous' : String(filtreMois)}
          onChange={(e) =>
            setFiltreMois(e.target.value === 'tous' ? 'tous' : Number(e.target.value))
          }
          aria-label="Filtrer par mois"
        >
          <option value="tous">Tous les mois</option>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i} value={i}>
              {labelMoisContractuel(i)}
            </option>
          ))}
        </select>
        <select
          value={filtreSyndic}
          onChange={(e) => setFiltreSyndic(e.target.value)}
          aria-label="Filtrer par syndic"
        >
          <option value="tous">Tous les syndics</option>
          {syndics.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn-note"
          onClick={() => void genererExercice()}
          disabled={busy}
        >
          Lier exercice
        </button>
      </div>

      <div className="ce-list">
        {groups.map((g) => (
          <section key={g.mois} className="ce-month-group">
            <header className="ce-month-head">
              <strong>{labelMoisContractuel(g.mois)}</strong>
              <span>
                {g.rows.length} contrat{g.rows.length > 1 ? 's' : ''}
              </span>
              <span className="ce-month-ht">{eur(g.montant)}</span>
            </header>

            {/* Desktop table */}
            <div className="ce-table-wrap desk-only">
              <table className="ce-table">
                <thead>
                  <tr>
                    <th>Immeuble</th>
                    <th>Syndic</th>
                    <th>Mois</th>
                    <th>Date prog.</th>
                    <th className="num">Comp.</th>
                    <th className="num">Montant HT</th>
                    <th>Statut</th>
                    <th className="ce-actions-col" />
                  </tr>
                </thead>
                <tbody>
                  {g.rows.map((c) => (
                    <tr
                      key={c.id}
                      className={`ce-row${c.statut.cle === 'en_retard' ? ' late' : ''}`}
                      onClick={() => c.affaire && void openAffaire(c.affaire.id, 'taches')}
                    >
                      <td>
                        <strong className="ce-immeuble">{c.immeuble}</strong>
                        {c.affaire ? (
                          <small className="ce-devis">{c.affaire.numeroDevis}</small>
                        ) : null}
                      </td>
                      <td>{c.syndic}</td>
                      <td>{labelMoisContractuel(c.moisContractuel)}</td>
                      <td className="mono">
                        {c.datePosee ? formatDateFr(c.datePosee) : '—'}
                      </td>
                      <td className="num mono">{c.nbCompagnons}</td>
                      <td className="num mono">{eur(c.montantHt)}</td>
                      <td>
                        <CeStatutPill statut={c.statut} />
                      </td>
                      <td className="ce-actions-col" onClick={(e) => e.stopPropagation()}>
                        <div className="ce-row-actions">
                          {c.affaire ? (
                            <>
                              <button
                                type="button"
                                className="btn-edit"
                                onClick={() => void openAffaire(c.affaire!.id, 'plan')}
                              >
                                Programmer
                              </button>
                              <button
                                type="button"
                                className="btn-note"
                                onClick={() => void openAffaire(c.affaire!.id, 'taches')}
                              >
                                Fiche
                              </button>
                            </>
                          ) : (
                            <span className="hint">Pas d’affaire</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="ce-cards mobile-only">
              {g.rows.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className="ce-card"
                    onClick={() => c.affaire && void openAffaire(c.affaire.id, 'plan')}
                  >
                    <div className="ce-card-top">
                      <strong>{c.immeuble}</strong>
                      <CeStatutPill statut={c.statut} />
                    </div>
                    <span className="ce-card-sub">{c.syndic}</span>
                    <span className="ce-card-meta">
                      {c.datePosee ? formatDateFr(c.datePosee) : 'Non programmé'}
                      {' · '}
                      {c.nbCompagnons} compagnon{c.nbCompagnons > 1 ? 's' : ''}
                      {' · '}
                      {eur(c.montantHt)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {!rows.length ? (
          <p className="hint" style={{ padding: 16 }}>
            Aucun contrat pour ces filtres.
          </p>
        ) : null}
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
          initialTab={initialTab}
        />
      ) : null}
    </>
  );
}
