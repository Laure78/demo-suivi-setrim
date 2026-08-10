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
import { registerServiceWorker } from '@/lib/web-push-client';
import { ACCES_LABEL, isAdministrateur, isExterne } from '@/lib/acces-labels';
import { UrgencesBell, UrgencesDuJour } from '@/components/UrgencesDuJour';
import { InstallBanner } from '@/components/InstallBanner';
import { Suspense, useCallback, useEffect, useState, type MouseEvent, type ReactNode } from 'react';

const NAV_AIDES: Record<string, string> = {
  aujourdhui: AIDES.navAujourdhui,
  messages: AIDES.navMessagerie,
  portefeuille: AIDES.navPortefeuille,
  clients: AIDES.navClients,
  planning: AIDES.navPlanning,
  contrats: AIDES.navContrats,
  facturation: AIDES.navFacturation,
  tutoriel: AIDES.tutoriel,
  administration: AIDES.navAdministration,
  parametres: AIDES.parametres,
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
  '/profil',
  '/administration',
  '/parametres',
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
  const isAdmin = isAdministrateur(user?.acces);
  const externe = isExterne(user?.acces);
  const [urgencesOpen, setUrgencesOpen] = useState(false);
  const [urgenceCount, setUrgenceCount] = useState(lateCount);

  const onUrgenceCount = useCallback((n: number) => setUrgenceCount(n), []);

  useEffect(() => {
    // Enregistre le SW pour la PWA sans demander la permission push
    registerServiceWorker().catch(() => undefined);
  }, []);

  useEffect(() => {
    setUrgenceCount((c) => (c > 0 ? c : lateCount));
  }, [lateCount]);

  useEffect(() => {
    if (externe) return;
    const onKey = (e: KeyboardEvent) => {
      if (/INPUT|TEXTAREA/.test((e.target as HTMLElement)?.tagName ?? '')) return;
      if (e.key === '9') {
        window.location.href = '/parametres';
        return;
      }
      const s = SCREENS.find((x) => x.k === e.key);
      if (s) window.location.href = s.href;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isAdmin, externe]);

  const screenTitle =
    title ??
    (pathname === '/'
      ? 'Accueil'
      : pathname === '/plus'
        ? 'Plus'
        : pathname.startsWith('/parametres') ||
            pathname.startsWith('/administration') ||
            pathname.startsWith('/profil')
          ? 'Paramètres'
          : pathname.startsWith('/changer-mot-de-passe')
            ? 'Mot de passe'
            : pathname.startsWith(MESSAGES_HREF)
              ? 'Messagerie'
              : SCREENS.find((s) => pathname === s.href || pathname.startsWith(s.href + '/'))
                  ?.label) ??
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
    if (externe) {
      return (
        <>
          <Link
            href={MESSAGES_HREF}
            className={`nav-link${pathname.startsWith(MESSAGES_HREF) ? ' on' : ''}`}
          >
            <span className="k">8</span>
            <span className="nav-label">Messagerie</span>
          </Link>
          <Link
            href="/parametres?tab=profil"
            className={`nav-link${pathname.startsWith('/parametres') ? ' on' : ''}`}
          >
            <span className="k">9</span>
            <span className="nav-label">Mon profil</span>
          </Link>
        </>
      );
    }
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
              {s.id === 'aujourdhui' && (urgenceCount > 0 || lateCount > 0) ? (
                <span className="badge">{urgenceCount || lateCount}</span>
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
        <Link
          href="/parametres"
          className={`nav-link${pathname.startsWith('/parametres') || pathname.startsWith('/profil') || pathname.startsWith('/administration') ? ' on' : ''}`}
          title={AIDES.parametres}
        >
          <span className="k">9</span>
          <span className="nav-label">Paramètres</span>
          <span className="aide-nav" onClick={stopAideClick} onKeyDown={(e) => e.stopPropagation()}>
            <AideTip text={AIDES.parametres} placement="right" />
          </span>
        </Link>
      </>
    );
  }

  return (
    <div className="app">
      <aside className="rail desk-rail">
        <div className="brand">
          <Link
            href={externe ? MESSAGES_HREF : '/'}
            className="brand-link"
            title={externe ? 'Messagerie' : 'Accueil — tableau de bord'}
            aria-label={externe ? 'Messagerie SETRIM' : 'Accueil SETRIM'}
          >
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
            {externe ? 'Espace participant' : "Suivi d'affaires"}
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
                <span>{ACCES_LABEL[user.acces] ?? 'Collaborateur'}</span>
                <span className="hint" style={{ color: 'rgba(255,255,255,.55)', fontSize: 11 }}>
                  {ROLE_LABEL[user.role] ?? user.role}
                </span>
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
          {!externe ? (
            <UrgencesBell
              count={urgenceCount}
              onOpen={() => setUrgencesOpen(true)}
            />
          ) : null}
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
          {!externe ? (
            <>
              <span className="aide-label desk-only-inline" style={{ marginRight: 4 }}>
                <AideTip text={AIDES.who} placement="bottom" label="Aide — Je suis" />
              </span>
              <WhoSwitcher />
            </>
          ) : (
            <Link href="/parametres?tab=profil" className="hint" style={{ marginLeft: 8 }}>
              Mon profil
            </Link>
          )}
        </header>

        {/* En-tête mobile compact */}
        <header className="bar mobile-bar" aria-label="En-tête">
          <Suspense fallback={<span className="mobile-bar-slot" aria-hidden />}>
            <MobileBackSlot />
          </Suspense>
          <div className="mobile-bar-center">
            <Link
              href={externe ? MESSAGES_HREF : '/'}
              className="mobile-logo-link"
              aria-label={externe ? 'Messagerie SETRIM' : 'Accueil SETRIM'}
            >
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
          <div className="mobile-bar-actions">
            <Link
              href={MESSAGES_HREF}
              className={`mobile-bar-msg${pathname.startsWith(MESSAGES_HREF) ? ' on' : ''}`}
              aria-label="Messagerie"
              title={AIDES.messagerie}
            >
              <MessageSquare size={22} strokeWidth={1.75} aria-hidden />
              {unreadCount > 0 ? (
                <span className="mobile-bar-msg-badge">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              ) : null}
            </Link>
            {!externe ? (
              <span className="mobile-bar-slot mobile-bar-urgences">
                <UrgencesBell
                  count={urgenceCount}
                  onOpen={() => setUrgencesOpen(true)}
                />
              </span>
            ) : (
              <Link
                href="/parametres?tab=profil"
                className="mobile-bar-msg"
                aria-label="Mon profil"
              >
                <span style={{ fontSize: 12, fontWeight: 700 }}>Profil</span>
              </Link>
            )}
          </div>
        </header>

        {!externe ? <InstallBanner /> : null}
        {!externe ? (
          <UrgencesDuJour
            open={urgencesOpen}
            onOpenChange={setUrgencesOpen}
            onCountChange={onUrgenceCount}
          />
        ) : null}

        <div className="content">{children}</div>
        <SetrimFooter />
      </div>

      <nav className="mobile-tabbar" aria-label="Navigation principale">
        {(externe
          ? [
              { id: 'messages', href: MESSAGES_HREF, label: 'Messages' },
              { id: 'profil', href: '/parametres?tab=profil', label: 'Profil' },
            ]
          : MOBILE_TABS
        ).map((tab) => {
          const on =
            tab.id === 'profil'
              ? pathname.startsWith('/parametres')
              : tabActive(tab.id, tab.href);
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`mobile-tab${on ? ' on' : ''}`}
              aria-current={on ? 'page' : undefined}
              title={tab.id === 'plus' ? AIDES.navPlus : undefined}
            >
              <span className="mobile-tab-ico">
                {TAB_ICONS[tab.id] ?? (
                  <span style={{ fontSize: 12, fontWeight: 700 }}>P</span>
                )}
                {tab.id === 'messages' && unreadCount > 0 ? (
                  <span className="mobile-tab-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                ) : null}
                {tab.id === 'plus' && (urgenceCount > 0 || lateCount > 0) ? (
                  <span className="mobile-tab-badge">
                    {(urgenceCount || lateCount) > 99 ? '99+' : urgenceCount || lateCount}
                  </span>
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
