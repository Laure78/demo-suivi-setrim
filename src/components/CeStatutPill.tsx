import type { CeStatutAffichage, CeStatutCle } from '@/lib/ce-statut';
import { CE_STATUT_LABEL } from '@/lib/ce-statut';

/** Pastille unique — liste contrats, fiche affaire, planning, tableau de bord. */
export function CeStatutPill({
  statut,
  cle,
  className = '',
}: {
  statut?: CeStatutAffichage | null;
  cle?: CeStatutCle;
  className?: string;
}) {
  const k = statut?.cle ?? cle ?? 'a_programmer';
  const label = statut?.label ?? CE_STATUT_LABEL[k];
  return (
    <span className={`ce-pill ce-pill--${k}${className ? ` ${className}` : ''}`}>
      {label}
    </span>
  );
}
