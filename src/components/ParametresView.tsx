'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AdministrationView } from '@/components/AdministrationView';
import { AideLabel } from '@/components/AideTip';
import { AIDES } from '@/lib/aides';
import { PARAM_TABS, type ParamTabId, GESTES_BASE } from '@/lib/parametres-labels';
import { isAdministrateur } from '@/lib/acces-labels';

type Profil = {
  prenom: string;
  nomFamille: string;
  telephone: string;
  email: string;
  initiales: string;
  avatarUrl: string | null;
  roleLabel: string;
  accesLabel: string;
  displayName: string;
};

type NotifPrefs = {
  pushEnabled: boolean;
  emailEnabled: boolean;
  alertMessages: boolean;
  alertActions: boolean;
  alertContrats: boolean;
  alertRelances: boolean;
  urgenceMin: number;
  silenceDebut: string;
  silenceFin: string;
};

type Ticket = {
  id: string;
  numero: string;
  objet: string;
  statutLabel: string;
  urgenceLabel: string;
  createdAt: string;
};

function isParamTab(v: string | null): v is ParamTabId {
  return PARAM_TABS.some((t) => t.id === v);
}

export function ParametresView() {
  const { data } = useSession();
  const isAdmin = isAdministrateur(data?.user?.acces);
  const search = useSearchParams();
  const router = useRouter();
  const tabParam = search.get('tab');

  const tabs = useMemo(
    () => PARAM_TABS.filter((t) => !t.admin || isAdmin),
    [isAdmin],
  );

  const tab: ParamTabId = useMemo(() => {
    if (isParamTab(tabParam) && tabs.some((t) => t.id === tabParam)) return tabParam;
    return 'profil';
  }, [tabParam, tabs]);

  function setTab(id: ParamTabId) {
    router.replace(`/parametres?tab=${id}`, { scroll: false });
  }

  return (
    <div className="param-page">
      <div className="param-head">
        <AideLabel aide={AIDES.parametres}>
          <h2 style={{ margin: 0, fontSize: 22 }}>Paramètres</h2>
        </AideLabel>
        <p className="hint" style={{ margin: '6px 0 0' }}>
          Compte, notifications, support
          {isAdmin ? ', utilisateurs, entreprise et abonnement' : ''}.
        </p>
      </div>

      <nav className="param-tabs" aria-label="Rubriques paramètres">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? 'on' : ''}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="param-panel">
        {tab === 'profil' ? <TabProfil /> : null}
        {tab === 'notifications' ? <TabNotifications /> : null}
        {tab === 'support' ? <TabSupport /> : null}
        {tab === 'utilisateurs' && isAdmin ? <AdministrationView /> : null}
        {tab === 'entreprise' && isAdmin ? <TabEntreprise /> : null}
        {tab === 'abonnement' && isAdmin ? <TabAbonnement onSupport={() => setTab('support')} /> : null}
      </div>
    </div>
  );
}

