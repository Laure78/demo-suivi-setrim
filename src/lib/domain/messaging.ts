import type { Message, PersistedState, PieceJointe, UserId } from './types';

/** ID stable pour un DM entre deux utilisateurs (ordre alphabétique). */
export function dmThreadId(a: UserId, b: UserId): string {
  return a < b ? `dm:${a}:${b}` : `dm:${b}:${a}`;
}

export function isDmThread(threadId: string): boolean {
  return threadId.startsWith('dm:');
}

export function dmPartner(threadId: string, me: UserId): UserId | null {
  if (!isDmThread(threadId)) return null;
  const parts = threadId.split(':');
  if (parts.length !== 3) return null;
  const [, u1, u2] = parts;
  return u1 === me ? u2 : u1;
}

export function messagesInThread(messages: Message[], threadId: string): Message[] {
  return messages
    .filter((m) => m.threadId === threadId)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function lastMessage(messages: Message[], threadId: string): Message | undefined {
  const list = messagesInThread(messages, threadId);
  return list[list.length - 1];
}

export function unreadCount(messages: Message[], threadId: string, userId: UserId): number {
  return messages.filter(
    (m) => m.threadId === threadId && m.auteurId !== userId && !m.luPar.includes(userId),
  ).length;
}

export function totalUnread(messages: Message[], userId: UserId): number {
  return messages.filter((m) => m.auteurId !== userId && !m.luPar.includes(userId)).length;
}

export function markThreadRead(
  messages: Message[],
  threadId: string,
  userId: UserId,
): Message[] {
  return messages.map((m) => {
    if (m.threadId !== threadId || m.luPar.includes(userId)) return m;
    return { ...m, luPar: [...m.luPar, userId] };
  });
}

export function destinatairesForThread(
  state: PersistedState,
  threadId: string,
  auteurId: UserId,
): UserId[] {
  if (threadId === 'general') {
    return state.utilisateurs.filter((u) => u.id !== auteurId && u.actif).map((u) => u.id);
  }
  if (isDmThread(threadId)) {
    const partner = dmPartner(threadId, auteurId);
    return partner ? [partner] : [];
  }
  // Fil chantier : toute l'équipe
  return state.utilisateurs.filter((u) => u.id !== auteurId && u.actif).map((u) => u.id);
}

export function compressImageFile(file: File, maxSide = 1280, quality = 0.72): Promise<PieceJointe> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Lecture fichier impossible'));
    reader.onload = () => {
      const dataUrl = String(reader.result);
      if (!file.type.startsWith('image/')) {
        resolve({
          id: `pj-${Date.now()}`,
          nom: file.name,
          mime: file.type || 'application/octet-stream',
          dataUrl,
        });
        return;
      }
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ id: `pj-${Date.now()}`, nom: file.name, mime: file.type, dataUrl });
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const out = canvas.toDataURL('image/jpeg', quality);
        resolve({
          id: `pj-${Date.now()}`,
          nom: file.name.replace(/\.\w+$/, '.jpg'),
          mime: 'image/jpeg',
          dataUrl: out,
        });
      };
      img.onerror = () => reject(new Error('Image invalide'));
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}
