'use client';

import { signIn, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

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

  useEffect(() => {
    fetch('/api/collaborateurs')
      .then((r) => (r.ok ? r.json() : null))
      .then((list) => {
        if (Array.isArray(list) && list.length) setUsers(list);
      })
      .catch(() => undefined);
  }, [data?.user?.id]);

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
      <div className="who" role="group" aria-label="Changer de collaborateur">
        {users.map((u) => {
          const on = me === u.initiales;
          const busy = switching === u.initiales;
          return (
            <button
              key={u.id}
              type="button"
              data-u={u.initiales}
              data-terrain={u.terrain ? '1' : '0'}
              className={on ? 'on' : ''}
              title={`${u.nom} — ${u.roleLabel ?? u.role}`}
              aria-pressed={on}
              disabled={!!switching}
              onClick={() => switchTo(u.email, u.initiales)}
            >
              {busy ? (
                '…'
              ) : u.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={u.avatarUrl} alt={u.initiales} className="who-photo" />
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
