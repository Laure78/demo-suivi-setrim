'use client';

import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

/** Bouton « Installer » — PWA téléchargeable sur téléphone / bureau. */
export function InstallAppButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
    }
    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onBip);
    window.addEventListener('appinstalled', () => setInstalled(true));
    return () => window.removeEventListener('beforeinstallprompt', onBip);
  }, []);

  if (installed) return null;

  async function install() {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === 'accepted') setDeferred(null);
      return;
    }
    // iOS / navigateurs sans beforeinstallprompt
    alert(
      "Pour télécharger l'app sur cet appareil :\n\n" +
        '• iPhone : Partager → Sur l’écran d’accueil\n' +
        '• Android / Chrome : menu ⋮ → Installer l’application',
    );
  }

  return (
    <button type="button" className="btn-install" onClick={install} title="Installer sur cet appareil">
      Télécharger l&apos;app
    </button>
  );
}
