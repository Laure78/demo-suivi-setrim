'use client';

import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const LS_DISMISS = 'setrim-pwa-install-dismiss';
const DAYS = 30;

function dismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(LS_DISMISS);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < DAYS * 86_400_000;
  } catch {
    return false;
  }
}

function markDismissed() {
  try {
    localStorage.setItem(LS_DISMISS, String(Date.now()));
  } catch {
    /* ignore */
  }
}

/** Bannière discrète d’installation PWA — refermable 30 jours. */
export function InstallBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }
    if (dismissedRecently()) return;

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    const onInstalled = () => {
      setInstalled(true);
      setShow(false);
    };
    window.addEventListener('beforeinstallprompt', onBip);
    window.addEventListener('appinstalled', onInstalled);

    // Safari / sans bip : proposer après un court délai si pas installé
    const t = window.setTimeout(() => {
      if (!window.matchMedia('(display-mode: standalone)').matches && !dismissedRecently()) {
        setShow(true);
      }
    }, 2500);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBip);
      window.removeEventListener('appinstalled', onInstalled);
      window.clearTimeout(t);
    };
  }, []);

  if (installed || !show) return null;

  async function install() {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === 'accepted') {
        setShow(false);
        setDeferred(null);
      }
      return;
    }
    alert(
      "Pour installer SETRIM sur votre bureau ou téléphone :\n\n" +
        '• Ordinateur (Chrome / Edge) : menu ⋮ → Installer SETRIM\n' +
        '• iPhone : Partager → Sur l’écran d’accueil\n' +
        '• Android : menu ⋮ → Installer l’application',
    );
  }

  function dismiss() {
    markDismissed();
    setShow(false);
  }

  return (
    <div className="pwa-banner" role="status">
      <p>Installer l’application sur votre bureau</p>
      <div className="pwa-banner-actions">
        <button type="button" className="btn-primary pwa-banner-install" onClick={() => void install()}>
          Installer
        </button>
        <button type="button" className="pwa-banner-dismiss" onClick={dismiss}>
          Plus tard
        </button>
      </div>
    </div>
  );
}

export function isAppInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // @ts-expect-error iOS Safari
    Boolean(window.navigator.standalone)
  );
}
