'use client';

import { useCallback, useEffect, useState } from 'react';
import { ACCES_LABEL } from '@/lib/acces-labels';

type UserRow = {
  id: string;
  nom: string;
  email: string;
  initiales: string;
  role: string;
  roleLabel: string;
  acces: string;
  accesLabel: string;
  actif: boolean;
  lastLoginAt: string | null;
  mustChangePassword: boolean;
};

type JournalRow = {
  id: string;
  action: string;
  detail: string;
  auteur: string;
  createdAt: string;
};

const ACTION_LABEL: Record<string, string> = {
  cree: 'Création',
  modifie_role: 'Rôle modifié',
  desactive: 'Désactivation',
  reactive: 'Réactivation',
  reset_mdp: 'Mot de passe réinitialisé',
};

type QuotaInfo = {
  actifs: number;
  inclus: number;
  formule: string;
  procheLimite: boolean;
  depasse: boolean;
};

export function AdministrationView() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [journal, setJournal] = useState<JournalRow[]>([]);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    nom: '',
    email: '',
    initiales: '',
    acces: 'collaborateur',
    role: 'assistante',
  });

  const load = useCallback(async () => {
    const r = await fetch('/api/admin/users');
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setErr(j.error ?? 'Chargement impossible');
      return;
    }
    setUsers(j.users ?? []);
    setJournal(j.journal ?? []);
    setQuota(j.quota ?? null);
    setErr('');
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setErr('');
    setInfo('');
    const r = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) {
      setErr(j.error ?? 'Action impossible');
      return null;
    }
    await load();
    return j;
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    setInfo('');
    const r = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) {
      setErr(j.error ?? 'Création impossible');
      return;
    }
    setShowForm(false);
    setForm({
      nom: '',
      email: '',
      initiales: '',
      acces: 'collaborateur',
      role: 'assistante',
    });
    setInfo(
      `Compte créé. Mot de passe provisoire : ${j.motDePasseProvisoire} (à communiquer à ${j.user?.nom}).`,
    );
    await load();
  }

  function formatLogin(iso: string | null) {
    if (!iso) return 'Jamais';
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <>
      <p className="hint" style={{ marginBottom: 12 }}>
        Réservé à Valérie et Denis. Les collaborateurs gardent l&apos;accès complet aux
        chantiers, messages, contrats et planning — seule l&apos;administration des comptes est
        limitée.
      </p>

      {quota ? (
        <p
          className="hint"
          style={{
            marginBottom: 12,
            padding: '10px 12px',
            background: quota.procheLimite ? '#FCF3D8' : '#E8F3FA',
            borderLeft: `3px solid ${quota.procheLimite ? '#8A6A05' : 'var(--bleu)'}`,
          }}
        >
          Comptes actifs : <strong>{quota.actifs}</strong> / {quota.inclus} inclus dans la
          formule « {quota.formule} ».
          {quota.procheLimite
            ? ' Limite atteinte — pour en ajouter, ouvrez Abonnement et demandez au support.'
            : null}
        </p>
      ) : null}

      {err ? (
        <p className="err" style={{ marginBottom: 12 }}>
          {err}
        </p>
      ) : null}
      {info ? (
        <p
          className="hint"
          style={{
            marginBottom: 12,
            padding: '10px 12px',
            background: '#E8F3FA',
            borderLeft: '3px solid var(--bleu)',
          }}
        >
          {info}
        </p>
      ) : null}

      <div className="import-bar" style={{ marginBottom: 14 }}>
        <button
          type="button"
          className="btn-primary"
          onClick={() => setShowForm(true)}
          disabled={busy}
        >
          Créer un utilisateur
        </button>
      </div>

      <div className="plan-wrap">
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Email</th>
              <th>Fonction</th>
              <th>Rôle</th>
              <th>Statut</th>
              <th>Dernière connexion</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="row" style={{ cursor: 'default' }}>
                <td>
                  <span className="cli">
                    {u.initiales} · {u.nom}
                  </span>
                </td>
                <td className="mono">{u.email}</td>
                <td>{u.roleLabel}</td>
                <td>
                  <select
                    value={u.acces}
                    disabled={busy || !u.actif}
                    aria-label={`Rôle de ${u.nom}`}
                    onChange={(e) =>
                      void patch({ id: u.id, action: 'set_acces', acces: e.target.value })
                    }
                  >
                    <option value="collaborateur">{ACCES_LABEL.collaborateur}</option>
                    <option value="administrateur">{ACCES_LABEL.administrateur}</option>
                  </select>
                </td>
                <td>
                  <span className={`pill${u.actif ? ' ok' : ' no'}`}>
                    {u.actif ? 'Actif' : 'Désactivé'}
                  </span>
                  {u.mustChangePassword ? (
                    <span className="pill wait" style={{ marginLeft: 6 }}>
                      MDP provisoire
                    </span>
                  ) : null}
                </td>
                <td className="mono">{formatLogin(u.lastLoginAt)}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    <button
                      type="button"
                      className="btn-note"
                      disabled={busy}
                      onClick={async () => {
                        const j = await patch({ id: u.id, action: 'reset_mdp' });
                        if (j?.motDePasseProvisoire) {
                          setInfo(
                            `Nouveau mot de passe provisoire pour ${u.nom} : ${j.motDePasseProvisoire}`,
                          );
                        }
                      }}
                    >
                      Réinit. MDP
                    </button>
                    {u.actif ? (
                      <button
                        type="button"
                        className="btn-note"
                        disabled={busy}
                        onClick={() => void patch({ id: u.id, action: 'desactiver' })}
                      >
                        Désactiver
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-note"
                        disabled={busy}
                        onClick={() => void patch({ id: u.id, action: 'reactiver' })}
                      >
                        Réactiver
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="sec-head" style={{ marginTop: 28 }}>
        <span className="eyebrow">Journal d&apos;administration</span>
      </div>
      {journal.length === 0 ? (
        <p className="hint">Aucune action pour l&apos;instant.</p>
      ) : (
        <ul className="dashboard-alertes" style={{ marginTop: 8 }}>
          {journal.map((j) => (
            <li key={j.id}>
              <strong>{j.auteur}</strong> — {ACTION_LABEL[j.action] ?? j.action}
              {j.detail ? ` · ${j.detail}` : ''}{' '}
              <span className="mono" style={{ color: 'var(--zinc)' }}>
                {new Date(j.createdAt).toLocaleString('fr-FR')}
              </span>
            </li>
          ))}
        </ul>
      )}

      {showForm ? (
        <>
          <div className="scrim on" onClick={() => !busy && setShowForm(false)} />
          <div className="add-collab-sheet">
            <button type="button" className="sheet-close" onClick={() => setShowForm(false)}>
              ✕
            </button>
            <span className="eyebrow">Nouveau compte</span>
            <h3>Créer un utilisateur</h3>
            <p className="hint">
              Un mot de passe provisoire sera généré : la personne devra le changer à la première
              connexion.
            </p>
            <form onSubmit={createUser} className="add-collab-form">
              <label>
                Nom
                <input
                  required
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>
              <label>
                Initiales
                <input
                  maxLength={2}
                  value={form.initiales}
                  onChange={(e) =>
                    setForm({ ...form, initiales: e.target.value.toUpperCase() })
                  }
                  placeholder="Auto"
                />
              </label>
              <label>
                Rôle d&apos;accès
                <select
                  value={form.acces}
                  onChange={(e) => setForm({ ...form, acces: e.target.value })}
                >
                  <option value="collaborateur">Collaborateur</option>
                  <option value="administrateur">Administrateur</option>
                </select>
              </label>
              <label>
                Fonction
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="assistante">Assistante travaux</option>
                  <option value="responsable">Resp. administrative</option>
                  <option value="dirigeant">Dirigeant</option>
                  <option value="conducteur">Conducteur de travaux</option>
                </select>
              </label>
              <button type="submit" className="btn-primary" disabled={busy}>
                {busy ? 'Création…' : 'Créer'}
              </button>
            </form>
          </div>
        </>
      ) : null}
    </>
  );
}
