import type { PersistedState } from './types';
import { createSeedState } from './seed';

const STORAGE_KEY = 'setrim-plateforme-v9';
export const STATE_VERSION = 9;

export function loadState(): PersistedState {
  if (typeof window === 'undefined') return createSeedState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSeedState();
    const parsed = JSON.parse(raw) as PersistedState;
    if (!parsed || parsed.version !== STATE_VERSION || !Array.isArray(parsed.affaires)) {
      return createSeedState();
    }
    return parsed;
  } catch {
    return createSeedState();
  }
}

export function saveState(state: PersistedState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    console.warn('localStorage plein — état non sauvegardé');
  }
}

export function resetState(): PersistedState {
  const seed = createSeedState();
  saveState(seed);
  return seed;
}

export { STORAGE_KEY };
