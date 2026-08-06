'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, BellOff, X } from 'lucide-react';
import { useApp } from '@/context/AppStateContext';
import { buildDashboardAlerts, type DayAlert } from '@/lib/chantier-helpers';
import {
  ensureNotificationPermission,
  notificationSupported,
  pushBrowserAlerts,
} from '@/lib/browser-notifications';

const STYLE = {
  escalate: {
    bar: 'border-l-purple-600 bg-purple-50',
    badge: 'bg-purple-700 text-white',
    label: 'Escalade',
  },
  red: {
    bar: 'border-l-red-600 bg-red-50',
    badge: 'bg-red-600 text-white',
    label: 'Retard',
  },
  orange: {
    bar: 'border-l-orange-500 bg-orange-50',
    badge: 'bg-orange-600 text-white',
    label: 'À venir',
  },
} as const;

export function NotificationsCenter() {
  const { state } = useApp();
  const [open, setOpen] = useState(false);
  const [toasts, setToasts] = useState<DayAlert[]>([]);
  const [perm, setPerm] = useState<NotificationPermission | 'unsupported'>('default');
  const panelRef = useRef<HTMLDivElement>(null);
  const toastedRef = useRef<Set<string>>(new Set());

  const alerts = useMemo(
    () => buildDashboardAlerts(state.chantiers, state.contrats, state.messages),
    [state.chantiers, state.contrats, state.messages],
  );

  const urgentCount = alerts.filter(
    (a) => a.severity === 'escalate' || a.severity === 'red',
  ).length;

  useEffect(() => {
    if (!notificationSupported()) {
      setPerm('unsupported');
      return;
    }
    setPerm(Notification.permission);
  }, []);

  // Toasts + notifs navigateur à l'arrivée / changement d'alertes
  useEffect(() => {
    const critical = alerts.filter((a) => a.severity === 'escalate' || a.severity === 'red');
    const fresh = critical.filter((a) => !toastedRef.current.has(a.id));
    if (!fresh.length) return;

    for (const a of fresh) toastedRef.current.add(a.id);
    setToasts((prev) => [...fresh, ...prev].slice(0, 4));

    if (Notification.permission === 'granted') {
      pushBrowserAlerts(critical);
    }
  }, [alerts]);

  // Auto-dismiss toasts
  useEffect(() => {
    if (!toasts.length) return;
    const t = window.setTimeout(() => {
      setToasts((prev) => prev.slice(0, -1));
    }, 6000);
    return () => window.clearTimeout(t);
  }, [toasts]);

  // Fermer le panneau au clic extérieur
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  async function enableBrowserNotifs() {
    const p = await ensureNotificationPermission();
    setPerm(p);
    if (p === 'granted') pushBrowserAlerts(alerts);
  }

  return (
    <>
      {/* Toasts — mobile + desktop */}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[70] flex flex-col items-center gap-2 px-3 sm:items-end sm:px-4">
        {toasts.map((a) => {
          const st = STYLE[a.severity];
          return (
            <div
              key={`toast-${a.id}`}
              className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border border-slate-200 border-l-4 ${st.bar} p-3 shadow-lg animate-[slideIn_.25s_ease-out]`}
              role="alert"
            >
              <div className="min-w-0 flex-1">
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase ${st.badge}`}>
                  {st.label}
                </span>
                <p className="mt-1 text-sm font-bold text-slate-900">{a.title}</p>
                <p className="text-xs text-slate-600">{a.subtitle}</p>
                <Link
                  href={a.href}
                  className="mt-2 inline-block text-xs font-semibold text-[var(--navy)] hover:underline"
                  onClick={() => setToasts((prev) => prev.filter((x) => x.id !== a.id))}
                >
                  Ouvrir →
                </Link>
              </div>
              <button
                type="button"
                className="rounded-lg p-1 text-slate-500 hover:bg-white/80"
                onClick={() => setToasts((prev) => prev.filter((x) => x.id !== a.id))}
                aria-label="Fermer"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="relative" ref={panelRef}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="relative inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2.5 text-slate-700 hover:bg-slate-50"
          aria-label="Notifications"
          aria-expanded={open}
        >
          <Bell size={18} />
          {alerts.length > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {alerts.length > 9 ? '9+' : alerts.length}
            </span>
          ) : null}
        </button>

        {open ? (
          <div className="absolute right-0 z-[65] mt-2 w-[min(100vw-1.5rem,22rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sm:w-96">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div>
                <p className="text-sm font-bold text-[var(--navy)]">Notifications</p>
                <p className="text-xs text-slate-500">
                  {urgentCount} urgente{urgentCount > 1 ? 's' : ''} · {alerts.length} au total
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
              >
                <X size={16} />
              </button>
            </div>

            {perm !== 'granted' && perm !== 'unsupported' ? (
              <div className="border-b border-slate-100 bg-[var(--navy-soft)] px-4 py-3">
                <p className="text-xs text-slate-700">
                  Activez les notifications système pour être alerté hors de l’écran.
                </p>
                <button
                  type="button"
                  className="btn-primary mt-2 w-full py-2 text-xs"
                  onClick={enableBrowserNotifs}
                >
                  <Bell size={14} />
                  Activer les notifications
                </button>
              </div>
            ) : null}

            {perm === 'denied' ? (
              <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2 text-xs text-slate-500">
                <BellOff size={14} />
                Notifications navigateur bloquées dans les réglages
              </div>
            ) : null}

            <ul className="max-h-[min(60dvh,24rem)] overflow-y-auto">
              {alerts.length === 0 ? (
                <li className="px-4 py-8 text-center text-sm text-slate-500">
                  Aucune alerte pour le moment
                </li>
              ) : (
                alerts.map((a) => {
                  const st = STYLE[a.severity];
                  return (
                    <li key={a.id} className="border-b border-slate-50 last:border-0">
                      <Link
                        href={a.href}
                        onClick={() => setOpen(false)}
                        className={`block border-l-4 px-4 py-3 transition hover:bg-slate-50 ${st.bar}`}
                      >
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase ${st.badge}`}
                        >
                          {st.label}
                        </span>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{a.title}</p>
                        <p className="text-xs text-slate-600">{a.subtitle}</p>
                      </Link>
                    </li>
                  );
                })
              )}
            </ul>

            <div className="border-t border-slate-100 px-4 py-2">
              <Link
                href="/"
                onClick={() => setOpen(false)}
                className="block text-center text-xs font-semibold text-[var(--navy)] hover:underline"
              >
                Voir le tableau de bord
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
