'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

const DEMO_USERS = [
  'audrey@setrim.fr',
  'melissa@setrim.fr',
  'valerie@setrim.fr',
  'denis@setrim.fr',
  'philippe@setrim.fr',
];

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('audrey@setrim.fr');
  const [password, setPassword] = useState('setrim2026');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await signIn('credentials', {
      email,
      password,
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

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={onSubmit}>
        <Image src="/logo-setrim.png" alt="SETRIM" width={180} height={52} priority />
        <h1>Connexion</h1>
        <p className="hint">Cinq comptes bureau — mot de passe démo commun.</p>
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
          Comptes : {DEMO_USERS.join(' · ')}
          <br />
          Mot de passe : <span className="mono">setrim2026</span>
        </div>
      </form>
    </div>
  );
}
