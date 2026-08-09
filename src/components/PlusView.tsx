'use client';

import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { SCREENS, PLUS_MENU_IDS, ROLE_LABEL } from '@/lib/format';
import { AIDES } from '@/lib/aides';
import { AideTip } from '@/components/AideTip';
import { WhoSwitcher } from '@/components/WhoSwitcher';

const PLUS_SET = new Set<string>(PLUS_MENU_IDS);

export function PlusView() {
  const { data } = useSession();
  const user = data?.user;
  const items = SCREENS.filter((s) => PLUS_SET.has(s.id));

  return (
    <div className="plus-page">
      <p className="hint" style={{ marginTop: 0 }}>
        Accès aux écrans qui ne sont pas dans la barre du bas, plus le choix de compte bureau.
      </p>

      <nav className="plus-list" aria-label="Autres écrans">
        <Link href="/" className="plus-link">
          Accueil
        </Link>
        {items.map((s) => (
          <Link key={s.id} href={s.href} className="plus-link">
            {s.label}
          </Link>
        ))}
      </nav>

      <div className="plus-who">
        <div className="plus-who-head">
          <span className="eyebrow">Je suis</span>
          <AideTip text={AIDES.who} placement="bottom" label="Aide — Je suis" />
        </div>
        <WhoSwitcher />
        {user ? (
          <div className="plus-session">
            <strong>{user.name}</strong>
            <span>{ROLE_LABEL[user.role] ?? user.role}</span>
            <button type="button" onClick={() => signOut({ callbackUrl: '/login' })}>
              Se déconnecter
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
