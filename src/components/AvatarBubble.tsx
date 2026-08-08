'use client';

import { isEmojiAvatar, isImageAvatar } from '@/lib/avatar';

/** Avatar : emoji, photo (legacy) ou initiales */
export function AvatarBubble({
  label,
  photo,
  cls = '',
  size,
}: {
  label: string;
  photo?: string | null;
  cls?: string;
  size?: number;
}) {
  const style = size
    ? ({
        width: size,
        height: size,
        fontSize: isEmojiAvatar(photo)
          ? Math.round(size * 0.55)
          : Math.round(size * 0.33),
      } as React.CSSProperties)
    : undefined;

  if (isEmojiAvatar(photo)) {
    return (
      <span className={`av emoji ${cls}`.trim()} style={style} title={label}>
        {photo}
      </span>
    );
  }

  if (isImageAvatar(photo)) {
    return (
      <span className={`av photo ${cls}`.trim()} style={style} title={label}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo!} alt={label} />
      </span>
    );
  }

  return (
    <span className={`av ${cls}`.trim()} style={style} title={label}>
      {label.slice(0, 2).toUpperCase()}
    </span>
  );
}
