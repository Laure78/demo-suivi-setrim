import { Shell } from '@/components/Shell';
import { PlanningView } from '@/components/PlanningView';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function PlanningPage() {
  const start = new Date(Date.UTC(2026, 7, 10));
  const days = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    return d;
  });

  const jours = days.map((d) =>
    d.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: '2-digit', timeZone: 'UTC' }),
  );

  const equipes = await prisma.equipe.findMany({
    orderBy: { ordre: 'asc' },
    include: {
      slots: {
        where: {
          date: { gte: days[0], lte: days[4] },
        },
        include: { affaire: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  // Also surface dated tasks as planning rows (hint in cadrage)
  const taches = await prisma.tache.findMany({
    where: {
      fait: false,
      dateEcheance: { gte: days[0], lte: days[4] },
    },
  });

  return (
    <Shell title="Planning">
      <PlanningView
        jours={jours.map((j) => j.charAt(0).toUpperCase() + j.slice(1))}
        equipes={equipes.map((e) => ({
          id: e.id,
          nom: e.nom,
          days: days.map((d) => {
            const iso = d.toISOString().slice(0, 10);
            const slots = e.slots.filter(
              (s) => s.date.toISOString().slice(0, 10) === iso,
            );
            // attach matching tasks to first equipe only for visibility
            const extra =
              e.ordre === 2
                ? taches
                    .filter((t) => t.dateEcheance.toISOString().slice(0, 10) === iso)
                    .map((t) => ({
                      id: `tache-${t.id}`,
                      type: 'tache',
                      label: t.titre,
                      affaire: null,
                    }))
                : [];
            return {
              date: iso,
              label: iso,
              slots: [
                ...slots.map((s) => ({
                  id: s.id,
                  type: s.type,
                  label: s.label,
                  affaire: s.affaire
                    ? {
                        client: s.affaire.client,
                        numeroDevis: s.affaire.numeroDevis,
                        adresse: s.affaire.adresse,
                      }
                    : null,
                })),
                ...extra.filter(
                  (x) => !slots.some((s) => s.type === 'tache' && s.label === x.label),
                ),
              ],
            };
          }),
        }))}
      />
    </Shell>
  );
}
