'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { MOIS_FR } from '@/lib/planning';

type Slot = {
  id: string;
  type: string;
  label: string | null;
  affaire?: { client: string; numeroDevis: string; adresse: string } | null;
};

type EquipeRow = {
  id: string;
  nom: string;
  categorie: string;
  days: { date: string; day: number; weekend: boolean; ferie: boolean; slots: Slot[] }[];
};

export function PlanningView({
  equipes,
  year,
  month,
}: {
  equipes: EquipeRow[];
  year: number;
  month: number; // 0-11
}) {
  const router = useRouter();
  const [drag, setDrag] = useState<{ slotId: string } | null>(null);

  async function onDrop(equipeId: string, date: string) {
    if (!drag) return;
    await fetch('/api/planning/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slotId: drag.slotId, equipeId, date }),
    });
    setDrag(null);
    router.refresh();
  }

  const prev = month === 0 ? { y: year - 1, m: 11 } : { y: year, m: month - 1 };
  const next = month === 11 ? { y: year + 1, m: 0 } : { y: year, m: month + 1 };
  const jours = equipes[0]?.days ?? [];

  return (
    <>
      <div className="plan-toolbar">
        <div className="plan-nav">
          <Link
            href={`/planning?annee=${prev.y}&mois=${prev.m + 1}`}
            className="btn-note"
          >
            ← {MOIS_FR[prev.m]}
          </Link>
          <h3 className="plan-month-title">
            {MOIS_FR[month]} <span className="mono">{year}</span>
          </h3>
          <Link
            href={`/planning?annee=${next.y}&mois=${next.m + 1}`}
            className="btn-note"
          >
            {MOIS_FR[next.m]} →
          </Link>
        </div>
        <div className="plan-year-pills">
          {[year - 1, year, year + 1].map((y) => (
            <Link
              key={y}
              href={`/planning?annee=${y}&mois=${month + 1}`}
              className={`plan-year-pill${y === year ? ' on' : ''}`}
            >
              {y}
            </Link>
          ))}
        </div>
      </div>

      <p className="hint" style={{ marginBottom: 12 }}>
        Planning année civile — un jour = une colonne. Chaque case indique l&apos;adresse du chantier
        ou l&apos;absence. En bas : les 2 prestataires (échafaudage, bennes). Glisser-déposer pour
        déplacer.
      </p>

      <div className="plan-mois-tabs">
        {MOIS_FR.map((label, i) => (
          <Link
            key={label}
            href={`/planning?annee=${year}&mois=${i + 1}`}
            className={i === month ? 'on' : ''}
          >
            {label.slice(0, 3)}.
          </Link>
        ))}
      </div>

      <div className="plan-wrap plan-year">
        <table className="plan plan-civil">
          <thead>
            <tr>
              <th className="eq">Équipe / prestataire</th>
              {jours.map((j) => (
                <th
                  key={j.date}
                  className={`${j.weekend ? 'we' : ''}${j.ferie ? ' ferie' : ''}`}
                >
                  <span className="d-num">{j.day}</span>
                  <span className="d-wd">
                    {new Date(j.date + 'T12:00:00Z').toLocaleDateString('fr-FR', {
                      weekday: 'narrow',
                      timeZone: 'UTC',
                    })}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {equipes.map((e) => (
              <tr key={e.id} className={e.categorie === 'prestataire' ? 'presta' : ''}>
                <td className="eq">
                  {e.categorie === 'prestataire' ? (
                    <span className="presta-tag">Prestataire</span>
                  ) : null}
                  {e.nom.replace(/^Prestataire — /, '')}
                </td>
                {e.days.map((day) => (
                  <td
                    key={day.date}
                    className={`${day.weekend ? 'we' : ''}${day.ferie ? ' ferie' : ''}`}
                    onDragOver={(ev) => ev.preventDefault()}
                    onDrop={() => onDrop(e.id, day.date)}
                  >
                    {day.ferie && day.slots.length === 0 ? (
                      <div className="blk abs">
                        <b>FÉRIÉ</b>
                      </div>
                    ) : null}
                    {day.slots.map((b) => {
                      if (b.type === 'tache') {
                        return (
                          <div
                            key={b.id}
                            className="blk task"
                            draggable
                            onDragStart={() => setDrag({ slotId: b.id })}
                          >
                            <b>{b.label}</b>
                            <small>tâche</small>
                          </div>
                        );
                      }
                      if (b.type === 'absent') {
                        return (
                          <div key={b.id} className="blk abs">
                            <b>{b.label || 'ABSENT'}</b>
                            <small>absence</small>
                          </div>
                        );
                      }
                      const client =
                        b.affaire?.client ?? b.label?.split('·')[0]?.trim() ?? '';
                      const adresse =
                        b.affaire?.adresse ??
                        b.label?.split('·').slice(1).join('·').trim() ??
                        '';
                      return (
                        <div
                          key={b.id}
                          className={`blk${b.type === 'ce' ? ' ce' : ''}${b.type === 'presta' ? ' presta-blk' : ''}`}
                          draggable
                          onDragStart={() => setDrag({ slotId: b.id })}
                          title={adresse}
                        >
                          <b>{client}</b>
                          {adresse ? <span className="adr-plan">{adresse}</span> : null}
                          <small>
                            {b.affaire?.numeroDevis
                              ? `devis ${b.affaire.numeroDevis}`
                              : b.type === 'ce'
                                ? 'CE'
                                : b.type === 'presta'
                                  ? 'presta'
                                  : ''}
                          </small>
                        </div>
                      );
                    })}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="legend">
        <span>
          <i style={{ background: '#E2EFE7', borderLeft: '3px solid var(--vert)' }} />
          Chantier + adresse
        </span>
        <span>
          <i style={{ background: '#E4ECF4', borderLeft: '3px solid var(--bleu)' }} />
          Contrat d&apos;entretien
        </span>
        <span>
          <i style={{ background: '#F3E8F7', borderLeft: '3px solid #7B4B9A' }} />
          Prestataire
        </span>
        <span>
          <i style={{ background: '#FCF3D8', borderLeft: '3px solid var(--postit-dark)' }} />
          Tâche
        </span>
        <span>
          <i style={{ background: '#EEEFEC', borderLeft: '3px solid #B4BAB3' }} />
          Absence / congés / férié
        </span>
      </div>
    </>
  );
}
