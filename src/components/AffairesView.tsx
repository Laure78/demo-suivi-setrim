'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { eur, eur0, formatDateFr, STATUT_PLURAL } from '@/lib/format';
import { AffaireSheet, type AffaireDetail } from '@/components/AffaireSheet';

export type AffaireRow = {
  id: string;
  numeroDevis: string;
  client: string;
  adresse: string;
  montantHt: number;
  acompteHt: number;
  joursCharge: number;
  statut: string;
  dateDevis: string | null;
  note: string;
  hasAcompte: boolean;
  hasSolde: boolean;
  hasEncaisse: boolean;
  tachesOuvertes: number;
  tachesRetard: number;
};

const TABS = ['commande', 'programme', 'encours', 'solde'] as const;

const emptyForm = {
  numeroDevis: '',
  client: '',
  adresse: '',
  montantHt: '',
  montantTtc: '',
  acompteHt: '',
  joursCharge: '',
  dateDevis: new Date().toISOString().slice(0, 10),
  note: '',
};

export function AffairesView({
  affaires,
  initialAffaireId,
}: {
  affaires: AffaireRow[];
  counts: Record<string, number>;
  initialAffaireId?: string | null;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]>(() => {
    if (!initialAffaireId) return 'commande';
    const a = affaires.find((x) => x.id === initialAffaireId);
    if (a && (TABS as readonly string[]).includes(a.statut)) {
      return a.statut as (typeof TABS)[number];
    }
    return 'commande';
  });
  const [sheetId, setSheetId] = useState<string | null>(initialAffaireId ?? null);
  const [detail, setDetail] = useState<AffaireDetail | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [pdf, setPdf] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (!initialAffaireId) return;
    const a = affaires.find((x) => x.id === initialAffaireId);
    if (a && (TABS as readonly string[]).includes(a.statut)) {
      setTab(a.statut as (typeof TABS)[number]);
    }
    setSheetId(initialAffaireId);
    void (async () => {
      const r = await fetch(`/api/affaires/${initialAffaireId}`);
      if (r.ok) setDetail(await r.json());
    })();
  }, [initialAffaireId, affaires]);

  const clients = useMemo(() => {
    const set = new Set(affaires.map((a) => a.client.trim()).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
  }, [affaires]);

  const filtered = useMemo(() => {
    if (!clientFilter) return affaires;
    return affaires.filter((a) => a.client === clientFilter);
  }, [affaires, clientFilter]);

  const tabCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const k of TABS) c[k] = 0;
    for (const a of filtered) {
      if (a.statut in c) c[a.statut] += 1;
    }
    return c;
  }, [filtered]);

  const rows = useMemo(() => {
    const list = filtered.filter((a) => a.statut === tab);
    return [...list].sort((a, b) => {
      const byClient = a.client.localeCompare(b.client, 'fr', { sensitivity: 'base' });
      if (byClient !== 0) return byClient;
      return a.numeroDevis.localeCompare(b.numeroDevis, 'fr', { numeric: true });
    });
  }, [filtered, tab]);

  const tot = rows.reduce((s, a) => s + a.montantHt, 0);
  const totj = rows.reduce((s, a) => s + a.joursCharge, 0);

  const portefeuille = useMemo(
    () => filtered.filter((a) => a.statut === 'commande' || a.statut === 'programme'),
    [filtered],
  );
  const pfHt = portefeuille.reduce((s, a) => s + a.montantHt, 0);
  const pfJ = portefeuille.reduce((s, a) => s + a.joursCharge, 0);

  async function openSheet(id: string) {
    setSheetId(id);
    setDetail(null);
    const r = await fetch(`/api/affaires/${id}`);
    if (r.ok) setDetail(await r.json());
  }

  function closeSheet() {
    setSheetId(null);
    setDetail(null);
    // Sans ça, ?affaire= + refresh rouvre la fiche immédiatement
    if (initialAffaireId) {
      router.replace('/portefeuille', { scroll: false });
    }
  }

  async function submitDevis(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormErr('');
    try {
      const fd = new FormData();
      fd.append('numeroDevis', form.numeroDevis.trim());
      fd.append('client', form.client.trim());
      fd.append('adresse', form.adresse.trim());
      fd.append('montantHt', form.montantHt || '0');
      if (form.montantTtc) fd.append('montantTtc', form.montantTtc);
      if (form.acompteHt) fd.append('acompteHt', form.acompteHt);
      if (form.joursCharge) fd.append('joursCharge', form.joursCharge);
      if (form.dateDevis) fd.append('dateDevis', form.dateDevis);
      if (form.note) fd.append('note', form.note);
      if (pdf) fd.append('pdf', pdf);

      const r = await fetch('/api/affaires', { method: 'POST', body: fd });
      const j = await r.json();
      if (!r.ok) {
        setFormErr(j.error ?? 'Création impossible');
        return;
      }
      setShowForm(false);
      setForm(emptyForm);
      setPdf(null);
      router.refresh();
      if (j.id) await openSheet(j.id);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="import-bar">
        <button type="button" className="btn-primary" onClick={() => setShowForm(true)}>
          Saisir un devis
        </button>
        <label className="btn-note" style={{ cursor: 'pointer' }}>
          Importer les devis
          <input
            type="file"
            accept=".xlsx,.xls,.csv,.pdf,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const fd = new FormData();
              fd.append('file', f);
              const r = await fetch('/api/affaires/import', { method: 'POST', body: fd });
              const j = await r.json();
              alert(j.message ?? (r.ok ? 'Import terminé' : 'Échec import'));
              router.refresh();
              e.target.value = '';
            }}
          />
        </label>
        <span className="hint" style={{ margin: 0 }}>
          Saisie manuelle, Excel Batappli ou PDF devis
        </span>
      </div>

      <div className="totals" style={{ marginBottom: 14, borderTop: '1px solid var(--trait)' }}>
        <div>
          <span className="eyebrow">Portefeuille (commandes + programmés)</span>
          <span className="v">{eur0(pfHt)}</span>
        </div>
        <div>
          <span className="eyebrow">Jours de charge</span>
          <span className="v">{pfJ} j</span>
        </div>
        <div>
          <span className="eyebrow">Moyenne / jour</span>
          <span className="v">{pfJ ? eur0(pfHt / pfJ) : '—'}</span>
        </div>
      </div>

      <p className="hint" style={{ marginBottom: 12 }}>
        Fil conducteur unique : le devis validé = l&apos;affaire. Elle porte le même numéro jusqu&apos;à
        l&apos;encaissement. Programmer une date → planning + alertes Aujourd&apos;hui.
      </p>

      <div className="import-bar" style={{ marginBottom: 10 }}>
        <label className="filter-client">
          <span className="eyebrow">Client</span>
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            aria-label="Filtrer et trier par client"
          >
            <option value="">Tous les clients ({clients.length})</option>
            {clients.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <span className="hint" style={{ margin: 0 }}>
          Liste triée par client · {clientFilter ? clientFilter : `${clients.length} clients`}
        </span>
      </div>

      <div className="tabs">
        {TABS.map((k) => (
          <button
            key={k}
            type="button"
            data-t={k}
            className={tab === k ? 'on' : ''}
            onClick={() => setTab(k)}
          >
            {STATUT_PLURAL[k]}
            <span className="c">{tabCounts[k] ?? 0}</span>
          </button>
        ))}
      </div>
      <table>
        <thead>
          <tr>
            <th>Devis</th>
            <th>Client / adresse du chantier</th>
            <th style={{ textAlign: 'right' }}>Montant HT</th>
            <th style={{ textAlign: 'right' }}>Jours</th>
            <th>Acompte · Solde · Encaissé</th>
            <th>Tâches ouvertes</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id} className="row" onClick={() => openSheet(a.id)}>
              <td className="mono">
                {a.numeroDevis}
                <div className="adr">{formatDateFr(a.dateDevis)}</div>
              </td>
              <td>
                <span className="cli">{a.client}</span>
                <div className="adr">{a.adresse}</div>
                {a.note ? (
                  <div className="adr" style={{ color: 'var(--flamme)' }}>
                    ▲ {a.note}
                  </div>
                ) : null}
              </td>
              <td className="num">
                {eur(a.montantHt)}
                {a.acompteHt ? (
                  <div className="adr mono">ac. {eur(a.acompteHt)}</div>
                ) : null}
              </td>
              <td className="num">{a.joursCharge}</td>
              <td>
                <div className="dots">
                  <span className={`dot${a.hasAcompte ? ' on' : ''}`} />
                  <span
                    className={`dot${a.hasSolde ? ' on' : a.statut === 'solde' ? ' late' : ''}`}
                  />
                  <span className={`dot${a.hasEncaisse ? ' on' : ''}`} />
                </div>
              </td>
              <td className="mono">
                {a.tachesOuvertes}
                {a.tachesRetard > 0 ? (
                  <span className="pill no"> {a.tachesRetard} en retard</span>
                ) : null}
              </td>
              <td onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="btn-edit"
                  onClick={() => openSheet(a.id)}
                  title="Modifier l'affaire"
                >
                  ✎ Modifier
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="totals">
        <div>
          <span className="eyebrow">Total {STATUT_PLURAL[tab].toLowerCase()}</span>
          <span className="v">{eur0(tot)}</span>
        </div>
        <div>
          <span className="eyebrow">Jours de charge</span>
          <span className="v">{totj} j</span>
        </div>
        <div>
          <span className="eyebrow">Moyenne par jour</span>
          <span className="v">{totj ? eur0(tot / totj) : '—'}</span>
        </div>
      </div>
      <p className="hint">
        Le portefeuille, c&apos;est ce total sur les onglets Commandes et Programmés. Une fois la
        date posée, le chantier rejoint le planning.
      </p>

      {sheetId ? (
        <AffaireSheet
          detail={detail}
          onClose={closeSheet}
          onRefresh={() => openSheet(sheetId)}
        />
      ) : null}

      {showForm ? (
        <>
          <div className="scrim on" onClick={() => !saving && setShowForm(false)} />
          <div className="add-collab-sheet">
            <button
              type="button"
              className="sheet-close"
              onClick={() => !saving && setShowForm(false)}
            >
              ✕
            </button>
            <span className="eyebrow">Nouveau devis</span>
            <h3>Saisir une affaire</h3>
            <p className="hint">
              Le devis entre en <b>Commande</b>. Les tâches (benne, acompte, solde…) sont créées
              automatiquement.
            </p>
            <form onSubmit={submitDevis} className="add-collab-form">
              <label>
                N° de devis *
                <input
                  required
                  value={form.numeroDevis}
                  onChange={(e) => setForm({ ...form, numeroDevis: e.target.value })}
                  placeholder="ex. 43102"
                />
              </label>
              <label>
                Client / syndic *
                <input
                  required
                  value={form.client}
                  onChange={(e) => setForm({ ...form, client: e.target.value })}
                  placeholder="ex. FONCIA"
                />
              </label>
              <label>
                Adresse du chantier *
                <input
                  required
                  value={form.adresse}
                  onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                  placeholder="ex. 74 Rue Mercadet, 75018 Paris"
                />
              </label>
              <div className="edit-row">
                <label>
                  Montant HT (€) *
                  <input
                    required
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.montantHt}
                    onChange={(e) => setForm({ ...form, montantHt: e.target.value })}
                    placeholder="0"
                  />
                </label>
                <label>
                  Montant TTC (€)
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.montantTtc}
                    onChange={(e) => setForm({ ...form, montantTtc: e.target.value })}
                  />
                </label>
              </div>
              <div className="edit-row">
                <label>
                  Acompte HT (€)
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.acompteHt}
                    onChange={(e) => setForm({ ...form, acompteHt: e.target.value })}
                  />
                </label>
                <label>
                  Jours de charge
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={form.joursCharge}
                    onChange={(e) => setForm({ ...form, joursCharge: e.target.value })}
                    placeholder="0"
                  />
                </label>
                <label>
                  Date du devis
                  <input
                    type="date"
                    value={form.dateDevis}
                    onChange={(e) => setForm({ ...form, dateDevis: e.target.value })}
                  />
                </label>
              </div>
              <label>
                Note / alerte
                <input
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="ex. en attente d'OS"
                />
              </label>
              <label>
                Joindre le PDF du devis (optionnel)
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => setPdf(e.target.files?.[0] ?? null)}
                />
              </label>
              {pdf ? (
                <p className="hint" style={{ margin: 0 }}>
                  Fichier : {pdf.name}
                </p>
              ) : null}
              {formErr ? <p className="err">{formErr}</p> : null}
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Enregistrement…' : "Créer l'affaire"}
              </button>
            </form>
          </div>
        </>
      ) : null}
    </>
  );
}
