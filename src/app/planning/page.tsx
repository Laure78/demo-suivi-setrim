import { Shell } from '@/components/Shell';
import { PlanningShell } from '@/components/planning/PlanningShell';
import { loadPlanningMonth } from '@/lib/planning/loadMonth';

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<{ annee?: string; mois?: string; vue?: string }>;
};

/** Nouvel agenda Jour / Semaine / Mois / Année. */
export default async function PlanningPage({ searchParams }: Props) {
  const sp = await searchParams;
  const now = new Date();
  const year = Number(sp.annee) || now.getFullYear();
  const monthParam = Number(sp.mois);
  const month =
    Number.isFinite(monthParam) && monthParam >= 1 && monthParam <= 12
      ? monthParam - 1
      : now.getMonth();
  const initialView =
    sp.vue === 'day' || sp.vue === 'week' || sp.vue === 'year' || sp.vue === 'month'
      ? sp.vue
      : 'month';

  const data = await loadPlanningMonth(year, month, {
    weekdaysOnly: false,
    range: 'agenda',
  });

  return (
    <Shell title="Planning">
      <PlanningShell
        year={data.year}
        month={data.month}
        equipes={data.equipes}
        initialView={initialView}
      />
    </Shell>
  );
}
