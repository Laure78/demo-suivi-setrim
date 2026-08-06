'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useApp } from '@/context/AppStateContext';
import { DEMO_PASSWORD_HINT } from '@/lib/domain/seed';
import { ROLE_LABELS } from '@/lib/domain/types';

export function LoginScreen() {
  const { state, login } = useApp();
  const [email, setEmail] = useState('denis@setrim.fr');
  const [password, setPassword] = useState(DEMO_PASSWORD_HINT);
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = login(email, password);
    if (!res.ok) setError(res.error);
    else setError('');
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-[#e8f4fc] to-slate-100 px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Image
            src="/logo-setrim.png"
            alt="SETRIM"
            width={220}
            height={60}
            priority
            className="h-14 w-auto"
          />
          <p className="text-center text-sm text-slate-600">
            Plateforme interne — planning, portefeuille, CE, check-lists
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Email</span>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Mot de passe</span>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          ) : null}
          <button type="submit" className="btn-primary w-full">
            Se connecter
          </button>
        </form>

        <div className="mt-6 border-t border-slate-100 pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Comptes démo (mdp : {DEMO_PASSWORD_HINT})
          </p>
          <ul className="space-y-1.5">
            {state.utilisateurs.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-50"
                  onClick={() => {
                    setEmail(u.email);
                    setPassword(u.password);
                  }}
                >
                  <span className="font-medium text-slate-800">{u.nom}</span>
                  <span className="text-xs text-slate-500">{ROLE_LABELS[u.role]}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
