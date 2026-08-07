import type { ChecklistItem, PersistedState } from './types';
import {
  DEFAULT_ALERT_DELAIS,
  DEFAULT_COLOR_CODES,
  DEFAULT_COMMANDE_TYPE_LABELS,
} from './types';
import { createSeedState } from './seed';
import { JOURS_FERIES_FR } from './planning';

const STORAGE_KEY = 'setrim-plateforme-v19';
export const STATE_VERSION = 19;

function migrateItem(
  it: ChecklistItem & { history?: ChecklistItem['history']; ordre?: number },
  index: number,
): ChecklistItem {
  return {
    ...it,
    ordre: typeof it.ordre === 'number' ? it.ordre : index,
    history: Array.isArray(it.history) ? it.history : [],
    manuel: Boolean(it.manuel),
    archived: Boolean(it.archived),
  };
}

export function loadState(): PersistedState {
  if (typeof window === 'undefined') return createSeedState();
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) raw = localStorage.getItem('setrim-plateforme-v18');
    if (!raw) raw = localStorage.getItem('setrim-plateforme-v17');
    if (!raw) raw = localStorage.getItem('setrim-plateforme-v16');
    if (!raw) raw = localStorage.getItem('setrim-plateforme-v15');
    if (!raw) raw = localStorage.getItem('setrim-plateforme-v14');
    if (!raw) raw = localStorage.getItem('setrim-plateforme-v13');
    if (!raw) raw = localStorage.getItem('setrim-plateforme-v12');
    if (!raw) raw = localStorage.getItem('setrim-plateforme-v11');
    if (!raw) return createSeedState();
    const parsed = JSON.parse(raw) as PersistedState;
    if (!parsed || !Array.isArray(parsed.affaires)) return createSeedState();
    parsed.version = STATE_VERSION;
    if (!Array.isArray(parsed.actions)) parsed.actions = [];
    parsed.checklistItems = (parsed.checklistItems ?? []).map((it, i) => migrateItem(it, i));
    parsed.notas = (parsed.notas ?? []).map((n) => ({
      ...n,
      reports: Array.isArray(n.reports) ? n.reports : [],
    }));
    parsed.factures = (parsed.factures ?? []).map((f) => ({
      ...f,
      relances: Array.isArray(f.relances) ? f.relances : [],
      historique: Array.isArray(f.historique) ? f.historique : [],
    }));
    parsed.commandes = (parsed.commandes ?? []).map((c) => ({
      ...c,
      historique: Array.isArray(c.historique) ? c.historique : [],
    }));
    parsed.demandesPrix = (parsed.demandesPrix ?? []).map((d) => ({
      ...d,
      historique: Array.isArray(d.historique) ? d.historique : [],
    }));
    if (!parsed.settings) {
      parsed.settings = {
        alertDelais: { ...DEFAULT_ALERT_DELAIS },
        joursFeries: [],
        importMappings: {},
      };
    }
    if (!parsed.settings.importMappings) parsed.settings.importMappings = {};
    if (!parsed.settings.joursFeries?.length) {
      parsed.settings.joursFeries = [...JOURS_FERIES_FR];
    }
    parsed.settings.alertDelais = {
      ...DEFAULT_ALERT_DELAIS,
      ...parsed.settings.alertDelais,
    };
    parsed.settings.colorCodes = {
      ...DEFAULT_COLOR_CODES,
      ...parsed.settings.colorCodes,
    };
    parsed.settings.commandeTypeLabels = {
      ...DEFAULT_COMMANDE_TYPE_LABELS,
      ...parsed.settings.commandeTypeLabels,
    };
    if (!Array.isArray(parsed.journal)) parsed.journal = [];
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
