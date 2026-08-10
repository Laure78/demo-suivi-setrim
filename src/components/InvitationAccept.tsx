'use client';

import { FormEvent, useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export function InvitationAccept({ token }: { token: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState<{
    nom: string;
    email: string;
    societe: string;
    fonction: string;
    message: string;
    threadTitre: string;
    historyMode: string;
  } | null>(null);
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [telephone, setTelephone] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const r = await fetch(`/api/invitation/${token}`);
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr(j.error ?? 'Invitation invalide');
        setLoading(false);
        return;
      }
      setInfo(j);
      setLoading(false);
    })();
  }, [token]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== password2) {
      setErr('Les mots de passe ne correspondent pas.');
      return;
    }
    setBusy(true);
    setErr('');
    const r = await fetch(`/api/invitation/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, telephone }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setBusy(false);
      setErr(j.error ?? 'Impossible de finaliser');
      return;
    }
    const login = await signIn('credentials', {
      email: j.email,
      password,
      redirect: false,
    });
    setBusy(false);
    if (login?.error) {
      setErr('Compte créé — connectez-vous depuis la page d’accueil.');
      router.push('/login');
      return;
    }
    router.replace(`/messages?thread=${encodeURIComponent(j.threadKey)}`);
  }

  if (loading) {
    return <p className="hint">Chargement de l’invitation…</p>;
  }
  if (!info) {
    return (
      <div className="invite-box">
        <h1>Invitation</h1>
        <p className="err">{err || 'Lien invalide'}</p>
        <a href="/login">Retour à la connexion</a>
      </div>
    );
  }

  return (
    <div className="invite-box">
      <p className="eyebrow">Participant externe</p>
      <h1>Rejoindre la discussion</h1>
      <p>
        <strong>{info.threadTitre}</strong>
      </p>
      <p className="hint">
        {info.nom}
        {info.societe ? ` · ${info.societe}` : ''}
        {info.fonction ? ` · ${info.fonction}` : ''}
        <br />
        {info.email}
      </p>
      {info.message ? <blockquote className="invite-msg">{info.message}</blockquote> : null}
      <p className="hint">
        Historique :{' '}
        {info.historyMode === 'share_all'
          ? 'tout le fil vous sera visible'
          : 'uniquement les messages à partir de maintenant'}
      </p>
      <form onSubmit={onSubmit} className="add-collab-form">
        <label>
          Téléphone
          <input
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            autoComplete="tel"
          />
        </label>
        <label>
          Mot de passe
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
          Confirmer le mot de passe
          <input
            type="password"
            required
            minLength={8}
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            autoComplete="new-password"
          />
        </label>
        {err ? <p className="err">{err}</p> : null}
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Création…' : 'Accéder à la discussion'}
        </button>
      </form>
    </div>
  );
}
