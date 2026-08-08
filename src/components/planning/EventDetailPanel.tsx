'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AffaireSheet, type AffaireDetail } from '@/components/AffaireSheet';
import type { EquipeRowInput, PlanningEvent } from '@/lib/planning/toCalendarEvents';
import { toIsoDay } from '@/lib/planning/dates';
import { AideTip } from '@/components/AideTip';
import { AIDES } from '@/lib/aides';

const SLOT_TYPES = [
  { value: 'chantier', label: 'Chantier' },
  { value: 'ce', label: "Contrat d'entretien" },
  { value: 'presta', label: 'Prestataire' },
  { value: 'absent', label: 'Absence / congés' },
  { value: 'tache', label: 'Tâche à faire (post-it)' },
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
    slot?: {
      type?: string;
      label?: string | null;
      affaireId?: string | null;
      niveau?: number;
    };
    equipe?: { id: string };
    day?: { date: string };
  } | null;

  const initialType = isCreate
    ? 'tache'
    : mapUiType(raw?.slot?.type ?? ev?.sourceType ?? 'chantier');
  const isTacheEvent = !!ev && (ev.id.startsWith('tache-') || ev.sourceType === 'tache');
  const readOnlySlot = !!ev && ev.sourceType === 'ferie';

  const [form, setForm] = useState({
    type: initialType,
    label: isCreate ? '' : (raw?.slot?.label ?? ev?.title ?? ''),
    equipeId: isCreate ? mode.equipeId : (ev?.resourceId ?? ''),
    date: isCreate ? mode.date : toIsoDay(ev!.start),
  });
  const [taskNiveau, setTaskNiveau] = useState(raw?.slot?.niveau ?? 2);
  const [taskResp, setTaskResp] = useState('');
  const [bureau, setBureau] = useState<{ id: string; nom: string }[]>([]);
  const [affairePick, setAffairePick] = useState(
    isCreate ? '' : (ev?.affaireId ?? raw?.slot?.affaireId ?? ''),
  );
  const [affaires, setAffaires] = useState<
    { id: string; numeroDevis: string; client: string; adresse: string }[]
  >([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AffaireDetail | null>(null);

  const isTaskForm = form.type === 'tache';

  useEffect(() => {
    fetch('/api/affaires/liste')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.affaires) setAffaires(j.affaires);
      })
      .catch(() => {});
    fetch('/api/collaborateurs')
      .then((r) => (r.ok ? r.json() : []))
      .then((list: { id: string; nom: string; terrain?: boolean }[]) => {
        const bureauOnly = Array.isArray(list) ? list.filter((u) => !u.terrain) : [];
        const users = bureauOnly.length ? bureauOnly : Array.isArray(list) ? list : [];
        setBureau(users.map((u) => ({ id: u.id, nom: u.nom })));
        if (users[0]) setTaskResp(users[0].id);
      })
      .catch(() => {});
  }, []);

  async function save() {
    if (readOnlySlot || isTacheEvent) return;
    setBusy(true);
    setErr('');
    try {
      if (isTaskForm) {
        const titre = form.label.trim();
        if (!titre) {
          setErr('Indiquez le titre de la tâche (comme sur un post-it).');
          return;
        }
        if (!affairePick) {
          setErr('Liez la tâche à une affaire / chantier pour qu’elle apparaisse sur la fiche.');
          return;
        }
        const r = await fetch('/api/taches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            titre,
            niveau: taskNiveau,
            dateEcheance: form.date.slice(0, 10),
            responsableId: taskResp || undefined,
            affaireId: affairePick,
          }),
        });
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          setErr(j.error ?? 'Impossible de créer la tâche');
          return;
        }
      } else if (isCreate) {
        await fetch('/api/planning/slots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            equipeId: form.equipeId,
            date: form.date,
            type: form.type === 'ce' ? 'ce' : form.type,
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
            type: form.type === 'ce' ? 'ce' : form.type,
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

  async function markTacheDone() {
    if (!ev || !isTacheEvent) return;
    setBusy(true);
    try {
      await fetch(`/api/taches/${ev.sourceId}/toggle`, { method: 'POST' });
      onClose();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!ev || isTacheEvent || readOnlySlot) return;
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
          <span className="eyebrow">
            Planning{' '}
            <AideTip text={AIDES.planTache} placement="bottom" />
          </span>
          <h3>
            {isTacheEvent
              ? 'Tâche à faire'
              : isCreate
                ? isTaskForm
                  ? 'Nouvelle tâche (post-it)'
                  : 'Ajouter un créneau'
                : readOnlySlot
                  ? 'Détail'
                  : 'Modifier le créneau'}
          </h3>
        </div>
        <div className="sheet-body">
          {isTacheEvent ? (
            <>
              <p className="hint" style={{ marginBottom: 12 }}>
                Remplace le post-it papier : visible ici, sur la fiche chantier et dans
                Aujourd&apos;hui (alertes) chez le responsable.
              </p>
              <dl className="kv">
                <dt>Tâche</dt>
                <dd>{ev?.title}</dd>
                <dt>Échéance</dt>
                <dd>{form.date}</dd>
                <dt>Équipe</dt>
                <dd>{ev?.resourceName ?? '—'}</dd>
                {ev?.isAlert ? (
                  <>
                    <dt>Alerte</dt>
                    <dd>Urgent ou en retard</dd>
                  </>
                ) : null}
              </dl>
              <div className="edit-row" style={{ marginTop: 14 }}>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={busy}
                  onClick={() => void markTacheDone()}
                >
                  C&apos;est fait
                </button>
                {ev?.affaireId ? (
                  <button
                    type="button"
                    className="btn-note"
                    onClick={() => void openAffaire(ev.affaireId!)}
                  >
                    Ouvrir la fiche chantier
                  </button>
                ) : null}
              </div>
            </>
          ) : readOnlySlot ? (
            <dl className="kv">
              <dt>Titre</dt>
              <dd>{ev?.title}</dd>
              <dt>Date</dt>
              <dd>{form.date}</dd>
            </dl>
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

              {isTaskForm ? (
                <>
                  <p className="hint">
                    La tâche remplace le post-it papier : elle apparaît sur la fiche de
                    l&apos;affaire et dans les alertes Aujourd&apos;hui du responsable.
                  </p>
                  <label>
                    Titre de la tâche
                    <input
                      value={form.label}
                      onChange={(e) => setForm({ ...form, label: e.target.value })}
                      placeholder="Ex. rappeler le syndic, commander la benne…"
                      required
                    />
                  </label>
                  <label>
                    Urgence
                    <select
                      value={taskNiveau}
                      onChange={(e) => setTaskNiveau(Number(e.target.value))}
                    >
                      <option value={3}>Urgent (rouge) — alerte</option>
                      <option value={2}>À faire (jaune)</option>
                      <option value={1}>Info (gris)</option>
                    </select>
                  </label>
                  <label>
                    Responsable (bureau)
                    <select
                      value={taskResp}
                      onChange={(e) => setTaskResp(e.target.value)}
                    >
                      {bureau.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nom}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Échéance
                    <input
                      type="date"
                      value={form.date.slice(0, 10)}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      required
                    />
                  </label>
                  <label>
                    Affaire / chantier (obligatoire)
                    <select
                      value={affairePick}
                      onChange={(e) => setAffairePick(e.target.value)}
                      required
                    >
                      <option value="">— choisir —</option>
                      {affaires.map((aff) => (
                        <option key={aff.id} value={aff.id}>
                          {aff.numeroDevis} · {aff.client}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : (
                <>
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
                </>
              )}

              {err ? (
                <p className="hint" style={{ color: 'var(--flamme)', marginTop: 8 }}>
                  {err}
                </p>
              ) : null}

              <div className="edit-row" style={{ marginTop: 12 }}>
                <button type="submit" className="btn-primary" disabled={busy}>
                  {busy ? '…' : isTaskForm ? 'Créer la tâche' : 'Enregistrer'}
                </button>
                {!isCreate && !isTaskForm ? (
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

function mapUiType(t: string): string {
  if (t === 'task' || t === 'tache') return 'tache';
  if (t === 'contrat_entretien') return 'ce';
  return t;
}
