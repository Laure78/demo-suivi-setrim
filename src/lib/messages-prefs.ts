/** Préférences messagerie côté client (pas de colonnes DB pour l’instant). */

const KEY = 'setrim-msg-prefs-v1';

export type MsgPrefs = {
  pinned: string[];
  muted: string[];
  archived: string[];
  /** threadId → ISO last-read */
  lastRead: Record<string, string>;
  /** messageIds pour lesquels une action a été créée */
  actionMsgs: string[];
};

function empty(): MsgPrefs {
  return { pinned: [], muted: [], archived: [], lastRead: {}, actionMsgs: [] };
}

export function loadMsgPrefs(): MsgPrefs {
  if (typeof window === 'undefined') return empty();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const j = JSON.parse(raw) as Partial<MsgPrefs>;
    return {
      pinned: Array.isArray(j.pinned) ? j.pinned : [],
      muted: Array.isArray(j.muted) ? j.muted : [],
      archived: Array.isArray(j.archived) ? j.archived : [],
      lastRead: j.lastRead && typeof j.lastRead === 'object' ? j.lastRead : {},
      actionMsgs: Array.isArray(j.actionMsgs) ? j.actionMsgs : [],
    };
  } catch {
    return empty();
  }
}

export function saveMsgPrefs(p: MsgPrefs) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(p));
}

export function toggleInList(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

/** Horodatage liste : 10:54 | Hier | lundi | 09/08/26 */
export function formatThreadTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startMsg = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startToday.getTime() - startMsg.getTime()) / 86400000);
  if (diffDays === 0) {
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Hier';
  if (diffDays > 1 && diffDays < 7) {
    return d.toLocaleDateString('fr-FR', { weekday: 'long' });
  }
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

/** Séparateur de date dans le fil */
export function formatDaySeparator(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startMsg = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startToday.getTime() - startMsg.getTime()) / 86400000);
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Hier';
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function sameDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

export function prenom(nom: string): string {
  return nom.trim().split(/\s+/)[0] ?? nom;
}
