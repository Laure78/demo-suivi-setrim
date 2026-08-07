'use client';

import { useEffect } from 'react';
import type { PlanningViewMode } from '@/components/planning/AgendaToolbar';

/** Échap + swipe depuis le bord gauche → zoom arrière. */
export function useZoomBackGestures(
  view: PlanningViewMode,
  zoomBack: () => void,
) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') zoomBack();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoomBack]);

  useEffect(() => {
    let tracking = false;
    let startX = 0;
    let startY = 0;
    function onStart(e: TouchEvent) {
      const t = e.touches[0];
      if (!t || t.clientX > 28) return;
      tracking = true;
      startX = t.clientX;
      startY = t.clientY;
    }
    function onEnd(e: TouchEvent) {
      if (!tracking) return;
      tracking = false;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - startX;
      const dy = Math.abs(t.clientY - startY);
      if (dx > 72 && dy < 48 && view !== 'year') zoomBack();
    }
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchend', onEnd);
    };
  }, [view, zoomBack]);
}
