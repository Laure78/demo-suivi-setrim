/** Avatar stocké dans avatarUrl : chemin image OU emoji (pas de / ni http). */

export function isImageAvatar(value?: string | null): boolean {
  if (!value) return false;
  return value.startsWith('/') || value.startsWith('http');
}

export function isEmojiAvatar(value?: string | null): boolean {
  if (!value || isImageAvatar(value)) return false;
  return value.trim().length > 0 && value.trim().length <= 8;
}

/** Emojis proposés pour le profil (BTP / bureau). */
export const AVATAR_EMOJIS = [
  '👷',
  '👷‍♀️',
  '🔧',
  '🏗️',
  '🧰',
  '🧱',
  '🏠',
  '📋',
  '✅',
  '⚠️',
  '📞',
  '✏️',
  '🚚',
  '☀️',
  '💼',
  '🤝',
  '👍',
  '💬',
] as const;
