'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { SCREENS, MESSAGES_HREF, ROLE_LABEL } from '@/lib/format';
import { AIDES } from '@/lib/aides';
import { AideTip } from '@/components/AideTip';
import { WhoSwitcher } from '@/components/WhoSwitcher';
import { SetrimFooter } from '@/components/SetrimFooter';
import { useEffect, useState, type MouseEvent } from 'react';
import { enableWebPush } from '@/lib/web-push-client';

const NAV_AIDES: Record<string, string> = {
  aujourdhui: AIDES.navAujourdhui,
  portefeuille: AIDES.navPortefeuille,
  clients: AIDES.navClients,
  planning: AIDES.navPlanning,
  contrats: AIDES.navContrats,
  facturation: AIDES.navFacturation,
  tutoriel: AIDES.tutoriel,
};

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
    (pathname === '/'
      ? 'Accueil'
      : pathname.startsWith(MESSAGES_HREF)
        ? 'Messagerie'
        : SCREENS.find((s) => pathname === s.href || pathname.startsWith(s.href + '/'))?.label) ??
    'Accueil';

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  function stopAideClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function DeskNav() {
    return (
      <>
        {SCREENS.map((s) => {
          const on = pathname === s.href || pathname.startsWith(s.href + '/');
          const aide = NAV_AIDES[s.id];
          return (
            <Link
              key={s.id}
              href={s.href}
              className={`nav-link${on ? ' on' : ''}`}
              title={aide}
            >
              <span className="k">{s.k}</span>
              <span className="nav-label">{s.label}</span>
              {s.id === 'aujourdhui' && lateCount > 0 ? (
                <span className="badge">{lateCount}</span>
              ) : null}
              {aide ? (
                <span className="aide-nav" onClick={stopAideClick} onKeyDown={(e) => e.stopPropagation()}>
                  <AideTip text={aide} placement="right" />
                </span>
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
              title={NAV_AIDES[s.id]}
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
          title={AIDES.messagerie}
          onClick={() => setMenuOpen(false)}
        >
          <span className="k">✉</span>
          <span className="nav-label">Messagerie</span>
          {unreadCount > 0 ? <span className="badge">{unreadCount}</span> : null}
        </Link>
      </>
    );
  }

  return (
    <div className="app">
      <aside className="rail desk-rail">
        <div className="brand">
          <Link href="/" className="brand-link" title="Accueil — tableau de bord" aria-label="Accueil SETRIM">
            <Image
              src="/logo-setrim.png"
              alt="SETRIM étanchéité"
              width={168}
              height={48}
              className="logo"
              priority
            />
          </Link>
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
              <div className="rail-who">
                <span className="rail-who-label">Connecté</span>
                <strong>{user.name}</strong>
                <span>{ROLE_LABEL[user.role] ?? user.role}</span>
              </div>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/login' })}
                style={{ marginTop: 8, color: '#7EC4EC', textDecoration: 'underline' }}
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
          <span className="aide-label desk-only-inline" style={{ marginRight: 4 }}>
            <AideTip text={AIDES.who} placement="bottom" label="Aide — Je suis" />
          </span>
          <WhoSwitcher />
          <span className="aide-label btn-messages-wrap">
            <Link
              href={MESSAGES_HREF}
              className={`btn-messages${pathname.startsWith(MESSAGES_HREF) ? ' on' : ''}`}
              title={AIDES.messagerie}
            >
              <span className="btn-messages-ico" aria-hidden>
                <svg viewBox="0 0 24 24" width="18" height="18">
                  <path
                    fill="currentColor"
                    d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"
                  />
                </svg>
              </span>
              <span className="btn-messages-label">Messagerie</span>
              {unreadCount > 0 ? (
                <span className="btn-messages-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
              ) : null}
            </Link>
            <span className="desk-only-inline">
              <AideTip text={AIDES.messagerie} placement="bottom" />
            </span>
          </span>
        </header>
        <div className="content">{children}</div>
        <SetrimFooter />
      </div>

      {menuOpen ? (
        <>
          <div className="menu-scrim" onClick={() => setMenuOpen(false)} aria-hidden />
          <aside className="mobile-drawer" role="dialog" aria-label="Menu">
            <div className="mobile-drawer-head">
              <Link
                href="/"
                className="brand-link"
                title="Accueil — tableau de bord"
                aria-label="Accueil SETRIM"
                onClick={() => setMenuOpen(false)}
              >
                <Image
                  src="/logo-setrim.png"
                  alt="SETRIM"
                  width={120}
                  height={34}
                  className="logo"
                />
              </Link>
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
                  <div className="rail-who">
                    <span className="rail-who-label">Connecté</span>
                    <strong>{user.name}</strong>
                    <span>{ROLE_LABEL[user.role] ?? user.role}</span>
                  </div>
                  <button type="button" onClick={() => signOut({ callbackUrl: '/login' })}>
                    Se déconnecter
                  </button>
                </>
              ) : null}
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}
