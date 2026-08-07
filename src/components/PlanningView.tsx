'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Slot = {
  id: string;
  type: string;
  label: string | null;
  affaire?: { client: string; numeroDevis: string; adresse: string } | null;
};

type EquipeRow = {
  id: string;
  nom: string;
  days: { date: string; label: string; slots: Slot[] }[];
};

export function PlanningView({
  equipes,
  jours,
}: {
  equipes: EquipeRow[];
  jours: string[];
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

  return (
    <>
      <p className="hint" style={{ marginBottom: 12 }}>
        Semaine du 10 au 14 août 2026. Les tâches datées se posent toutes seules dans la semaine, à
        côté des interventions. Glisser-déposer pour déplacer.
      </p>
      <div className="plan-wrap">
        <table className="plan">
          <thead>
            <tr>
              <th className="eq">Équipe</th>
              {jours.map((j) => (
                <th key={j}>{j}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {equipes.map((e) => (
              <tr key={e.id}>
                <td className="eq">{e.nom}</td>
                {e.days.map((day) => (
                  <td
                    key={day.date}
                    onDragOver={(ev) => ev.preventDefault()}
                    onDrop={() => onDrop(e.id, day.date)}
                  >
                    {day.slots.map((b) => {
                      if (b.type === 'tache') {
                        return (
                          <div
                            key={b.id}
                            className="blk task n3"
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
                            <b>{b.label}</b>
                          </div>
                        );
                      }
                      const client = b.affaire?.client ?? b.label?.split('·')[0]?.trim() ?? '';
                      const adr =
                        b.affaire?.adresse?.split(',')[0] ??
                        b.label?.split('·')[1]?.trim() ??
                        '';
                      return (
                        <div
                          key={b.id}
                          className={`blk${b.type === 'ce' ? ' ce' : ''}`}
                          draggable
                          onDragStart={() => setDrag({ slotId: b.id })}
                        >
                          <b>{client}</b>
                          {adr}
                          <small>
                            devis {b.affaire?.numeroDevis ?? (b.type === 'ce' ? 'CE' : '—')}
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
          Chantier
        </span>
        <span>
          <i style={{ background: '#E4ECF4', borderLeft: '3px solid var(--bleu)' }} />
          Contrat d&apos;entretien
        </span>
        <span>
          <i style={{ background: '#FCF3D8', borderLeft: '3px solid var(--postit-dark)' }} />
          Tâche à faire
        </span>
        <span>
          <i style={{ background: '#F8E7E1', borderLeft: '3px solid var(--flamme)' }} />
          Tâche urgente
        </span>
        <span>
          <i style={{ background: '#EEEFEC', borderLeft: '3px solid #B4BAB3' }} />
          Absent / congés / férié
        </span>
      </div>
    </>
  );
}
