'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { BUREAU_ACCES, bureauPasswordFor } from '@/lib/bureau-acces';
import { ROLE_LABEL } from '@/lib/format';
import { SetrimFooter } from '@/components/SetrimFooter';

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState(BUREAU_ACCES[0].email);
  const [password, setPassword] = useState(BUREAU_ACCES[0].password);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function loginAs(targetEmail: string, targetPassword?: string) {
    setLoading(true);
    setError('');
    const pwd = targetPassword ?? bureauPasswordFor(targetEmail) ?? password;
    const res = await signIn('credentials', {
      email: targetEmail,
      password: pwd,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError('Identifiants incorrects.');
      return;
    }
    router.push(params.get('callbackUrl') || '/');
    router.refresh();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await loginAs(email, password);
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={onSubmit}>
        <Image src="/logo-setrim.png" alt="SETRIM" width={180} height={52} priority />
        <h1>Connexion</h1>
        <p className="hint">
          5 accès individuels bureau. Cliquez une personne pour entrer, ou saisissez email + mot de
          passe.
        </p>

        <div className="login-acces" aria-label="Accès individuels">
          <span className="eyebrow">Les 5 accès</span>
          <ul>
            {BUREAU_ACCES.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  className={`login-acces-btn${email === u.email ? ' on' : ''}`}
                  disabled={loading}
                  onClick={() => {
                    setEmail(u.email);
                    setPassword(u.password);
                    void loginAs(u.email, u.password);
                  }}
                >
                  <span className="login-acces-ini">{u.initiales}</span>
                  <span className="login-acces-txt">
                    <strong>{u.nom}</strong>
                    <span>{ROLE_LABEL[u.role] ?? u.role}</span>
                    <span className="mono login-acces-cred">
                      {u.email} · {u.password}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            const p = bureauPasswordFor(e.target.value);
            if (p) setPassword(p);
          }}
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
      </form>
      <SetrimFooter />
    </div>
  );
}
