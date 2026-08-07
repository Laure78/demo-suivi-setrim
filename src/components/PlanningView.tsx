'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MOIS_FR } from '@/lib/planning';
import { AffaireSheet, type AffaireDetail } from '@/components/AffaireSheet';

type Slot = {
  id: string;
  type: string;
  label: string | null;
  affaireId?: string | null;
  affaire?: {
    id?: string;
    client: string;
    numeroDevis: string;
    adresse: string;
  } | null;
};

type EquipeRow = {
  id: string;
  nom: string;
  categorie: string;
  days: { date: string; day: number; weekend: boolean; ferie: boolean; slots: Slot[] }[];
};

type EditorState =
  | { mode: 'create'; equipeId: string; date: string }
  | {
      mode: 'edit';
      id: string;
      equipeId: string;
      date: string;
      type: string;
      label: string;
      affaireId: string | null;
      affaireNumero?: string;
    };

const SLOT_TYPES = [
  { value: 'chantier', label: 'Chantier' },
  { value: 'ce', label: "Contrat d'entretien" },
  { value: 'presta', label: 'Prestataire' },
  { value: 'absent', label: 'Absence / congés' },
  { value: 'task', label: 'Tâche' },
] as const;

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
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [form, setForm] = useState({
    type: 'chantier',
    label: '',
    equipeId: '',
    date: '',
  });
  const [busy, setBusy] = useState(false);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AffaireDetail | null>(null);
  const [affaires, setAffaires] = useState<
    { id: string; numeroDevis: string; client: string; adresse: string }[]
  >([]);
  const [affairePick, setAffairePick] = useState('');

  useEffect(() => {
    if (!editor) return;
    fetch('/api/affaires/liste')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.affaires) setAffaires(j.affaires);
      })
      .catch(() => {});
  }, [editor]);

  async function openAffaire(id: string) {
    setSheetId(id);
    setDetail(null);
    const r = await fetch(`/api/affaires/${id}`);
    if (r.ok) setDetail(await r.json());
  }

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

  function openCreate(equipeId: string, date: string) {
    setEditor({ mode: 'create', equipeId, date });
    setForm({ type: 'chantier', label: '', equipeId, date });
    setAffairePick('');
  }

  function openEdit(slot: Slot, equipeId: string, date: string) {
    if (slot.id.startsWith('tache-')) return;
    setEditor({
      mode: 'edit',
      id: slot.id,
      equipeId,
      date,
      type: slot.type,
      label: slot.label ?? '',
      affaireId: slot.affaireId ?? slot.affaire?.id ?? null,
      affaireNumero: slot.affaire?.numeroDevis,
    });
    setForm({
      type: slot.type,
      label: slot.label ?? '',
      equipeId,
      date,
    });
    setAffairePick(slot.affaireId ?? slot.affaire?.id ?? '');
  }

  async function saveSlot() {
    if (!editor) return;
    setBusy(true);
    try {
      if (editor.mode === 'create') {
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
      } else {
        await fetch('/api/planning/slots', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editor.id,
            equipeId: form.equipeId,
            date: form.date,
            type: form.type,
            label: form.label,
            affaireId: affairePick || null,
          }),
        });
      }
      setEditor(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function deleteSlot() {
    if (!editor || editor.mode !== 'edit') return;
    if (!confirm('Supprimer ce créneau du planning ?')) return;
    setBusy(true);
    try {
      await fetch('/api/planning/slots', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editor.id }),
      });
      setEditor(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
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
        Semaine ouvrée uniquement (lundi → vendredi). Cliquez <b>✎</b> sur un créneau pour le
        modifier, ou <b>+</b> dans une case pour en ajouter un. Glisser-déposer pour déplacer. Les
        chantiers du portefeuille (programmés / en cours) s&apos;y posent aussi automatiquement.
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
                  {e.nom}
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
                          <div key={b.id} className="blk abs blk-editable">
                            <button
                              type="button"
                              className="blk-edit"
                              title="Modifier"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                openEdit(b, e.id, day.date);
                              }}
                            >
                              ✎
                            </button>
                            <b
                              onClick={() => openEdit(b, e.id, day.date)}
                              role="button"
                              tabIndex={0}
                            >
                              {b.label || 'ABSENT'}
                            </b>
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
                      const affId = b.affaireId ?? b.affaire?.id;
                      return (
                        <div
                          key={b.id}
                          className={`blk blk-editable${b.type === 'ce' ? ' ce' : ''}${b.type === 'presta' ? ' presta-blk' : ''}`}
                          draggable
                          onDragStart={() => setDrag({ slotId: b.id })}
                          title={adresse}
                        >
                          <button
                            type="button"
                            className="blk-edit"
                            title="Modifier le créneau"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              openEdit(b, e.id, day.date);
                            }}
                          >
                            ✎
                          </button>
                          <b
                            onClick={() => openEdit(b, e.id, day.date)}
                            role="button"
                            tabIndex={0}
                          >
                            {client}
                          </b>
                          {adresse ? <span className="adr-plan">{adresse}</span> : null}
                          <small>
                            {b.affaire?.numeroDevis
                              ? `devis ${b.affaire.numeroDevis}`
                              : b.type === 'ce'
                                ? 'CE'
                                : b.type === 'presta'
                                  ? 'presta'
                                  : ''}
                            {affId ? (
                              <>
                                {' · '}
                                <button
                                  type="button"
                                  className="linkish"
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    void openAffaire(affId);
                                  }}
                                >
                                  affaire
                                </button>
                              </>
                            ) : null}
                          </small>
                        </div>
                      );
                    })}
                    {!day.weekend ? (
                      <button
                        type="button"
                        className="cell-add"
                        title="Ajouter un créneau"
                        onClick={() => openCreate(e.id, day.date)}
                      >
                        +
                      </button>
                    ) : null}
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

      {editor ? (
        <>
          <div className="scrim on" onClick={() => setEditor(null)} />
          <div className="sheet open plan-edit-sheet">
            <div className="sheet-head">
              <button type="button" className="sheet-close" onClick={() => setEditor(null)}>
                ✕
              </button>
              <span className="eyebrow">Planning</span>
              <h3>{editor.mode === 'create' ? 'Ajouter un créneau' : 'Modifier le créneau'}</h3>
            </div>
            <div className="sheet-body">
              <form
                className="edit-affaire-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void saveSlot();
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
                  Lier à une affaire (portefeuille)
                  <select
                    value={affairePick}
                    onChange={(e) => {
                      setAffairePick(e.target.value);
                      const aff = affaires.find((x) => x.id === e.target.value);
                      if (aff && !form.label) {
                        setForm({
                          ...form,
                          label: `${aff.client} · ${aff.adresse}`,
                        });
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
                  {editor.mode === 'edit' ? (
                    <button
                      type="button"
                      className="btn-note"
                      style={{ color: 'var(--flamme)' }}
                      onClick={() => void deleteSlot()}
                      disabled={busy}
                    >
                      Supprimer
                    </button>
                  ) : null}
                  {editor.mode === 'edit' && affairePick ? (
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
            </div>
          </div>
        </>
      ) : null}

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
