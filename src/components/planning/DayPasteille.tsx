'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { toIsoDay } from '@/lib/planning/dates';

/** Pastille jour partagée (layoutId) entre Année / Mois / bandeau Jour. */
export function DayPasteille({
  date,
  className,
  children,
}: {
  date: Date;
  className?: string;
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      layoutId={reduce ? undefined : `day-pasteille-${toIsoDay(date)}`}
      className={className}
      transition={{ type: 'spring', stiffness: 320, damping: 32 }}
    >
      {children}
    </motion.span>
  );
}