function TabProfil() {
  const { update } = useSession();
  const [profil, setProfil] = useState<Profil | null>(null);
  const [pwd, setPwd] = useState({ current: '', next: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');

  const load = useCallback(async () => {
    const r = await fetch('/api/parametres/profil');
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setErr(j.error ?? 'Chargement impossible');
      return;
    }
    setProfil({
      prenom: j.prenom || j.nom || '',
      nomFamille: j.nomFamille || '',
      telephone: j.telephone || '',
      email: j.email || '',
      initiales: j.initiales || '',
      avatarUrl: j.avatarUrl,
      roleLabel: j.roleLabel,
      accesLabel: j.accesLabel,
      displayName: j.displayName,
    });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveProfil(e: React.FormEvent) {
    e.preventDefault();
    if (!profil) return;
    setBusy(true);
    setErr('');
    setInfo('');
    const r = await fetch('/api/parametres/profil', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profil),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) {
      setErr(j.error ?? 'Enregistrement impossible');
      return;
    }
    setInfo('Profil enregistré.');
    await update({ name: j.displayName });
    await load();
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    setInfo('');
    const r = await fetch('/api/parametres/profil', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'password',
        currentPassword: pwd.current,
        newPassword: pwd.next,
      }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) {
      setErr(j.error ?? 'Changement impossible');
      return;
    }
    setPwd({ current: '', next: '' });
    setInfo('Mot de passe mis à jour. Reconnectez-vous sur les autres appareils.');
  }

  async function revokeSessions() {
    if (
      !confirm(
        'Déconnecter toutes les sessions (y compris celle-ci) ? Vous devrez vous reconnecter.',
      )
    ) {
      return;
    }
    setBusy(true);
    await fetch('/api/parametres/profil', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'revoke_sessions' }),
    });
    setBusy(false);
    await signOut({ callbackUrl: '/login' });
  }

  if (!profil) {
    return <p className="hint">{err || 'Chargement…'}</p>;
  }

  return (
    <div className="param-stack">
      {err ? <p className="err">{err}</p> : null}
      {info ? <p className="param-flash">{info}</p> : null}

      <form className="param-card" onSubmit={(e) => void saveProfil(e)}>
        <h3>Identité</h3>
        <div className="param-grid">
          <label>
            Prénom
            <input
              value={profil.prenom}
              onChange={(e) => setProfil({ ...profil, prenom: e.target.value })}
              autoComplete="given-name"
            />
          </label>
          <label>
            Nom
            <input
              value={profil.nomFamille}
              onChange={(e) => setProfil({ ...profil, nomFamille: e.target.value })}
              autoComplete="family-name"
              placeholder="Facultatif"
            />
          </label>
          <label>
            Fonction
            <input value={profil.roleLabel} readOnly className="readonly" />
          </label>
          <label>
            Rôle d&apos;accès
            <input value={profil.accesLabel} readOnly className="readonly" />
          </label>
          <label>
            Email
            <input
              type="email"
              value={profil.email}
              onChange={(e) => setProfil({ ...profil, email: e.target.value })}
              autoComplete="email"
              required
            />
          </label>
          <label>
            Téléphone mobile
            <input
              type="tel"
              value={profil.telephone}
              onChange={(e) => setProfil({ ...profil, telephone: e.target.value })}
              autoComplete="tel"
              placeholder="06…"
            />
          </label>
          <label>
            Initiales
            <input
              value={profil.initiales}
              onChange={(e) =>
                setProfil({
                  ...profil,
                  initiales: e.target.value.toUpperCase().slice(0, 2),
                })
              }
              maxLength={2}
            />
          </label>
        </div>
        <p className="hint">
          Photo : les initiales s’affichent dans l’app. Le rôle d’accès est géré par les
          administrateurs.
        </p>
        <button type="submit" className="btn-primary" disabled={busy}>
          Enregistrer
        </button>
      </form>

      <form className="param-card" onSubmit={(e) => void savePassword(e)}>
        <h3>Mot de passe</h3>
        <div className="param-grid">
          <label>
            Mot de passe actuel
            <input
              type="password"
              value={pwd.current}
              onChange={(e) => setPwd({ ...pwd, current: e.target.value })}
              autoComplete="current-password"
              required
            />
          </label>
          <label>
            Nouveau mot de passe
            <input
              type="password"
              value={pwd.next}
              onChange={(e) => setPwd({ ...pwd, next: e.target.value })}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
        </div>
        <button type="submit" className="btn-primary" disabled={busy}>
          Changer le mot de passe
        </button>
      </form>

      <div className="param-card">
        <h3>Sessions</h3>
        <p className="hint">
          Déconnecte tous les appareils connectés avec ce compte (y compris celui-ci).
        </p>
        <button type="button" className="btn-edit" disabled={busy} onClick={() => void revokeSessions()}>
          Déconnecter toutes les sessions
        </button>
        <button
          type="button"
          className="btn-edit"
          style={{ marginLeft: 8 }}
          onClick={() => void signOut({ callbackUrl: '/login' })}
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
}

