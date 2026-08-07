'use client';

import { signIn, useSession } from 'next-auth/react';
import { useState } from 'react';

/** Les 5 collaborateurs — comme sur la maquette validée. */
export const COLLABORATEURS = [
  {
    id: 'audrey',
    initiales: 'AU',
    nom: 'Audrey',
    email: 'audrey@setrim.fr',
    role: 'Assistante travaux',
    terrain: false,
  },
  {
    id: 'melissa',
    initiales: 'ME',
    nom: 'Mélissa',
    email: 'melissa@setrim.fr',
    role: 'Assistante travaux',
    terrain: false,
  },
  {
    id: 'valerie',
    initiales: 'VA',
    nom: 'Valérie',
    email: 'valerie@setrim.fr',
    role: 'Resp. administrative et financière',
    terrain: false,
  },
  {
    id: 'denis',
    initiales: 'DE',
    nom: 'Denis',
    email: 'denis@setrim.fr',
    role: 'Dirigeant · conducteur de travaux',
    terrain: true,
  },
  {
    id: 'philippe',
    initiales: 'PH',
    nom: 'Philippe',
    email: 'philippe@setrim.fr',
    role: 'Conducteur de travaux',
    terrain: true,
  },
] as const;

const DEMO_PASSWORD = 'setrim2026';

export function WhoSwitcher() {
  const { data } = useSession();
  const [switching, setSwitching] = useState<string | null>(null);
  const me = data?.user?.initiales;

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
    // Recharge pour que Aujourd'hui / tâches suivent le nouveau collaborateur
    window.location.reload();
  }

  return (
    <div className="who-block">
      <div className="chip-edit" title="Chacun peut corriger une fiche — comme sur le papier">
        <span className="chip-pen" aria-hidden>
          ✎
        </span>
        Tout le monde peut modifier
      </div>
      <div className="who" role="group" aria-label="Changer de collaborateur">
        {COLLABORATEURS.map((u) => {
          const on = me === u.initiales;
          const busy = switching === u.initiales;
          return (
            <button
              key={u.id}
              type="button"
              data-u={u.initiales}
              data-terrain={u.terrain ? '1' : '0'}
              className={on ? 'on' : ''}
              title={`${u.nom} — ${u.role}`}
              aria-pressed={on}
              disabled={!!switching}
              onClick={() => switchTo(u.email, u.initiales)}
            >
              {busy ? '…' : u.initiales}
            </button>
          );
        })}
      </div>
    </div>
  );
}
