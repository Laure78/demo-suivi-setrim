'use client';

import { Suspense } from 'react';
import { MessagerieView } from '@/components/MessagerieView';

export default function MessageriePage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-[#d1d7db] bg-white p-6 text-sm text-[#667781]">
          Chargement…
        </div>
      }
    >
      <MessagerieView />
    </Suspense>
  );
}
