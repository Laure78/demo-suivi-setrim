'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Bell } from 'lucide-react';
import { formatDateFr } from '@/lib/format';
import { AideTip } from '@/components/AideTip';
import { AIDES } from '@/lib/aides';
import type { UrgenceItem, UrgencesPayload } from '@/lib/urgences';

const LS_SEEN = 'setrim-urgences-seen';

function todayKey(userId: string) {
  const d = new Date();
  return `${userId}:${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function wasSeenToday(userId: string) {
  try {
    return localStorage.getItem(LS_SEEN) === todayKey(userId);
  } catch {
    return false;
  }
}

function markSeenToday(userId: string) {
  try {
    localStorage.setItem(LS_SEEN, todayKey(userId));
  } catch {
    /* ignore */
  }
}

function emptyPayload(): UrgencesPayload {
  return { date: '', enRetard: [], aujourdHui: [], anticiper: [], count: 0 };
}

export function UrgencesBell({
  onOpen,
  count,
}: {
  onOpen: () => void;
  count: number;
}) {
  return (
    <span className="urgences-bell-wrap">
      <button
        type="button"
        className="urgences-bell"
        onClick={onOpen}
        aria-label={
          count > 0 ? `Urgences du jour — ${count}` : 'Urgences du jour'
        }
        title="Urgences du jour"
      >
        <Bell size={18} strokeWidth={1.85} aria-hidden />
        {count > 0 ? (
          <span className="urgences-bell-badge">{count > 99 ? '99+' : count}</span>
        ) : null}
      </button>
      <span className="desk-only-inline">
        <AideTip text={AIDES.urgences} placement="bottom" />
      </span>
    </span>
  );
}

function UrgenceRow({
  item,
  busy,
  onDone,
  onSnooze,
}: {
  item: UrgenceItem;
  busy: boolean;
  onDone: (item: UrgenceItem) => void;
  onSnooze: (item: UrgenceItem, when: 'tomorrow' | '3days' | string) => void;
}) {
  const [menu, setMenu] = useState(false);
  const [custom, setCustom] = useState('');

  return (
    <li className={`urgence-row${item.bloc === 'retard' ? ' late' : ''}`}>
      <div className="urgence-row-main">
        <strong className="urgence-titre">{item.titre}</strong>
        <span className="urgence-meta">{item.chantier}</span>
        <span className="urgence-meta">
          Resp. {item.responsable}
          {item.bloc === 'retard' && item.joursRetard > 0
            ? ` · ${item.joursRetard} j de retard`
            : ''}
          {item.bloc === 'anticiper'
            ? ` · ${formatDateFr(item.dateEcheance)}`
            : ''}
        </span>
      </div>
      <div className="urgence-actions">
        <button
          type="button"
          className="urgence-btn done"
          disabled={busy}
          onClick={() => onDone(item)}
        >
          Fait
        </button>
        <div className="urgence-snooze">
          <button
            type="button"
            className="urgence-btn"
            disabled={busy}
            aria-expanded={menu}
            onClick={() => setMenu((m) => !m)}
          >
            Reporter
          </button>
          {menu ? (
            <div className="urgence-snooze-menu" role="menu">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenu(false);
                  onSnooze(item, 'tomorrow');
                }}
              >
                Demain
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenu(false);
                  onSnooze(item, '3days');
                }}
              >
                Dans 3 jours
              </button>
              <label className="urgence-snooze-date">
                Date
                <input
                  type="date"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                />
              </label>
              <button
                type="button"
                role="menuitem"
                disabled={!custom}
                onClick={() => {
                  if (!custom) return;
                  setMenu(false);
                  onSnooze(item, custom);
                }}
              >
                Valider la date
              </button>
            </div>
          ) : null}
        </div>
        <Link href={item.href} className="urgence-btn link" onClick={() => setMenu(false)}>
          Ouvrir
        </Link>
      </div>
    </li>
  );
}

function Bloc({
  title,
  tone,
  items,
  busy,
  onDone,
  onSnooze,
}: {
  title: string;
  tone: 'late' | 'today' | 'soon';
  items: UrgenceItem[];
  busy: boolean;
  onDone: (item: UrgenceItem) => void;
  onSnooze: (item: UrgenceItem, when: 'tomorrow' | '3days' | string) => void;
}) {
  if (!items.length) return null;
  return (
    <section className={`urgence-bloc tone-${tone}`}>
      <h3>
        {title}
        <span className="urgence-bloc-count">{items.length}</span>
      </h3>
      <ul>
        {items.map((item) => (
          <UrgenceRow
            key={item.eventKey}
            item={item}
            busy={busy}
            onDone={onDone}
            onSnooze={onSnooze}
          />
        ))}
      </ul>
    </section>
  );
}

/** Pop-up + feuille mobile + logique 1ʳᵉ ouverture du jour. */
export function UrgencesDuJour({
  open,
  onOpenChange,
  onCountChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCountChange: (n: number) => void;
}) {
  const { data } = useSession();
  const userId = data?.user?.id;
  const [payload, setPayload] = useState<UrgencesPayload>(emptyPayload());
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const r = await fetch('/api/urgences');
    if (!r.ok) return emptyPayload();
    const j = (await r.json()) as UrgencesPayload;
    setPayload(j);
    onCountChange(j.count);
    return j;
  }, [onCountChange]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void (async () => {
      const j = await refresh();
      if (cancelled) return;
      setLoaded(true);
      if (j.count > 0 && !wasSeenToday(userId)) {
        onOpenChange(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, refresh, onOpenChange]);

  function close() {
    if (userId) markSeenToday(userId);
    onOpenChange(false);
  }

  async function onDone(item: UrgenceItem) {
    setBusy(true);
    try {
      const r = await fetch('/api/urgences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventKey: item.eventKey, action: 'done' }),
      });
      if (r.ok) {
        const j = (await r.json()) as UrgencesPayload & { ok: boolean };
        setPayload(j);
        onCountChange(j.count);
      }
    } finally {
      setBusy(false);
    }
  }

  async function onSnooze(item: UrgenceItem, when: 'tomorrow' | '3days' | string) {
    setBusy(true);
    try {
      const r = await fetch('/api/urgences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventKey: item.eventKey,
          action: 'snooze',
          snooze: when,
        }),
      });
      if (r.ok) {
        const j = (await r.json()) as UrgencesPayload & { ok: boolean };
        setPayload(j);
        onCountChange(j.count);
      }
    } finally {
      setBusy(false);
    }
  }

  if (!open || !loaded) return null;

  const dateLabel = payload.date
    ? formatDateFr(payload.date)
    : formatDateFr(new Date());
  const empty = payload.count === 0;

  return (
    <div className="urgence-overlay" role="presentation" onClick={close}>
      <div
        className="urgence-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="urgence-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="urgence-head">
          <div>
            <p className="eyebrow">Alertes</p>
            <h2 id="urgence-title">Vos urgences du jour</h2>
            <p className="urgence-date">{dateLabel}</p>
          </div>
          <button type="button" className="urgence-close" onClick={close} aria-label="Fermer">
            ×
          </button>
        </header>

        <div className="urgence-body">
          {empty ? (
            <p className="urgence-empty">Rien d’urgent pour aujourd’hui. Bonne journée.</p>
          ) : (
            <>
              <Bloc
                title="En retard"
                tone="late"
                items={payload.enRetard}
                busy={busy}
                onDone={onDone}
                onSnooze={onSnooze}
              />
              <Bloc
                title="Aujourd’hui"
                tone="today"
                items={payload.aujourdHui}
                busy={busy}
                onDone={onDone}
                onSnooze={onSnooze}
              />
              <Bloc
                title="À anticiper"
                tone="soon"
                items={payload.anticiper}
                busy={busy}
                onDone={onDone}
                onSnooze={onSnooze}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
