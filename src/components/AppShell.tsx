'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  Briefcase,
  CalendarDays,
  FileText,
  MessageSquare,
  MoreHorizontal,
} from 'lucide-react';
import {
  SCREENS,
  MESSAGES_HREF,
  ROLE_LABEL,
  MOBILE_TABS,
  PLUS_MENU_IDS,
} from '@/lib/format';
import { AIDES } from '@/lib/aides';
import { AideTip } from '@/components/AideTip';
import { WhoSwitcher } from '@/components/WhoSwitcher';
import { SetrimFooter } from '@/components/SetrimFooter';
import { enableWebPush } from '@/lib/web-push-client';
import { Suspense, useEffect, type MouseEvent, type ReactNode } from 'react';

const NAV_AIDES: Record<string, string> = {
  aujourdhui: AIDES.navAujourdhui,
  messages: AIDES.navMessagerie,
  portefeuille: AIDES.navPortefeuille,
  clients: AIDES.navClients,
  planning: AIDES.navPlanning,
  contrats: AIDES.navContrats,
  facturation: AIDES.navFacturation,
  tutoriel: AIDES.tutoriel,
};

const TAB_ICONS: Record<string, ReactNode> = {
  messages: <MessageSquare size={22} strokeWidth={1.75} aria-hidden />,
  planning: <CalendarDays size={22} strokeWidth={1.75} aria-hidden />,
  affaires: <Briefcase size={22} strokeWidth={1.75} aria-hidden />,
  contrats: <FileText size={22} strokeWidth={1.75} aria-hidden />,
  plus: <MoreHorizontal size={22} strokeWidth={1.75} aria-hidden />,
};

const PLUS_HREFS = new Set([
  '/plus',
  '/',
  ...SCREENS.filter((s) => (PLUS_MENU_IDS as readonly string[]).includes(s.id)).map((s) => s.href),
]);

type Props = {
  children: React.ReactNode;
  lateCount?: number;
  unreadCount?: number;
  title?: string;
};

function MobileBackSlot() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const detailBackHref = (() => {
    if (searchParams.get('thread')) return MESSAGES_HREF;
    if (searchParams.get('affaire') || searchParams.get('devis')) return '/portefeuille';
    if (searchParams.get('client')) return '/clients';
    return null;
  })();

  if (!detailBackHref) {
    return <span className="mobile-bar-slot" aria-hidden />;
  }

  return (
    <button
      type="button"
      className="mobile-back"
      aria-label="Retour"
      onClick={() => router.push(detailBackHref)}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
        <path
          fill="currentColor"
          d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"
        />
      </svg>
    </button>
  );
}

export function AppShell({ children, lateCount = 0, unreadCount = 0, title }: Props) {
  const pathname = usePathname();
  const { data } = useSession();
  const user = data?.user;

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
    (pathname === '/'
      ? 'Accueil'
      : pathname === '/plus'
        ? 'Plus'
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

  function tabActive(tabId: string, href: string) {
    if (tabId === 'plus') {
      return PLUS_HREFS.has(pathname) || pathname.startsWith('/plus');
    }
    if (tabId === 'affaires') {
      return pathname.startsWith('/portefeuille') || pathname.startsWith('/affaires');
    }
    if (tabId === 'messages') {
      return pathname.startsWith(MESSAGES_HREF);
    }
    return pathname === href || pathname.startsWith(href + '/');
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
              {s.id === 'messages' && unreadCount > 0 ? (
                <span className="badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
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
        {/* En-tête desktop — inchangé */}
        <header className="bar desk-bar">
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

        {/* En-tête mobile compact */}
        <header className="bar mobile-bar" aria-label="En-tête">
          <Suspense fallback={<span className="mobile-bar-slot" aria-hidden />}>
            <MobileBackSlot />
          </Suspense>
          <div className="mobile-bar-center">
            <Link href="/" className="mobile-logo-link" aria-label="Accueil SETRIM">
              <Image
                src="/logo-setrim.png"
                alt="SETRIM"
                width={110}
                height={28}
                className="mobile-logo"
                priority
              />
            </Link>
            <p className="mobile-page-title">{screenTitle}</p>
          </div>
          <span className="mobile-bar-slot" aria-hidden />
        </header>

        <div className="content">{children}</div>
        <SetrimFooter />
      </div>

      <nav className="mobile-tabbar" aria-label="Navigation principale">
        {MOBILE_TABS.map((tab) => {
          const on = tabActive(tab.id, tab.href);
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`mobile-tab${on ? ' on' : ''}`}
              aria-current={on ? 'page' : undefined}
              title={tab.id === 'plus' ? AIDES.navPlus : undefined}
            >
              <span className="mobile-tab-ico">
                {TAB_ICONS[tab.id]}
                {tab.id === 'messages' && unreadCount > 0 ? (
                  <span className="mobile-tab-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                ) : null}
                {tab.id === 'plus' && lateCount > 0 ? (
                  <span className="mobile-tab-badge">{lateCount > 99 ? '99+' : lateCount}</span>
                ) : null}
              </span>
              <span className="mobile-tab-label">{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