function TabNotifications() {
  const [prefs, setPrefs] = useState<NotifPrefs | null>(null);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    void (async () => {
      const r = await fetch('/api/parametres/notifications');
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr(j.error ?? 'Chargement impossible');
        return;
      }
      setPrefs(j);
    })();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!prefs) return;
    setBusy(true);
    setErr('');
    const r = await fetch('/api/parametres/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prefs),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) {
      setErr(j.error ?? 'Enregistrement impossible');
      return;
    }
    setPrefs(j);
    setInfo('Préférences enregistrées.');
  }

  if (!prefs) return <p className="hint">{err || 'Chargement…'}</p>;

  return (
    <form className="param-card" onSubmit={(e) => void save(e)}>
      {err ? <p className="err">{err}</p> : null}
      {info ? <p className="param-flash">{info}</p> : null}
      <h3>Canaux</h3>
      <label className="param-check">
        <input
          type="checkbox"
          checked={prefs.pushEnabled}
          onChange={(e) => setPrefs({ ...prefs, pushEnabled: e.target.checked })}
        />
        Notifications push (navigateur / téléphone)
      </label>
      <label className="param-check">
        <input
          type="checkbox"
          checked={prefs.emailEnabled}
          onChange={(e) => setPrefs({ ...prefs, emailEnabled: e.target.checked })}
        />
        Email
      </label>

      <h3 style={{ marginTop: 18 }}>Types d’alertes</h3>
      <label className="param-check">
        <input
          type="checkbox"
          checked={prefs.alertMessages}
          onChange={(e) => setPrefs({ ...prefs, alertMessages: e.target.checked })}
        />
        Messages
      </label>
      <label className="param-check">
        <input
          type="checkbox"
          checked={prefs.alertActions}
          onChange={(e) => setPrefs({ ...prefs, alertActions: e.target.checked })}
        />
        Actions assignées
      </label>
      <label className="param-check">
        <input
          type="checkbox"
          checked={prefs.alertContrats}
          onChange={(e) => setPrefs({ ...prefs, alertContrats: e.target.checked })}
        />
        Échéances de contrats d’entretien
      </label>
      <label className="param-check">
        <input
          type="checkbox"
          checked={prefs.alertRelances}
          onChange={(e) => setPrefs({ ...prefs, alertRelances: e.target.checked })}
        />
        Relances non cochées
      </label>

      <h3 style={{ marginTop: 18 }}>Urgence minimum</h3>
      <select
        value={prefs.urgenceMin}
        onChange={(e) => setPrefs({ ...prefs, urgenceMin: Number(e.target.value) })}
      >
        <option value={1}>Info et plus</option>
        <option value={2}>À faire et urgent seulement</option>
        <option value={3}>Urgent seulement</option>
      </select>

      <h3 style={{ marginTop: 18 }}>Plage de silence</h3>
      <div className="param-grid">
        <label>
          De
          <input
            type="time"
            value={prefs.silenceDebut}
            onChange={(e) => setPrefs({ ...prefs, silenceDebut: e.target.value })}
          />
        </label>
        <label>
          À
          <input
            type="time"
            value={prefs.silenceFin}
            onChange={(e) => setPrefs({ ...prefs, silenceFin: e.target.value })}
          />
        </label>
      </div>
      <p className="hint">Pas d’alerte push entre ces heures (ex. 22:00 → 07:00).</p>

      <button type="submit" className="btn-primary" disabled={busy} style={{ marginTop: 14 }}>
        Enregistrer
      </button>
    </form>
  );
}

