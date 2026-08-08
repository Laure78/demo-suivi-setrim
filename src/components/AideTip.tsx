'use client';

import type { ReactNode } from 'react';

type Placement = 'top' | 'bottom' | 'left' | 'right';

/** Icône ? : consignes au survol (ou au focus clavier). */
export function AideTip({
  text,
  placement = 'bottom',
  label = 'Aide',
}: {
  text: string;
  placement?: Placement;
  label?: string;
}) {
  return (
    <span className={`aide-tip aide-${placement}`} tabIndex={0} aria-label={label}>
      <span className="aide-tip-mark" aria-hidden>
        ?
      </span>
      <span className="aide-tip-bubble" role="tooltip">
        {text}
      </span>
    </span>
  );
}

/** Libellé + icône d’aide (titres de section). */
export function AideLabel({
  children,
  aide,
  placement = 'bottom',
  as = 'span',
}: {
  children: ReactNode;
  aide: string;
  placement?: Placement;
  as?: 'span' | 'div';
}) {
  const Tag = as;
  return (
    <Tag className="aide-label">
      {children}
      <AideTip text={aide} placement={placement} />
    </Tag>
  );
}
