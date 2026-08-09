'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { eur, STATUT_LABEL } from '@/lib/format';
import { AIDES } from '@/lib/aides';
import { AideLabel } from '@/components/AideTip';
import { AffaireSheet, type AffaireDetail } from '@/components/AffaireSheet';

export type ClientRow = {
  id: string;
  nom: string;
  contact: string;
  telephone: string;
  email: string;
  adresse: string;
  note: string;
  nbChantiers: number;
  affaires: {
    id: string;
    numeroDevis: string;
    adresse: string;
    statut: string;
    type: string;
    montantHt: number;
  }[];
};

const EMPTY_FORM = {
  nom: '',
  contact: '',
  telephone: '',
  email: '',
  adresse: '',
  note: '',
};

export function ClientsView({ clients: initial }: { clients: ClientRow[] }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [sheet, setSheet] = useState<'new' | ClientRow | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [affaireId, setAffaireId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AffaireDetail | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return initial;
    return initial.filter(
      (c) =>
        c.nom.toLowerCase().includes(needle) ||
        c.contact.toLowerCase().includes(needle) ||
        c.telephone.includes(needle) ||
        c.email.toLowerCase().includes(needle) ||
        c.adresse.toLowerCase().includes(needle),
    );
  }, [initial, q]);

  function openNew() {
    setForm(EMPTY_FORM);
    setErr('');
    setSheet('new');
  }

  function openEdit(c: ClientRow) {
    setForm({
      nom: c.nom,
      contact: c.contact,
      telephone: c.telephone,
      email: c.email,
      adresse: c.adresse,
      note: c.note,
    });
    setErr('');
    setSheet(c);
  }

  async function save() {
    if (!form.nom.trim()) {
      setErr('Indiquez le nom du client (syndic, agence, particulier…).');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      if (sheet === 'new') {
        const r = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          setErr(j.error ?? 'Création impossible');
          return;
        }
      } else if (sheet) {
        const r = await fetch(`/api/clients/${sheet.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          setErr(j.error ?? 'Enregistrement impossible');
          return;
        }
      }
      setSheet(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove(c: ClientRow) {
    if (
      !confirm(
        c.nbChantiers
          ? `Supprimer la fiche « ${c.nom} » ? Les ${c.nbChantiers} chantier(s) resteront, sans fiche client.`
          : `Supprimer la fiche « ${c.nom} » ?`,
      )
    ) {
      return;
    }
    setBusy(true);
    await fetch(`/api/clients/${c.id}`, { method: 'DELETE' });
    setBusy(false);
    setSheet(null);
    router.refresh();
  }

  async function openAffaire(id: string) {
    setAffaireId(id);
    setDetail(null);
    const r = await fetch(`/api/affaires/${id}`);
    if (r.ok) setDetail(await r.json());
  }

  return (
    <>
      <p className="hint" style={{ marginBottom: 12 }}>
        <AideLabel aide={AIDES.clients}>
          <span>
            Fiches clients (syndics, agences, particuliers) : contact, téléphone, notes. Chaque
            chantier du portefeuille peut être rattaché à une fiche.
          </span>
        </AideLabel>
      </p>

      <div className="import-bar" style={{ marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
        <input
          type="search"
          placeholder="Rechercher un client…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ flex: '1 1 200px', minWidth: 160 }}
          aria-label="Rechercher un client"
        />
        <button type="button" className="btn-primary" onClick={openNew}>
          + Nouvelle fiche client
        </button>
      </div>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Client</th>
              <th>Contact</th>
              <th>Téléphone</th>
              <th>Chantiers</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="clickable" onClick={() => openEdit(c)}>
                <td>
                  <strong>{c.nom}</strong>
                  {c.adresse ? (
                    <small style={{ display: 'block', color: 'var(--zinc)' }}>{c.adresse}</small>
                  ) : null}
                </td>
                <td>{c.contact || '—'}</td>
                <td>
                  {c.telephone ? (
                    <a href={`tel:${c.telephone.replace(/\s/g, '')}`} onClick={(e) => e.stopPropagation()}>
                      {c.telephone}
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
                <td>
                  <span className="pill">{c.nbChantiers}</span>
                </td>
              </tr>
            ))}
            {!filtered.length ? (
              <tr>
                <td colSpan={4} className="hint">
                  Aucun client. Créez une fiche ou ouvrez le portefeuille (les noms d’affaires
                  génèrent une fiche automatiquement).
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {sheet ? (
        <>
          <div className="scrim on" onClick={() => setSheet(null)} />
          <div className="sheet open">
            <div className="sheet-head">
              <button type="button" className="sheet-close" onClick={() => setSheet(null)}>
                ✕
              </button>
              <span className="eyebrow">Fiche client</span>
              <h3>{sheet === 'new' ? 'Nouveau client' : sheet.nom}</h3>
            </div>
            <div className="sheet-body">
              <form
                className="edit-affaire-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void save();
                }}
              >
                <label>
                  Nom (syndic / agence / particulier)
                  <input
                    value={form.nom}
                    onChange={(e) => setForm({ ...form, nom: e.target.value })}
                    required
                    placeholder="ex. FONCIA, SIMMONET…"
                  />
                </label>
                <label>
                  Contact
                  <input
                    value={form.contact}
                    onChange={(e) => setForm({ ...form, contact: e.target.value })}
                    placeholder="Nom de la personne à joindre"
                  />
                </label>
                <label>
                  Téléphone
                  <input
                    value={form.telephone}
                    onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                    placeholder="01 23 45 67 89"
                  />
                </label>
                <label>
                  E-mail
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="contact@exemple.fr"
                  />
                </label>
                <label>
                  Adresse (siège / courrier)
                  <input
                    value={form.adresse}
                    onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                  />
                </label>
                <label>
                  Notes
                  <textarea
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                    rows={3}
                    placeholder="Horaires, codes, particularités…"
                  />
                </label>

                {err ? (
                  <p className="hint" style={{ color: 'var(--flamme)' }}>
                    {err}
                  </p>
                ) : null}

                <div className="edit-row" style={{ marginTop: 12 }}>
                  <button type="submit" className="btn-primary" disabled={busy}>
                    {busy ? '…' : 'Enregistrer'}
                  </button>
                  {sheet !== 'new' ? (
                    <button
                      type="button"
                      className="btn-note"
                      style={{ color: 'var(--flamme)' }}
                      disabled={busy}
                      onClick={() => void remove(sheet)}
                    >
                      Supprimer
                    </button>
                  ) : null}
                </div>
              </form>

              {sheet !== 'new' && sheet.affaires.length > 0 ? (
                <div style={{ marginTop: 22 }}>
                  <span className="eyebrow">Chantiers liés</span>
                  <ul className="client-affaires">
                    {sheet.affaires.map((a) => (
                      <li key={a.id}>
                        <button type="button" className="client-aff-btn" onClick={() => void openAffaire(a.id)}>
                          <strong>
                            {a.numeroDevis} · {STATUT_LABEL[a.statut] ?? a.statut}
                          </strong>
                          <small>
                            {a.adresse} · {eur(a.montantHt)}
                          </small>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </>
      ) : null}

      {affaireId ? (
        <AffaireSheet
          detail={detail}
          onClose={() => {
            setAffaireId(null);
            setDetail(null);
            router.refresh();
          }}
          onRefresh={async () => {
            const r = await fetch(`/api/affaires/${affaireId}`);
            if (r.ok) setDetail(await r.json());
            router.refresh();
          }}
        />
      ) : null}
    </>
  );
}
