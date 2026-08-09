'use client';

import { signIn, useSession } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';
import { isEmojiAvatar, isImageAvatar } from '@/lib/avatar';
import { ROLE_LABEL } from '@/lib/format';
import { BUREAU_ACCES, bureauPasswordFor } from '@/lib/bureau-acces';

export type Collaborateur = {
  id: string;
  initiales: string;
  nom: string;
  email: string;
  role: string;
  terrain: boolean;
  roleLabel?: string;
  avatarUrl?: string | null;
};

const FALLBACK: Collaborateur[] = BUREAU_ACCES.map((u) => ({
  id: u.id,
  initiales: u.initiales,
  nom: u.nom,
  email: u.email,
  role: u.role,
  terrain: u.terrain,
}));

export function WhoSwitcher() {
  const { data } = useSession();
  const [users, setUsers] = useState<Collaborateur[]>(FALLBACK);
  const [switching, setSwitching] = useState<string | null>(null);
  const me = data?.user?.initiales;
  const meId = data?.user?.id;

  useEffect(() => {
    fetch('/api/collaborateurs')
      .then((r) => (r.ok ? r.json() : null))
      .then((list) => {
        if (Array.isArray(list) && list.length) setUsers(list);
      })
      .catch(() => undefined);
  }, [data?.user?.id]);

  const current = useMemo(() => {
    return (
      users.find((u) => u.id === meId || u.initiales === me) ??
      (data?.user
        ? {
            id: data.user.id,
            initiales: data.user.initiales ?? '?',
            nom: data.user.name ?? 'Utilisateur',
            email: data.user.email ?? '',
            role: data.user.role ?? '',
            terrain: false,
            roleLabel: ROLE_LABEL[data.user.role ?? ''] ?? data.user.role,
            avatarUrl: null,
          }
        : null)
    );
  }, [users, meId, me, data?.user]);

  const roleLabel =
    current?.roleLabel ??
    (current ? ROLE_LABEL[current.role] ?? current.role : '');

  async function switchTo(email: string, initiales: string) {
    if (initiales === me || switching) return;
    const password = bureauPasswordFor(email) ?? bureauPasswordFor(initiales);
    if (!password) {
      alert(
        'Basculer vers ce compte nécessite son mot de passe individuel. Déconnectez-vous puis reconnectez-vous.',
      );
      return;
    }
    setSwitching(initiales);
    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });
    setSwitching(null);
    if (res?.error) return;
    window.location.reload();
  }

  return (
    <div className="who-block">
      {current ? (
        <div className="who-me" title={`${current.nom} — ${roleLabel}`} aria-live="polite">
          <span className="who-me-label">Connecté</span>
          <span className="who-me-name">{current.nom}</span>
          {roleLabel ? <span className="who-me-role">{roleLabel}</span> : null}
        </div>
      ) : null}
      <div className="who" role="group" aria-label="Changer de collaborateur — Je suis">
        <span className="who-switch-label desk-only-inline">Je suis</span>
        {users.map((u) => {
          const on = me === u.initiales || meId === u.id;
          const busy = switching === u.initiales;
          return (
            <button
              key={u.id}
              type="button"
              data-u={u.initiales}
              data-terrain={u.terrain ? '1' : '0'}
              className={on ? 'on' : ''}
              title={`Basculer vers ${u.nom} — ${u.roleLabel ?? ROLE_LABEL[u.role] ?? u.role}`}
              aria-pressed={on}
              aria-label={`${u.nom}${on ? ' (connecté)' : ''}`}
              disabled={!!switching}
              onClick={() => switchTo(u.email, u.initiales)}
            >
              {busy ? (
                '…'
              ) : isEmojiAvatar(u.avatarUrl) ? (
                <span className="who-emoji">{u.avatarUrl}</span>
              ) : isImageAvatar(u.avatarUrl) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={u.avatarUrl!} alt={u.initiales} className="who-photo" />
              ) : (
                u.initiales
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Export pour compat — 5 accès bureau. */
export const COLLABORATEURS = FALLBACK;
