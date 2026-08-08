'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { COLLABORATEURS } from '@/components/WhoSwitcher';
import { SetrimFooter } from '@/components/SetrimFooter';

const DEMO_PASSWORD = 'setrim2026';

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('audrey@setrim.fr');
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function loginAs(targetEmail: string) {
    setLoading(true);
    setError('');
    const res = await signIn('credentials', {
      email: targetEmail,
      password: DEMO_PASSWORD,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError('Identifiants incorrects.');
      return;
    }
    router.push(params.get('callbackUrl') || '/aujourdhui');
    router.refresh();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await loginAs(email);
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={onSubmit}>
        <Image src="/logo-setrim.png" alt="SETRIM" width={180} height={52} priority />
        <h1>Connexion</h1>
        <p className="hint">
          Cliquez sur un collaborateur, ou connectez-vous. Ensuite, changez de compte via les pastilles
          AU · ME · VA · DE · PH en haut de chaque écran.
        </p>

        <div className="who login-who" role="group" aria-label="Choisir un collaborateur">
          {COLLABORATEURS.map((u) => (
            <button
              key={u.id}
              type="button"
              data-terrain={u.terrain ? '1' : '0'}
              className={email === u.email ? 'on' : ''}
              title={`${u.nom} — ${u.role}`}
              disabled={loading}
              onClick={() => {
                setEmail(u.email);
                loginAs(u.email);
              }}
            >
              {u.initiales}
            </button>
          ))}
        </div>

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          required
        />
        <label htmlFor="password">Mot de passe</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
        {error ? <p className="err">{error}</p> : null}
        <button className="primary" type="submit" disabled={loading}>
          {loading ? 'Connexion…' : 'Entrer'}
        </button>
        <div className="login-users">
          Mot de passe démo : <span className="mono">{DEMO_PASSWORD}</span>
        </div>
      </form>
      <SetrimFooter />
    </div>
  );
}
