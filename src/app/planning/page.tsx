import { Shell } from '@/components/Shell';
import { PlanningView } from '@/components/PlanningView';
import { prisma } from '@/lib/prisma';
import {
  daysInMonth,
  ensurePrestataires,
  isoDateUTC,
  isFerieUTC,
  isWeekendUTC,
  syncChantiersAuPlanning,
} from '@/lib/planning';

export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<{ annee?: string; mois?: string }> };

export default async function PlanningPage({ searchParams }: Props) {
  const sp = await searchParams;
  const now = new Date();
  const year = Number(sp.annee) || now.getFullYear();
  const monthParam = Number(sp.mois);
  const month =
    Number.isFinite(monthParam) && monthParam >= 1 && monthParam <= 12
      ? monthParam - 1
      : now.getMonth();

  await ensurePrestataires();
  await syncChantiersAuPlanning(year, month);

  // Enrichir quelques créneaux démo pour le mois affiché (prestataires + absences)
  await seedMonthDemo(year, month);

  const nDays = daysInMonth(year, month);
  const from = new Date(Date.UTC(year, month, 1));
  const to = new Date(Date.UTC(year, month, nDays));

  const equipes = await prisma.equipe.findMany({
    orderBy: { ordre: 'asc' },
    include: {
      slots: {
        where: { date: { gte: from, lte: to } },
        include: { affaire: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  const taches = await prisma.tache.findMany({
    where: {
      fait: false,
      dateEcheance: { gte: from, lte: to },
    },
  });

  const dayList = Array.from({ length: nDays }, (_, i) => {
    const day = i + 1;
    return {
      day,
      date: isoDateUTC(year, month, day),
      weekend: isWeekendUTC(year, month, day),
      ferie: isFerieUTC(year, month, day),
    };
  });

  return (
    <Shell title="Planning">
      <PlanningView
        year={year}
        month={month}
        equipes={equipes.map((e) => ({
          id: e.id,
          nom: e.nom,
          categorie: e.categorie,
          days: dayList.map((d) => {
            const slots = e.slots.filter(
              (s) => s.date.toISOString().slice(0, 10) === d.date,
            );
            const extra =
              e.ordre === 2
                ? taches
                    .filter((t) => t.dateEcheance.toISOString().slice(0, 10) === d.date)
                    .map((t) => ({
                      id: `tache-${t.id}`,
                      type: 'tache',
                      label: t.titre,
                      affaire: null as null,
                    }))
                : [];
            return {
              ...d,
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

/** Créneaux réalistes pour le mois (idempotent). */
async function seedMonthDemo(year: number, month: number) {
  if (year !== 2026) return;

  const affaires = await prisma.affaire.findMany({
    where: { statut: { in: ['programme', 'encours', 'commande'] } },
    take: 8,
  });
  const byNum = Object.fromEntries(affaires.map((a) => [a.numeroDevis, a]));

  const samples: { equipeId: string; day: number; type: string; label?: string; devis?: string }[] =
    [];

  if (month === 7) {
    // Août 2026 — reprise de la démo maquette
    samples.push(
      { equipeId: 'eq1', day: 10, type: 'chantier', label: 'FONCIA · 196 Av. Victor Hugo, 75016 Paris' },
      { equipeId: 'eq1', day: 11, type: 'chantier', label: 'FONCIA · 196 Av. Victor Hugo, 75016 Paris' },
      { equipeId: 'eq1', day: 14, type: 'chantier', devis: '41811-1B' },
      { equipeId: 'eq2', day: 10, type: 'chantier', devis: '41811-1B' },
      { equipeId: 'eq2', day: 11, type: 'chantier', devis: '41811-1B' },
      { equipeId: 'eq2', day: 12, type: 'chantier', devis: '40864' },
      { equipeId: 'eq3', day: 13, type: 'absent', label: 'CONGÉS' },
      { equipeId: 'eq3', day: 14, type: 'absent', label: 'CONGÉS' },
      { equipeId: 'eq4', day: 14, type: 'absent', label: 'ABSENT' },
      {
        equipeId: 'presta-echafaudage',
        day: 10,
        type: 'presta',
        label: 'Pose échafaudage · 74 Rue Mercadet, 75018 Paris',
      },
      {
        equipeId: 'presta-echafaudage',
        day: 11,
        type: 'presta',
        label: 'Dépose échafaudage · 74 Rue Mercadet, 75018 Paris',
      },
      {
        equipeId: 'presta-bennes',
        day: 10,
        type: 'presta',
        label: 'Benne 10 m³ · 66 Bd Jean Jaurès, 92110 Clichy',
      },
      {
        equipeId: 'presta-bennes',
        day: 14,
        type: 'presta',
        label: 'Reprise benne · 66 Bd Jean Jaurès, 92110 Clichy',
      },
    );
  }

  // Quelques absences récurrentes (1er lundi du mois pour eq3 si pas août)
  if (month !== 7) {
    for (let d = 1; d <= 7; d++) {
      const dow = new Date(Date.UTC(year, month, d)).getUTCDay();
      if (dow === 1) {
        samples.push({ equipeId: 'eq3', day: d, type: 'absent', label: 'FORMATION' });
        break;
      }
    }
    if (byNum['41447']) {
      samples.push({ equipeId: 'eq1', day: 15, type: 'chantier', devis: '41447' });
    }
    samples.push({
      equipeId: 'presta-bennes',
      day: 5,
      type: 'presta',
      label: 'Livraison benne · dépôt Aubervilliers',
    });
  }

  for (const s of samples) {
    const date = new Date(Date.UTC(year, month, s.day));
    const affaireId = s.devis && byNum[s.devis] ? byNum[s.devis].id : null;
    const label =
      s.label ??
      (affaireId && byNum[s.devis!]
        ? `${byNum[s.devis!].client} · ${byNum[s.devis!].adresse}`
        : null);

    const exists = await prisma.planningSlot.findFirst({
      where: {
        equipeId: s.equipeId,
        date,
        type: s.type,
      },
    });
    if (exists) continue;

    // Vérifier que l'équipe existe
    const eq = await prisma.equipe.findUnique({ where: { id: s.equipeId } });
    if (!eq) continue;

    await prisma.planningSlot.create({
      data: {
        equipeId: s.equipeId,
        date,
        type: s.type,
        label,
        affaireId,
      },
    });
  }
}
