'use client';

import { useSession } from 'next-auth/react';
import { ROLE_LABEL } from '@/lib/format';
import { ACCES_LABEL } from '@/lib/acces-labels';

/** Fiche profil lecture : rôle d’accès visible, non modifiable. */
export function ProfilView() {
  const { data } = useSession();
  const user = data?.user;

  if (!user) {
    return <p className="hint">Connectez-vous pour voir votre profil.</p>;
  }

  return (
    <div className="card" style={{ maxWidth: 480, padding: 20 }}>
      <span className="eyebrow">Mon profil</span>
      <h2 style={{ marginTop: 6 }}>{user.name}</h2>
      <dl className="kv" style={{ marginTop: 16 }}>
        <dt>Email</dt>
        <dd className="mono">{user.email}</dd>
        <dt>Initiales</dt>
        <dd>{user.initiales}</dd>
        <dt>Fonction</dt>
        <dd>{ROLE_LABEL[user.role] ?? user.role}</dd>
        <dt>Rôle d&apos;accès</dt>
        <dd>
          <span className="pill wait">
            {ACCES_LABEL[user.acces] ?? user.acces ?? 'Collaborateur'}
          </span>
          <div className="hint" style={{ marginTop: 6 }}>
            Seuls Valérie et Denis (administrateurs) peuvent modifier les rôles d&apos;accès.
          </div>
        </dd>
      </dl>
    </div>
  );
}
