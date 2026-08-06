'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, CheckSquare, ClipboardList, Home, MessageSquare, RotateCcw } from 'lucide-react';
import { useApp } from '@/context/AppStateContext';
import { USERS } from '@/lib/users';
import type { UserId } from '@/lib/types';
import { totalUnreadForUser } from '@/lib/messaging';
import { myOpenActions } from '@/lib/chantier-helpers';
import { SetrimFooter } from '@/components/SetrimFooter';
import { NotificationsCenter } from '@/components/NotificationsCenter';

const NAV = [
  { href: '/', label: 'Tableau de bord', icon: Home },
  { href: '/mes-actions', label: 'Mes actions', icon: CheckSquare },
  { href: '/planning', label: 'Planning', icon: CalendarDays },
  { href: '/messagerie', label: 'Messagerie', icon: MessageSquare },
  { href: '/contrats', label: 'Contrats d’entretien', icon: ClipboardList },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { activeUserId, setActiveUser, resetDemo, state } = useApp();
  const unread = totalUnreadForUser(state.unreadByUser, activeUserId);
  const myCount = myOpenActions(state.chantiers, activeUserId).length;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2.5">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <Image
              src="/logo-setrim.png"
              alt="SETRIM étanchéité"
              width={200}
              height={54}
              priority
              className="h-10 w-auto sm:h-12"
            />
            <span className="hidden border-l border-slate-200 pl-3 text-sm font-semibold text-slate-600 sm:block">
              Suivi chantier
            </span>
            <span className="rounded-md bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-800 sm:text-[11px]">
              Démo
            </span>
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <NotificationsCenter />
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <span className="hidden sm:inline">Je suis</span>
              <select
                className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none ring-[var(--navy)] focus:ring-2"
                value={activeUserId}
                onChange={(e) => setActiveUser(e.target.value as UserId)}
                aria-label="Utilisateur actif"
              >
                {USERS.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => {
                if (confirm('Réinitialiser la démo (données de départ) ?')) resetDemo();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              title="Réinitialiser la démo"
            >
              <RotateCcw size={14} />
              Reset
            </button>
          </div>
        </div>

        <nav className="border-t border-slate-100 bg-[var(--navy)]">
          <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 py-2">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active =
                href === '/'
                  ? pathname === '/'
                  : pathname === href || pathname.startsWith(`${href}/`);
              const showBadge = href === '/messagerie' && unread > 0;
              const showMyBadge = href === '/mes-actions' && myCount > 0;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? 'bg-white text-[var(--navy)]'
                      : 'text-blue-100 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                  {showBadge ? (
                    <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {unread}
                    </span>
                  ) : null}
                  {showMyBadge ? (
                    <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-slate-900">
                      {myCount}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 pb-10">{children}</main>

      <SetrimFooter />

      {/* Filigrane démo — ne bloque pas les clics */}
      <div
        className="demo-watermark pointer-events-none fixed inset-0 z-50 overflow-hidden"
        aria-hidden="true"
      >
        <p className="demo-watermark__text">Logiciel de démonstration</p>
      </div>
    </div>
  );
}
