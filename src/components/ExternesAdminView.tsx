'use client';

import { useCallback, useEffect, useState } from 'react';

type ExtUser = {
  id: string;
  nom: string;
  email: string;
  societe: string;
  fonction: string;
  telephone: string;
  actif: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  fils: {
    threadKey: string;
    titre: string;
    invitedAt: string;
    invitedBy: string;
    accessExpiresAt: string | null;
  }[];
};

type Audit = {
  id: string;
  action: string;
  actor: string;
  targetEmail: string | null;
  threadKey: string | null;
  detail: string;
  createdAt: string;
};

const ACTION_LABEL: Record<string, string> = {
  invite: 'Invitation',
  accept: 'Acceptation',
  resend: 'Renvoi',
  cancel: 'Annulation',
  revoke_thread: 'Retrait d’un fil',
  revoke_all: 'Révocation totale',
  expire: 'Expiration',
};

export function ExternesAdminView() {
  const [users, setUsers] = useState<ExtUser[]>([]);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch('/api/admin/externes');
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setErr(j.error ?? 'Chargement impossible');
      return;
    }
    setUsers(j.users ?? []);
    setAudits(j.audits ?? []);
    setErr('');
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function patch(body: Record<string, string>) {
    setBusy(true);
    const r = await fetch('/api/admin/externes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      alert(j.error ?? 'Action impossible');
      return;
    }
    await load();
  }

  return (
    <div className="admin-externes">
      <p className="hint">
        Participants externes (syndics, MOE, fournisseurs…). Accès limité aux fils où ils
        ont été invités. La révocation coupe immédiatement leurs sessions.
      </p>
      {err ? <p className="err">{err}</p> : null}

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Participant</th>
              <th>Fils</th>
              <th>Dernière connexion</th>
              <th>Expiration</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <strong>{u.nom}</strong>
                  <br />
                  <span className="hint">
                    {u.societe || '—'}
                    {u.fonction ? ` · ${u.fonction}` : ''}
                    <br />
                    {u.email}
                    {u.telephone ? ` · ${u.telephone}` : ''}
                  </span>
                  {!u.actif ? (
                    <span className="pill danger" style={{ marginLeft: 6 }}>
                      Révoqué
                    </span>
                  ) : null}
                </td>
                <td>
                  {u.fils.length === 0 ? (
                    <span className="hint">Aucun fil actif</span>
                  ) : (
                    <ul className="ext-fils">
                      {u.fils.map((f) => (
                        <li key={f.threadKey}>
                          {f.titre}
                          <br />
                          <span className="hint">
                            Invité le{' '}
                            {new Date(f.invitedAt).toLocaleDateString('fr-FR')} par{' '}
                            {f.invitedBy}
                          </span>
                          <button
                            type="button"
                            className="btn-edit"
                            disabled={busy}
                            style={{ marginLeft: 8 }}
                            onClick={() => {
                              if (
                                !confirm(
                                  `Retirer ${u.nom} de « ${f.titre} » ?`,
                                )
                              )
                                return;
                              void patch({
                                action: 'revoke_thread',
                                userId: u.id,
                                threadKey: f.threadKey,
                              });
                            }}
                          >
                            Retirer du fil
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
                <td>
                  {u.lastLoginAt
                    ? new Date(u.lastLoginAt).toLocaleString('fr-FR')
                    : 'Jamais'}
                </td>
                <td>
                  {u.fils
                    .map((f) =>
                      f.accessExpiresAt
                        ? new Date(f.accessExpiresAt).toLocaleDateString('fr-FR')
                        : 'Sans limite',
                    )
                    .join(' · ') || '—'}
                </td>
                <td>
                  {u.actif ? (
                    <button
                      type="button"
                      className="btn-edit"
                      disabled={busy}
                      onClick={() => {
                        if (
                          !confirm(
                            `Révoquer tout l’accès de ${u.nom} ? Ses messages restent visibles.`,
                          )
                        )
                          return;
                        void patch({ action: 'revoke_all', userId: u.id });
                      }}
                    >
                      Révoquer tout
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
            {!users.length ? (
              <tr>
                <td colSpan={5} className="hint">
                  Aucun participant externe pour l’instant.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <h3 style={{ marginTop: 28, fontSize: 16 }}>Journal</h3>
      <ul className="ext-audit">
        {audits.map((a) => (
          <li key={a.id}>
            <time>{new Date(a.createdAt).toLocaleString('fr-FR')}</time>
            <strong>{ACTION_LABEL[a.action] ?? a.action}</strong>
            <span>
              {a.actor}
              {a.targetEmail ? ` → ${a.targetEmail}` : ''}
              {a.threadKey ? ` · ${a.threadKey}` : ''}
            </span>
            {a.detail ? <span className="hint">{a.detail}</span> : null}
          </li>
        ))}
        {!audits.length ? <li className="hint">Aucune entrée.</li> : null}
      </ul>
    </div>
  );
}
