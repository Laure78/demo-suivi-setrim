'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { daysLate, formatDateShort, NIVEAU_LABEL } from '@/lib/format';
import { AIDES } from '@/lib/aides';
import { AideLabel } from '@/components/AideTip';

export type PostitTache = {
  id: string;
  titre: string;
  niveau: number;
  dateEcheance: string;
  fait: boolean;
  libelle: string;
  affaireId?: string | null;
};

export type ChantierDuJour = {
  id: string;
  titre: string;
  detail: string;
  ce?: boolean;
  affaireId?: string | null;
  numeroDevis?: string | null;
};

function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function TodayWall({
  taches,
  userName,
  userRole,
  meId,
  chantiers,
}: {
  taches: PostitTache[];
  userName: string;
  userRole: string;
  meId: string;
  chantiers: ChantierDuJour[];
}) {
  const router = useRouter();
  const [gone, setGone] = useState<Record<string, boolean>>({});
  const [titre, setTitre] = useState('');
  const [niveau, setNiveau] = useState(2);
  const [echeance, setEcheance] = useState(todayIso);
  const [affaireId, setAffaireId] = useState('');
  const [affaires, setAffaires] = useState<
    { id: string; numeroDevis: string; client: string; adresse: string }[]
  >([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const mine = taches
    .filter((t) => !t.fait && !gone[t.id])
    .sort((a, b) => {
      if (b.niveau !== a.niveau) return b.niveau - a.niveau;
      return new Date(a.dateEcheance).getTime() - new Date(b.dateEcheance).getTime();
    });
  const done = taches.filter((t) => t.fait);

  useEffect(() => {
    fetch('/api/affaires/liste')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.affaires) setAffaires(j.affaires);
      })
      .catch(() => {});
  }, []);

  async function check(id: string) {
    setGone((g) => ({ ...g, [id]: true }));
    await fetch(`/api/taches/${id}/toggle`, { method: 'POST' });
    setTimeout(() => router.refresh(), 340);
  }

  async function addTask(e?: React.FormEvent) {
    e?.preventDefault();
    const v = titre.trim();
    if (!v) {
      setErr('Indiquez le titre de la tâche.');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      const aff = affaires.find((a) => a.id === affaireId);
      const r = await fetch('/api/taches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titre: v,
          niveau,
          dateEcheance: echeance,
          responsableId: meId,
          affaireId: affaireId || null,
          libelleAffaire: aff ? `${aff.client} · ${aff.adresse.split(',')[0]}` : null,
        }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setErr(j.error ?? 'Impossible d’ajouter');
        return;
      }
      setTitre('');
      setNiveau(2);
      setEcheance(todayIso());
      setAffaireId('');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function portefeuilleHref(c: ChantierDuJour) {
    if (c.affaireId) return `/portefeuille?affaire=${encodeURIComponent(c.affaireId)}`;
    if (c.numeroDevis) return `/portefeuille?devis=${encodeURIComponent(c.numeroDevis)}`;
    return '/portefeuille';
  }

  return (
    <>
      <div className="sec-head">
        <AideLabel aide={AIDES.tachesJour}>
          <span className="eyebrow">
            Tâches à faire — {userName}, {userRole}
          </span>
        </AideLabel>
      </div>

      <form className="today-add-task" onSubmit={(e) => void addTask(e)}>
        <AideLabel aide={AIDES.nouvelleTache}>
          <p className="eyebrow" style={{ margin: 0 }}>
            Nouvelle tâche
          </p>
        </AideLabel>
        <input
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          placeholder="Ex. rappeler le syndic, commander la benne…"
          aria-label="Titre de la tâche"
        />
        <div className="today-add-meta">
          <label>
            Échéance
            <input
              type="date"
              value={echeance}
              onChange={(e) => setEcheance(e.target.value)}
              required
            />
          </label>
          <label>
            Urgence
            <select value={niveau} onChange={(e) => setNiveau(Number(e.target.value))}>
              <option value={3}>Urgent (rouge)</option>
              <option value={2}>À faire (jaune)</option>
              <option value={1}>Info (gris)</option>
            </select>
          </label>
          <label>
            Affaire (optionnel)
            <select value={affaireId} onChange={(e) => setAffaireId(e.target.value)}>
              <option value="">— aucune —</option>
              {affaires.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.numeroDevis} · {a.client}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? '…' : 'Ajouter'}
          </button>
        </div>
        {err ? <p className="hint" style={{ color: 'var(--flamme)', margin: 0 }}>{err}</p> : null}
      </form>

      <div className="wall" style={{ marginTop: 18 }}>
        {mine.length === 0 ? (
          <div className="card" style={{ padding: 26, gridColumn: '1 / -1' }}>
            <div className="eyebrow">Rien en attente</div>
            <p style={{ marginTop: 6 }}>
              Aucune tâche à faire pour {userName}. Ajoutez-en une ci-dessus.
            </p>
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
                  <span className="pi-late">EN RETARD · {late} j</span>
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
        <AideLabel aide={AIDES.chantiersJour}>
          <span className="eyebrow">Les chantiers du jour</span>
        </AideLabel>
      </div>
      <p className="hint" style={{ marginBottom: 10 }}>
        Cliquez un chantier pour ouvrir l&apos;affaire dans le portefeuille.
      </p>
      <div className="today-jobs">
        {chantiers.map((c) => (
          <Link
            key={c.id}
            href={portefeuilleHref(c)}
            className={`card job job-link${c.ce ? ' ce' : ''}`}
          >
            <h4>{c.titre}</h4>
            <p>{c.detail}</p>
            <span className="job-go">Voir dans le portefeuille →</span>
          </Link>
        ))}
      </div>
    </>
  );
}
