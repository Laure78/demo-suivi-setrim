'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AffaireSheet, type AffaireDetail } from '@/components/AffaireSheet';
import type { EquipeRowInput, PlanningEvent } from '@/lib/planning/toCalendarEvents';
import { toIsoDay } from '@/lib/planning/dates';

const SLOT_TYPES = [
  { value: 'chantier', label: 'Chantier' },
  { value: 'ce', label: "Contrat d'entretien" },
  { value: 'presta', label: 'Prestataire' },
  { value: 'absent', label: 'Absence / congés' },
  { value: 'task', label: 'Tâche' },
] as const;

type Mode =
  | { kind: 'create'; equipeId: string; date: string }
  | { kind: 'edit'; event: PlanningEvent };

export function EventDetailPanel({
  mode,
  equipes,
  onClose,
}: {
  mode: Mode;
  equipes: EquipeRowInput[];
  onClose: () => void;
}) {
  const router = useRouter();
  const isCreate = mode.kind === 'create';
  const ev = mode.kind === 'edit' ? mode.event : null;
  const raw = (ev?.raw ?? null) as {
    slot?: { type?: string; label?: string | null; affaireId?: string | null };
    equipe?: { id: string };
    day?: { date: string };
  } | null;

  const [form, setForm] = useState({
    type: isCreate ? 'chantier' : (raw?.slot?.type ?? 'chantier'),
    label: isCreate ? '' : (raw?.slot?.label ?? ev?.title ?? ''),
    equipeId: isCreate ? mode.equipeId : (ev?.resourceId ?? ''),
    date: isCreate ? mode.date : toIsoDay(ev!.start),
  });
  const [affairePick, setAffairePick] = useState(
    isCreate ? '' : (ev?.affaireId ?? raw?.slot?.affaireId ?? ''),
  );
  const [affaires, setAffaires] = useState<
    { id: string; numeroDevis: string; client: string; adresse: string }[]
  >([]);
  const [busy, setBusy] = useState(false);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AffaireDetail | null>(null);

  const readOnly = !!ev && (ev.id.startsWith('tache-') || ev.sourceType === 'ferie');

  useEffect(() => {
    fetch('/api/affaires/liste')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.affaires) setAffaires(j.affaires);
      })
      .catch(() => {});
  }, []);

  async function save() {
    if (readOnly) return;
    setBusy(true);
    try {
      if (isCreate) {
        await fetch('/api/planning/slots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            equipeId: form.equipeId,
            date: form.date,
            type: form.type,
            label: form.label || null,
            affaireId: affairePick || null,
          }),
        });
      } else if (ev) {
        await fetch('/api/planning/slots', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: ev.id,
            equipeId: form.equipeId,
            date: form.date,
            type: form.type,
            label: form.label,
            affaireId: affairePick || null,
          }),
        });
      }
      onClose();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!ev || readOnly) return;
    if (!confirm('Supprimer ce créneau du planning ?')) return;
    setBusy(true);
    try {
      await fetch('/api/planning/slots', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ev.id }),
      });
      onClose();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function openAffaire(id: string) {
    setSheetId(id);
    setDetail(null);
    const r = await fetch(`/api/affaires/${id}`);
    if (r.ok) setDetail(await r.json());
  }

  return (
    <>
      <div className="scrim on" onClick={onClose} />
      <div className="sheet open plan-edit-sheet">
        <div className="sheet-head">
          <button type="button" className="sheet-close" onClick={onClose}>
            ✕
          </button>
          <span className="eyebrow">Planning</span>
          <h3>{isCreate ? 'Ajouter un créneau' : readOnly ? 'Détail' : 'Modifier le créneau'}</h3>
        </div>
        <div className="sheet-body">
          {readOnly ? (
            <>
              <dl className="kv">
                <dt>Titre</dt>
                <dd>{ev?.title}</dd>
                <dt>Type</dt>
                <dd>{ev?.sourceType}</dd>
                <dt>Équipe</dt>
                <dd>{ev?.resourceName ?? '—'}</dd>
                <dt>Date</dt>
                <dd>{form.date}</dd>
              </dl>
              {ev?.affaireId ? (
                <button
                  type="button"
                  className="btn-note"
                  style={{ marginTop: 12 }}
                  onClick={() => void openAffaire(ev.affaireId!)}
                >
                  Ouvrir l&apos;affaire
                </button>
              ) : null}
            </>
          ) : (
            <form
              className="edit-affaire-form"
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
            >
              <label>
                Type
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  {SLOT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Libellé (client · adresse)
                <input
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="ex. SIMMONET · 66 Bd Jean Jaurès"
                />
              </label>
              <label>
                Équipe / prestataire
                <select
                  value={form.equipeId}
                  onChange={(e) => setForm({ ...form, equipeId: e.target.value })}
                >
                  {equipes.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.nom}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Date
                <input
                  type="date"
                  value={form.date.slice(0, 10)}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </label>
              <label>
                Lier à une affaire
                <select
                  value={affairePick}
                  onChange={(e) => {
                    setAffairePick(e.target.value);
                    const aff = affaires.find((x) => x.id === e.target.value);
                    if (aff && !form.label) {
                      setForm({ ...form, label: `${aff.client} · ${aff.adresse}` });
                    }
                  }}
                >
                  <option value="">— aucune —</option>
                  {affaires.map((aff) => (
                    <option key={aff.id} value={aff.id}>
                      {aff.numeroDevis} · {aff.client}
                    </option>
                  ))}
                </select>
              </label>
              <div className="edit-row" style={{ marginTop: 12 }}>
                <button type="submit" className="btn-primary" disabled={busy}>
                  {busy ? '…' : 'Enregistrer'}
                </button>
                {!isCreate ? (
                  <button
                    type="button"
                    className="btn-note"
                    style={{ color: 'var(--flamme)' }}
                    onClick={() => void remove()}
                    disabled={busy}
                  >
                    Supprimer
                  </button>
                ) : null}
                {affairePick ? (
                  <button
                    type="button"
                    className="btn-note"
                    onClick={() => void openAffaire(affairePick)}
                  >
                    Ouvrir l&apos;affaire
                  </button>
                ) : null}
              </div>
            </form>
          )}
        </div>
      </div>
      {sheetId ? (
        <AffaireSheet
          detail={detail}
          onClose={() => {
            setSheetId(null);
            setDetail(null);
            router.refresh();
          }}
          onRefresh={async () => {
            const r = await fetch(`/api/affaires/${sheetId}`);
            if (r.ok) setDetail(await r.json());
            router.refresh();
          }}
        />
      ) : null}
    </>
  );
}
