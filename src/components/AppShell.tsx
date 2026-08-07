'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  Briefcase,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  LogOut,
  MessageSquare,
  RotateCcw,
  Search,
  Settings,
  ShoppingCart,
  UserCircle,
} from 'lucide-react';
import { useApp } from '@/context/AppStateContext';
import { LoginScreen } from '@/components/LoginScreen';
import { SetrimFooter } from '@/components/SetrimFooter';
import { DemoBanner } from '@/components/DemoBanner';
import { QuickNotaFab } from '@/components/QuickNotaFab';
import { ROLE_LABELS } from '@/lib/domain/types';
import { canAdmin } from '@/lib/domain/permissions';
import { buildMesAlertes } from '@/lib/domain/alerts';
import { totalUnread } from '@/lib/domain/messaging';
import { globalSearch } from '@/lib/domain/search';
import { useMemo, useState } from 'react';

const NAV = [
  { href: '/', label: 'Mes alertes', icon: Bell },
  { href: '/mes-actions', label: 'Mes actions', icon: CheckSquare },
  { href: '/portefeuille', label: 'Portefeuille', icon: Briefcase },
  { href: '/planning', label: 'Planning', icon: CalendarDays },
  { href: '/planning-ce', label: 'Planning CE', icon: ClipboardList },
  { href: '/facturation', label: 'Factures', icon: FileText },
  { href: '/commandes', label: 'Commandes', icon: ShoppingCart },
  { href: '/documents', label: 'Documents', icon: FolderOpen },
  { href: '/import', label: 'Import', icon: FileSpreadsheet },
  { href: '/messagerie', label: 'Messagerie', icon: MessageSquare },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { ready, user, state, logout, resetDemo, setActiveUser } = useApp();
  const [q, setQ] = useState('');

  const alertCount = useMemo(() => {
    if (!user) return 0;
    return buildMesAlertes(state, user.id).filter((a) => a.bucket === 'retard').length;
  }, [state, user]);

  const unreadMsg = useMemo(() => {
    if (!user) return 0;
    return totalUnread(state.messages, user.id);
  }, [state.messages, user]);

  const myOpenActions = useMemo(() => {
    if (!user) return 0;
    return (state.actions ?? []).filter(
      (a) => a.assigneeId === user.id && a.statut === 'OUVERT',
    ).length;
  }, [state.actions, user]);

  const searchResults = useMemo(
    () =>
      globalSearch(state, q, 10).map((h) => ({
        label: h.sub ? `${h.label} · ${h.sub}` : h.label,
        href: h.href,
      })),
    [state, q],
  );

  if (!ready) return null;
  if (!user) {
    return (
      <div className="flex min-h-dvh flex-col">
        <DemoBanner />
        <div className="flex flex-1 flex-col">
          <LoginScreen />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <DemoBanner />
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2.5">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <Image
              src="/logo-setrim.png"
              alt="SETRIM étanchéité"
              width={180}
              height={48}
              priority
              className="h-9 w-auto sm:h-11"
            />
            <span className="hidden border-l border-slate-200 pl-3 text-sm font-semibold text-slate-600 lg:block">
              Plateforme interne
            </span>
          </Link>

          <div className="relative order-last w-full sm:order-none sm:max-w-xs sm:flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none ring-[var(--navy)] focus:bg-white focus:ring-2"
              placeholder="Recherche : adresse, syndic, devis, facture…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {searchResults.length > 0 ? (
              <ul className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                {searchResults.map((h) => (
                  <li key={h.href + h.label}>
                    <Link
                      href={h.href}
                      className="block px-3 py-2 text-sm hover:bg-slate-50"
                      onClick={() => setQ('')}
                    >
                      {h.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <span className="hidden sm:inline">Je suis</span>
              <select
                className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none ring-[var(--navy)] focus:ring-2"
                value={user.id}
                onChange={(e) => setActiveUser(e.target.value)}
                aria-label="Profil actif"
              >
                {state.utilisateurs.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nom} — {ROLE_LABELS[u.role]}
                  </option>
                ))}
              </select>
            </label>
            {canAdmin(user) ? (
              <Link
                href="/admin"
                className="rounded-lg border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50"
                title="Administration"
              >
                <Settings size={16} />
              </Link>
            ) : null}
            <Link
              href="/profil"
              className="rounded-lg border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50"
              title="Mon profil / notifications"
            >
              <UserCircle size={16} />
            </Link>
            <button
              type="button"
              onClick={() => {
                if (confirm('Réinitialiser la démo ?')) resetDemo();
              }}
              className="rounded-lg border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50"
              title="Reset démo"
            >
              <RotateCcw size={16} />
            </button>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50"
              title="Déconnexion"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        <nav className="border-t border-slate-100 bg-[var(--navy)]">
          <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-2 py-2">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active =
                href === '/'
                  ? pathname === '/'
                  : pathname === href || pathname.startsWith(`${href}/`);
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
                  {href === '/' && alertCount > 0 ? (
                    <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {alertCount}
                    </span>
                  ) : null}
                  {href === '/messagerie' && unreadMsg > 0 ? (
                    <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white">
                      {unreadMsg}
                    </span>
                  ) : null}
                  {href === '/mes-actions' && myOpenActions > 0 ? (
                    <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-slate-900">
                      {myOpenActions}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 pb-24">{children}</main>
      <QuickNotaFab />
      <SetrimFooter />
    </div>
  );
}
