'use client';

import { signIn, useSession } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';
import { isEmojiAvatar, isImageAvatar } from '@/lib/avatar';
import { ROLE_LABEL } from '@/lib/format';

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

const DEMO_PASSWORD = 'setrim2026';

const FALLBACK: Collaborateur[] = [
  { id: 'audrey', initiales: 'AU', nom: 'Audrey', email: 'audrey@setrim.fr', role: 'assistante', terrain: false },
  { id: 'melissa', initiales: 'ME', nom: 'Mélissa', email: 'melissa@setrim.fr', role: 'assistante', terrain: false },
  { id: 'valerie', initiales: 'VA', nom: 'Valérie', email: 'valerie@setrim.fr', role: 'responsable', terrain: false },
  { id: 'denis', initiales: 'DE', nom: 'Denis', email: 'denis@setrim.fr', role: 'dirigeant', terrain: true },
  { id: 'philippe', initiales: 'PH', nom: 'Philippe', email: 'philippe@setrim.fr', role: 'conducteur', terrain: true },
];

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
    setSwitching(initiales);
    const res = await signIn('credentials', {
      email,
      password: DEMO_PASSWORD,
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

/** Export pour le login (5 comptes de base). */
export const COLLABORATEURS = FALLBACK;
