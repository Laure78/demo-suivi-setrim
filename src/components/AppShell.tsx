'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { SCREENS } from '@/lib/format';
import { RemarquesDrawer } from '@/components/RemarquesDrawer';
import { WhoSwitcher } from '@/components/WhoSwitcher';
import { InstallAppButton } from '@/components/InstallAppButton';
import { SetrimFooter } from '@/components/SetrimFooter';
import { useEffect, useState } from 'react';
import { enableWebPush } from '@/lib/web-push-client';

type Props = {
  children: React.ReactNode;
  lateCount?: number;
  unreadCount?: number;
  title?: string;
};

export function AppShell({ children, lateCount = 0, unreadCount = 0, title }: Props) {
  const pathname = usePathname();
  const { data } = useSession();
  const user = data?.user;
  const [notesOpen, setNotesOpen] = useState(false);
  const [noteCount, setNoteCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    enableWebPush(user.id).catch(() => undefined);
  }, [user?.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/INPUT|TEXTAREA/.test((e.target as HTMLElement)?.tagName ?? '')) return;
      const s = SCREENS.find((x) => x.k === e.key);
      if (s) window.location.href = s.href;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const screenTitle =
    title ??
    SCREENS.find((s) => pathname === s.href || pathname.startsWith(s.href + '/'))?.label ??
    "Aujourd'hui";

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="app">
      <aside className="rail">
        <div className="brand">
          <Image
            src="/logo-setrim.png"
            alt="SETRIM étanchéité"
            width={168}
            height={48}
            className="logo"
            priority
          />
          <p>
            Étanchéité · Aubervilliers
            <br />
            Suivi d&apos;affaires
          </p>
        </div>
        <nav className="nav" id="nav">
          {SCREENS.map((s) => {
            const on = pathname === s.href || pathname.startsWith(s.href + '/');
            return (
              <Link key={s.id} href={s.href} className={`nav-link${on ? ' on' : ''}`}>
                <span className="k">{s.k}</span>
                <span className="nav-label">{s.label}</span>
                {s.id === 'aujourdhui' && lateCount > 0 ? (
                  <span className="badge">{lateCount}</span>
                ) : null}
                {s.id === 'messages' && unreadCount > 0 ? (
                  <span className="badge">{unreadCount}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="rail-foot">
          {user ? (
            <>
              Connecté · {user.name}
              <br />
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/login' })}
                style={{ marginTop: 6, color: '#7EC4EC', textDecoration: 'underline' }}
              >
                Se déconnecter
              </button>
            </>
          ) : (
            'SETRIM'
          )}
        </div>
      </aside>

      <div className="main">
        <header className="bar">
          <div className="bar-title">
            <h2 id="screenTitle">{screenTitle}</h2>
            <div className="date">{today}</div>
          </div>
          <div className="spacer" />
          <WhoSwitcher />
          <InstallAppButton />
          <button type="button" className="btn-note" onClick={() => setNotesOpen(true)}>
            Remarques <span className="mono">({noteCount})</span>
          </button>
        </header>
        <div className="content">{children}</div>
        <SetrimFooter />
      </div>

      {/* Nav mobile bas d'écran */}
      <nav className="mobile-tabbar" aria-label="Navigation">
        {SCREENS.map((s) => {
          const on = pathname === s.href || pathname.startsWith(s.href + '/');
          const short =
            s.id === 'aujourdhui'
              ? "Aujourd'hui"
              : s.id === 'portefeuille'
                ? 'Portef.'
                : s.id === 'contrats'
                  ? 'Contrats'
                  : s.id === 'facturation'
                    ? 'Factures'
                    : s.label;
          return (
            <Link key={s.id} href={s.href} className={on ? 'on' : ''}>
              <span className="mt-k">{s.k}</span>
              <span className="mt-l">{short}</span>
              {s.id === 'aujourdhui' && lateCount > 0 ? (
                <span className="mt-badge">{lateCount}</span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <RemarquesDrawer
        open={notesOpen}
        onClose={() => setNotesOpen(false)}
        ecran={screenTitle}
        onCount={setNoteCount}
      />
    </div>
  );
}
