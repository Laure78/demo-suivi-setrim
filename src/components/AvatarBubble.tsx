'use client';

/** Avatar : photo ou initiales */
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
    ? ({ width: size, height: size, fontSize: Math.round(size * 0.33) } as React.CSSProperties)
    : undefined;

  if (photo) {
    return (
      <span className={`av photo ${cls}`.trim()} style={style} title={label}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo} alt={label} />
      </span>
    );
  }

  return (
    <span className={`av ${cls}`.trim()} style={style} title={label}>
      {label.slice(0, 2).toUpperCase()}
    </span>
  );
}
