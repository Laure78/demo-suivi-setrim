'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

type Remarque = {
  id: string;
  texte: string;
  ecran: string;
  createdAt: string;
  user: { nom: string };
};

export function RemarquesDrawer({
  open,
  onClose,
  ecran,
  onCount,
}: {
  open: boolean;
  onClose: () => void;
  ecran: string;
  onCount: (n: number) => void;
}) {
  const { data } = useSession();
  const [list, setList] = useState<Remarque[]>([]);
  const [texte, setTexte] = useState('');

  async function load() {
    const r = await fetch('/api/remarques');
    if (!r.ok) return;
    const data = (await r.json()) as Remarque[];
    setList(data);
    onCount(data.length);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function add() {
    const v = texte.trim();
    if (!v) return;
    await fetch('/api/remarques', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texte: v, ecran }),
    });
    setTexte('');
    await load();
  }

  return (
    <>
      <div className={`scrim${open ? ' on' : ''}`} onClick={onClose} />
      <div className={`drawer${open ? ' open' : ''}`} id="drawer">
        <header>
          <h3>Remarques</h3>
          <p className="hint">
            Chacun peut écrire la sienne — c&apos;est la façon la plus simple de faire remonter ce
            qui ne colle pas.
          </p>
        </header>
        <div className="list" id="noteList">
          {list.length === 0 ? (
            <p className="hint">Aucune remarque pour l&apos;instant.</p>
          ) : (
            list.map((n) => (
              <div className="note" key={n.id}>
                <b>{n.user.nom}</b>
                <small>
                  · {n.ecran} ·{' '}
                  {new Date(n.createdAt).toLocaleString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </small>
                <p>{n.texte}</p>
              </div>
            ))
          )}
        </div>
        <footer>
          <textarea
            id="noteText"
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            placeholder="Ce qui manque, ce qui ne colle pas à votre façon de travailler…"
          />
          <button type="button" id="addNote" onClick={add} disabled={!data?.user}>
            Ajouter ma remarque
          </button>
        </footer>
      </div>
    </>
  );
}
