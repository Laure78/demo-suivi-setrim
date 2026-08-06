'use client';

import { Suspense } from 'react';
import { MessagerieView } from '@/components/MessagerieView';

export default function MessageriePage() {
  return (
    <div className="space-y-3">
      <div className="sm:mb-1">
        <h2 className="text-xl font-bold text-[var(--navy)] sm:text-2xl">Messagerie</h2>
        <p className="mt-1 text-sm text-slate-600">
          Échanges d’équipe hors boîte mail — un fil par chantier.
        </p>
      </div>
      <Suspense
        fallback={
          <div className="card text-sm text-slate-500">Chargement de la messagerie…</div>
        }
      >
        <MessagerieView />
      </Suspense>
    </div>
  );
}