function TabSupport() {
  const [contact, setContact] = useState({ email: '', telephone: '', horaires: '' });
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [form, setForm] = useState({
    objet: '',
    description: '',
    urgence: 'normale',
    captureUrl: '',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch('/api/parametres/support');
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setErr(j.error ?? 'Chargement impossible');
      return;
    }
    setContact(j.contact);
    setTickets(j.tickets ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCapture(file: File | null) {
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    const r = await fetch('/api/uploads', { method: 'POST', body: fd });
    const j = await r.json().catch(() => ({}));
    setUploading(false);
    if (!r.ok) {
      setErr(j.error ?? 'Échec de l’envoi de la capture');
      return;
    }
    setForm((f) => ({ ...f, captureUrl: j.url }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    setInfo('');
    const r = await fetch('/api/parametres/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) {
      setErr(j.error ?? 'Envoi impossible');
      return;
    }
    setInfo(j.message ?? `Demande enregistrée — n° ${j.numero}`);
    setForm({ objet: '', description: '', urgence: 'normale', captureUrl: '' });
    await load();
  }

  return (
    <div className="param-stack">
      {err ? <p className="err">{err}</p> : null}
      {info ? <p className="param-flash">{info}</p> : null}

      <div className="param-card">
        <h3>Contact support</h3>
        <dl className="kv">
          <dt>Email</dt>
          <dd>
            <a href={`mailto:${contact.email}`}>{contact.email}</a>
          </dd>
          <dt>Téléphone</dt>
          <dd>
            <a href={`tel:${contact.telephone.replace(/\s/g, '')}`}>{contact.telephone}</a>
          </dd>
          <dt>Horaires</dt>
          <dd>{contact.horaires}</dd>
        </dl>
      </div>

      <form className="param-card" onSubmit={(e) => void submit(e)}>
        <h3>Signaler un problème</h3>
        <label>
          Objet
          <input
            value={form.objet}
            onChange={(e) => setForm({ ...form, objet: e.target.value })}
            required
            maxLength={160}
          />
        </label>
        <label>
          Description
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
            rows={4}
          />
        </label>
        <label>
          Urgence
          <select
            value={form.urgence}
            onChange={(e) => setForm({ ...form, urgence: e.target.value })}
          >
            <option value="basse">Basse</option>
            <option value="normale">Normale</option>
            <option value="haute">Haute</option>
          </select>
        </label>
        <label>
          Capture d’écran (facultatif)
          <input
            type="file"
            accept="image/*"
            onChange={(e) => void onCapture(e.target.files?.[0] ?? null)}
            disabled={uploading}
          />
        </label>
        {form.captureUrl ? (
          <p className="hint">
            Pièce jointe : <a href={form.captureUrl}>{form.captureUrl}</a>
          </p>
        ) : null}
        <button type="submit" className="btn-primary" disabled={busy || uploading}>
          Envoyer
        </button>
      </form>

      <div className="param-card">
        <h3>Mes demandes</h3>
        {!tickets.length ? (
          <p className="hint">Aucune demande pour l’instant.</p>
        ) : (
          <ul className="param-tickets">
            {tickets.map((t) => (
              <li key={t.id}>
                <strong>{t.numero}</strong> — {t.objet}
                <span className="pill wait">{t.statutLabel}</span>
                <span className="hint">
                  {new Date(t.createdAt).toLocaleDateString('fr-FR')} · {t.urgenceLabel}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="param-card" id="gestes">
        <h3>Les 5 gestes de base</h3>
        <ol className="param-gestes">
          {GESTES_BASE.map((g) => (
            <li key={g.titre}>
              <strong>{g.titre}</strong>
              <span>{g.texte}</span>
            </li>
          ))}
        </ol>
        <Link href="/tutoriel" className="btn-note">
          Ouvrir le tutoriel complet
        </Link>
      </div>
    </div>
  );
}

function TabEntreprise() {
  const [data, setData] = useState<Record<string, string> | null>(null);
  const [factures, setFactures] = useState<
    {
      id: string;
      numero: string;
      dateEmissionLabel: string;
      periode: string;
      montantHtLabel: string;
      montantTtcLabel: string;
      statutLabel: string;
      pdfUrl: string;
      statut: string;
    }[]
  >([]);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    const r = await fetch('/api/parametres/entreprise');
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setErr(j.error ?? 'Chargement impossible');
      return;
    }
    setData({
      raisonSociale: j.entreprise.raisonSociale,
      adresse: j.entreprise.adresse,
      siret: j.entreprise.siret,
      tvaIntra: j.entreprise.tvaIntra,
      facturationAdresse: j.entreprise.facturationAdresse,
      facturationEmail: j.entreprise.facturationEmail,
      referenceCommande: j.entreprise.referenceCommande,
      modeReglement: j.entreprise.modeReglement,
      periodicite: j.entreprise.periodicite,
    });
    setFactures(j.factures ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;
    setBusy(true);
    setErr('');
    const r = await fetch('/api/parametres/entreprise', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section: 'entreprise', ...data }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) {
      setErr(j.error ?? 'Enregistrement impossible');
      return;
    }
    setInfo('Informations entreprise enregistrées.');
    await load();
  }

  if (!data) return <p className="hint">{err || 'Chargement…'}</p>;

  return (
    <div className="param-stack">
      {err ? <p className="err">{err}</p> : null}
      {info ? <p className="param-flash">{info}</p> : null}

      <form className="param-card" onSubmit={(e) => void save(e)}>
        <h3>Identité</h3>
        <div className="param-grid">
          <label>
            Raison sociale
            <input
              value={data.raisonSociale}
              onChange={(e) => setData({ ...data, raisonSociale: e.target.value })}
              required
            />
          </label>
          <label>
            SIRET
            <input
              value={data.siret}
              onChange={(e) => setData({ ...data, siret: e.target.value })}
            />
          </label>
          <label className="param-span2">
            Adresse
            <input
              value={data.adresse}
              onChange={(e) => setData({ ...data, adresse: e.target.value })}
            />
          </label>
          <label>
            N° TVA intracommunautaire
            <input
              value={data.tvaIntra}
              onChange={(e) => setData({ ...data, tvaIntra: e.target.value })}
            />
          </label>
        </div>

        <h3 style={{ marginTop: 18 }}>Facturation</h3>
        <div className="param-grid">
          <label className="param-span2">
            Adresse de facturation (si différente)
            <input
              value={data.facturationAdresse}
              onChange={(e) => setData({ ...data, facturationAdresse: e.target.value })}
              placeholder="Laisser vide = même adresse"
            />
          </label>
          <label>
            Email de réception des factures
            <input
              type="email"
              value={data.facturationEmail}
              onChange={(e) => setData({ ...data, facturationEmail: e.target.value })}
            />
          </label>
          <label>
            Réf. / n° de commande
            <input
              value={data.referenceCommande}
              onChange={(e) => setData({ ...data, referenceCommande: e.target.value })}
              placeholder="À faire figurer sur les factures"
            />
          </label>
          <label>
            Mode de règlement
            <select
              value={data.modeReglement}
              onChange={(e) => setData({ ...data, modeReglement: e.target.value })}
            >
              <option value="prelevement">Prélèvement</option>
              <option value="virement">Virement</option>
              <option value="cheque">Chèque</option>
            </select>
          </label>
          <label>
            Périodicité
            <select
              value={data.periodicite}
              onChange={(e) => setData({ ...data, periodicite: e.target.value })}
            >
              <option value="mensuelle">Mensuelle</option>
              <option value="annuelle">Annuelle</option>
            </select>
          </label>
        </div>
        <button type="submit" className="btn-primary" disabled={busy} style={{ marginTop: 14 }}>
          Enregistrer
        </button>
      </form>

      <div className="param-card">
        <h3>Historique des factures</h3>
        <div className="plan-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Période</th>
                <th>N°</th>
                <th>HT</th>
                <th>TTC</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {factures.map((f) => (
                <tr key={f.id}>
                  <td>{f.dateEmissionLabel}</td>
                  <td>{f.periode}</td>
                  <td className="mono">{f.numero}</td>
                  <td>{f.montantHtLabel}</td>
                  <td>{f.montantTtcLabel}</td>
                  <td>
                    <span className={`pill ${f.statut === 'payee' ? 'ok' : 'wait'}`}>
                      {f.statutLabel}
                    </span>
                  </td>
                  <td>
                    <a href={f.pdfUrl} target="_blank" rel="noreferrer" className="btn-edit">
                      PDF
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TabAbonnement({ onSupport }: { onSupport: () => void }) {
  const [abo, setAbo] = useState<{
    formule: string;
    usersInclus: number;
    fonctionnalites: string;
    dateDebutLabel: string;
    prochaineEcheanceLabel: string;
    renouvellementAuto: boolean;
  } | null>(null);
  const [actifs, setActifs] = useState(0);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState('');
  const [err, setErr] = useState('');
  const [confirmKind, setConfirmKind] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [re, ru] = await Promise.all([
      fetch('/api/parametres/entreprise'),
      fetch('/api/admin/users'),
    ]);
    const je = await re.json().catch(() => ({}));
    const ju = await ru.json().catch(() => ({}));
    if (!re.ok) {
      setErr(je.error ?? 'Chargement impossible');
      return;
    }
    setAbo(je.abonnement);
    setActifs(ju.quota?.actifs ?? 0);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleAuto() {
    if (!abo) return;
    setBusy(true);
    await fetch('/api/parametres/entreprise', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        section: 'abonnement',
        renouvellementAuto: !abo.renouvellementAuto,
      }),
    });
    setBusy(false);
    await load();
  }

  async function sendDemande(kind: string, label: string) {
    setBusy(true);
    setErr('');
    setInfo('');
    const r = await fetch('/api/parametres/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind,
        urgence: kind === 'resilier' ? 'haute' : 'normale',
        objet: label,
        description: `Demande administrateur SETRIM : ${label}. Formule actuelle : ${abo?.formule}. Comptes actifs : ${actifs}/${abo?.usersInclus}.`,
      }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    setConfirmKind(null);
    if (!r.ok) {
      setErr(j.error ?? 'Envoi impossible');
      return;
    }
    setInfo(
      `${j.message} Aucun paiement n’est déclenché ici : le support traite la demande.`,
    );
  }

  if (!abo) return <p className="hint">{err || 'Chargement…'}</p>;

  const actions = [
    {
      kind: 'changer_formule',
      label: 'Changer de formule',
      detail: 'Demande de changement de formule d’abonnement.',
    },
    {
      kind: 'ajouter_users',
      label: 'Ajouter des utilisateurs',
      detail: 'Demande d’augmentation du nombre de comptes inclus.',
    },
    {
      kind: 'resilier',
      label: 'Résilier',
      detail: 'Demande de résiliation de l’abonnement.',
    },
  ];

  return (
    <div className="param-stack">
      {err ? <p className="err">{err}</p> : null}
      {info ? <p className="param-flash">{info}</p> : null}

      <div className="param-card">
        <h3>Formule en cours</h3>
        <dl className="kv">
          <dt>Formule</dt>
          <dd>
            <strong>{abo.formule}</strong>
          </dd>
          <dt>Utilisateurs</dt>
          <dd>
            {actifs} actifs / {abo.usersInclus} inclus
          </dd>
          <dt>Couvert</dt>
          <dd>{abo.fonctionnalites}</dd>
          <dt>Début</dt>
          <dd>{abo.dateDebutLabel}</dd>
          <dt>Prochaine échéance</dt>
          <dd>{abo.prochaineEcheanceLabel}</dd>
          <dt>Renouvellement auto</dt>
          <dd>
            <label className="param-check" style={{ margin: 0 }}>
              <input
                type="checkbox"
                checked={abo.renouvellementAuto}
                disabled={busy}
                onChange={() => void toggleAuto()}
              />
              {abo.renouvellementAuto ? 'Activé' : 'Désactivé'}
            </label>
          </dd>
        </dl>
      </div>

      <div className="param-card">
        <h3>Actions</h3>
        <p className="hint">
          Ces actions ouvrent une demande au support — pas de paiement en ligne.
        </p>
        <div className="param-actions">
          {actions.map((a) => (
            <button
              key={a.kind}
              type="button"
              className="btn-edit"
              disabled={busy}
              onClick={() => setConfirmKind(a.kind)}
            >
              {a.label}
            </button>
          ))}
        </div>
        {confirmKind ? (
          <div className="param-confirm">
            <p>
              Confirmer :{' '}
              <strong>{actions.find((a) => a.kind === confirmKind)?.label}</strong>
              <br />
              <span className="hint">
                {actions.find((a) => a.kind === confirmKind)?.detail} Un numéro de suivi
                vous sera communiqué.
              </span>
            </p>
            <button
              type="button"
              className="btn-primary"
              disabled={busy}
              onClick={() =>
                void sendDemande(
                  confirmKind,
                  actions.find((a) => a.kind === confirmKind)?.label ?? confirmKind,
                )
              }
            >
              Confirmer la demande
            </button>
            <button type="button" className="btn-edit" onClick={() => setConfirmKind(null)}>
              Annuler
            </button>
            <button type="button" className="btn-note" onClick={onSupport}>
              Voir le support
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
