'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { SCREENS, MESSAGES_HREF } from '@/lib/format';
import { RemarquesDrawer } from '@/components/RemarquesDrawer';
import { WhoSwitcher } from '@/components/WhoSwitcher';
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
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    enableWebPush(user.id).catch(() => undefined);
  }, [user?.id]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
      if (/INPUT|TEXTAREA/.test((e.target as HTMLElement)?.tagName ?? '')) return;
      const s = SCREENS.find((x) => x.k === e.key);
      if (s) window.location.href = s.href;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  const screenTitle =
    title ??
    (pathname.startsWith(MESSAGES_HREF)
      ? 'Messagerie'
      : SCREENS.find((s) => pathname === s.href || pathname.startsWith(s.href + '/'))?.label) ??
    "Aujourd'hui";

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  function DeskNav() {
    return (
      <>
        {SCREENS.map((s) => {
          const on = pathname === s.href || pathname.startsWith(s.href + '/');
          return (
            <Link key={s.id} href={s.href} className={`nav-link${on ? ' on' : ''}`}>
              <span className="k">{s.k}</span>
              <span className="nav-label">{s.label}</span>
              {s.id === 'aujourdhui' && lateCount > 0 ? (
                <span className="badge">{lateCount}</span>
              ) : null}
            </Link>
          );
        })}
      </>
    );
  }

  function MobileNav() {
    return (
      <>
        {SCREENS.map((s) => {
          const on = pathname === s.href || pathname.startsWith(s.href + '/');
          return (
            <Link
              key={s.id}
              href={s.href}
              className={`nav-link${on ? ' on' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              <span className="k">{s.k}</span>
              <span className="nav-label">{s.label}</span>
              {s.id === 'aujourdhui' && lateCount > 0 ? (
                <span className="badge">{lateCount}</span>
              ) : null}
            </Link>
          );
        })}
        <Link
          href={MESSAGES_HREF}
          className={`nav-link${pathname.startsWith(MESSAGES_HREF) ? ' on' : ''}`}
          onClick={() => setMenuOpen(false)}
        >
          <span className="k">✉</span>
          <span className="nav-label">Messagerie</span>
          {unreadCount > 0 ? <span className="badge">{unreadCount}</span> : null}
        </Link>
        <button
          type="button"
          className="nav-link"
          onClick={() => {
            setMenuOpen(false);
            setNotesOpen(true);
          }}
        >
          <span className="k">R</span>
          <span className="nav-label">Remarques</span>
          {noteCount > 0 ? <span className="badge">{noteCount}</span> : null}
        </button>
      </>
    );
  }

  return (
    <div className="app">
      <aside className="rail desk-rail">
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
          <DeskNav />
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
          <button
            type="button"
            className="hamburger"
            aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span />
            <span />
            <span />
          </button>
          <div className="bar-title">
            <h2 id="screenTitle">{screenTitle}</h2>
            <div className="date">{today}</div>
          </div>
          <div className="spacer" />
          <WhoSwitcher />
          <Link
            href={MESSAGES_HREF}
            className={`btn-note btn-messages desk-only-inline${pathname.startsWith(MESSAGES_HREF) ? ' on' : ''}`}
          >
            Messagerie
            {unreadCount > 0 ? <span className="mono"> ({unreadCount})</span> : null}
          </Link>
          <button type="button" className="btn-note desk-only-inline" onClick={() => setNotesOpen(true)}>
            Remarques <span className="mono">({noteCount})</span>
          </button>
        </header>
        <div className="content">{children}</div>
        <SetrimFooter />
      </div>

      {menuOpen ? (
        <>
          <div className="menu-scrim" onClick={() => setMenuOpen(false)} aria-hidden />
          <aside className="mobile-drawer" role="dialog" aria-label="Menu">
            <div className="mobile-drawer-head">
              <Image
                src="/logo-setrim.png"
                alt="SETRIM"
                width={120}
                height={34}
                className="logo"
              />
              <button
                type="button"
                className="sheet-close"
                aria-label="Fermer"
                onClick={() => setMenuOpen(false)}
              >
                ✕
              </button>
            </div>
            <nav className="nav mobile-drawer-nav">
              <MobileNav />
            </nav>
            <div className="mobile-drawer-foot">
              {user ? (
                <>
                  <p>Connecté · {user.name}</p>
                  <button type="button" onClick={() => signOut({ callbackUrl: '/login' })}>
                    Se déconnecter
                  </button>
                </>
              ) : null}
            </div>
          </aside>
        </>
      ) : null}

      <RemarquesDrawer
        open={notesOpen}
        onClose={() => setNotesOpen(false)}
        ecran={screenTitle}
        onCount={setNoteCount}
      />
    </div>
  );
}
