'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export function ChangerMotDePasseView() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { update } = useSession();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    const r = await fetch('/api/auth/changer-mot-de-passe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, confirm }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) {
      setErr(j.error ?? 'Échec');
      return;
    }
    await update({ mustChangePassword: false });
    router.replace('/');
    router.refresh();
  }

  return (
    <div className="card" style={{ maxWidth: 420, margin: '40px auto', padding: 24 }}>
      <span className="eyebrow">Sécurité</span>
      <h2 style={{ marginTop: 6 }}>Changer le mot de passe</h2>
      <p className="hint">
        Votre compte a un mot de passe provisoire. Choisissez-en un personnel (8 caractères
        minimum) pour continuer.
      </p>
      <form onSubmit={submit} className="add-collab-form" style={{ marginTop: 16 }}>
        <label>
          Nouveau mot de passe
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </label>
        <label>
          Confirmer
          <input
            type="password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
        </label>
        {err ? <p className="err">{err}</p> : null}
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </form>
    </div>
  );
}
