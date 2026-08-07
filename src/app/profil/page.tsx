'use client';

import { useState } from 'react';
import { useApp } from '@/context/AppStateContext';
import { ROLE_LABELS } from '@/lib/domain/types';
import { disableWebPush, enableWebPush } from '@/lib/web-push-client';
import { Bell, BellOff } from 'lucide-react';

export default function ProfilPage() {
  const { user, state, updateNotificationPrefs } = useApp();
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  async function togglePush(enable: boolean) {
    setBusy(true);
    setStatus('');
    try {
      if (enable) {
        const res = await enableWebPush(user!.id);
        if (!res.ok) {
          setStatus(res.error ?? 'Échec');
          return;
        }
        updateNotificationPrefs({ push: true });
        setStatus('Notifications push activées sur cet appareil.');
      } else {
        await disableWebPush(user!.id);
        updateNotificationPrefs({ push: false });
        setStatus('Notifications push désactivées.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <h1 className="text-xl font-bold text-[var(--navy)] sm:text-2xl">Mon profil</h1>
        <p className="mt-1 text-sm text-slate-600">
          Compte, préférences et notifications push (mobile + desktop).
        </p>
      </div>

      <section className="card space-y-2">
        <p className="text-lg font-bold">{user.nom}</p>
        <p className="text-sm text-slate-600">{ROLE_LABELS[user.role]}</p>
        <p className="text-sm">
          <span className="text-slate-500">Email :</span> {user.email}
        </p>
        <p className="text-sm">
          <span className="text-slate-500">Téléphone :</span> {user.telephone}
        </p>
      </section>

      <section className="card space-y-3">
        <h2 className="font-bold">Notifications push</h2>
        <p className="text-sm text-slate-600">
          Recevoir une alerte même si l’application n’est pas ouverte (navigateur
          autorisé). Fonctionne sur Chrome / Safari desktop et mobile.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary"
            disabled={busy || user.preferencesNotifications.push}
            onClick={() => void togglePush(true)}
          >
            <Bell size={16} />
            Activer sur cet appareil
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={busy || !user.preferencesNotifications.push}
            onClick={() => void togglePush(false)}
          >
            <BellOff size={16} />
            Désactiver
          </button>
        </div>
        <p className="text-xs text-slate-500">
          État préférences : push{' '}
          <strong>{user.preferencesNotifications.push ? 'ON' : 'OFF'}</strong>
        </p>
        {status ? (
          <p className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-900">{status}</p>
        ) : null}
      </section>

      <section className="card">
        <h2 className="mb-2 font-bold">Comptes équipe (connexion)</h2>
        <ul className="divide-y text-sm">
          {state.utilisateurs.map((u) => (
            <li key={u.id} className="flex justify-between py-2">
              <span>
                {u.nom} · {u.email}
              </span>
              <span className="text-slate-500">{ROLE_LABELS[u.role]}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-slate-500">
          Mot de passe commun démo : <strong>setrim2026</strong> — ou accès unique{' '}
          <strong>setrim</strong> / setrim2026.
        </p>
      </section>
    </div>
  );
}
