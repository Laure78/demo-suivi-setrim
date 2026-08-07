'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { daysLate, formatDateShort, NIVEAU_LABEL } from '@/lib/format';

export type PostitTache = {
  id: string;
  titre: string;
  niveau: number;
  dateEcheance: string;
  fait: boolean;
  libelle: string;
};

export function TodayWall({
  taches,
  userName,
  userRole,
  chantiers,
}: {
  taches: PostitTache[];
  userName: string;
  userRole: string;
  chantiers: { titre: string; detail: string; ce?: boolean }[];
}) {
  const router = useRouter();
  const [gone, setGone] = useState<Record<string, boolean>>({});
  const mine = taches.filter((t) => !t.fait && !gone[t.id]);
  const done = taches.filter((t) => t.fait);

  async function check(id: string) {
    setGone((g) => ({ ...g, [id]: true }));
    await fetch(`/api/taches/${id}/toggle`, { method: 'POST' });
    setTimeout(() => router.refresh(), 340);
  }

  return (
    <>
      <div className="sec-head">
        <span className="eyebrow">
          Vos alertes — {userName}, {userRole}
        </span>
      </div>
      <p className="hint">
        Un post-it = une tâche. Tant que la case n&apos;est pas cochée, la notification revient tous
        les jours sur le téléphone et sur l&apos;ordinateur. Rouge = urgent, jaune = à faire, gris =
        information.
      </p>
      <div className="wall" style={{ marginTop: 14 }}>
        {mine.length === 0 ? (
          <div className="card" style={{ padding: 26, gridColumn: '1 / -1' }}>
            <div className="eyebrow">Rien en attente</div>
            <p style={{ marginTop: 6 }}>Aucune alerte pour {userName}. Tout est coché.</p>
          </div>
        ) : (
          mine.map((t) => {
            const late = daysLate(new Date(t.dateEcheance));
            return (
              <div
                key={t.id}
                className={`postit n${t.niveau}${gone[t.id] ? ' gone' : ''}`}
              >
                {late > 0 ? (
                  <span className="pi-late">
                    EN RETARD · {late} j
                  </span>
                ) : null}
                <div className="pi-aff">{t.libelle}</div>
                <div className="pi-title">{t.titre}</div>
                <div className="pi-meta">
                  <span className="mono">Échéance {formatDateShort(t.dateEcheance)}</span>
                  <span>{NIVEAU_LABEL[t.niveau] ?? 'À faire'}</span>
                </div>
                <button type="button" className="pi-check" onClick={() => check(t.id)}>
                  <span className="box" /> C&apos;est fait
                </button>
              </div>
            );
          })
        )}
      </div>
      {done.length > 0 ? (
        <div className="done-strip">
          {done.map((t) => (
            <span className="d" key={t.id}>
              {t.titre}
            </span>
          ))}
        </div>
      ) : null}

      <div className="sec-head">
        <span className="eyebrow">Les chantiers du jour</span>
      </div>
      <div className="today-jobs">
        {chantiers.map((c) => (
          <div key={c.titre} className={`card job${c.ce ? ' ce' : ''}`}>
            <h4>{c.titre}</h4>
            <p>{c.detail}</p>
          </div>
        ))}
      </div>
    </>
  );
}
