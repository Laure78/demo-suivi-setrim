/**
 * Charge le planning d'un mois — même pipeline que l'ancienne page.
 * weekdaysOnly = true → grille ouvrée (legacy) ; false → L→D (agenda).
 */

import { prisma } from '@/lib/prisma';
import {
  daysInMonth,
  ensurePrestataires,
  isoDateUTC,
  isFerieUTC,
  isWeekendUTC,
  syncChantiersAuPlanning,
} from '@/lib/planning/core';
import { assurerLiensGlobaux } from '@/lib/affaire-lifecycle';
import type { EquipeRowInput } from '@/lib/planning/toCalendarEvents';

export type PlanningMonthData = {
  year: number;
  month: number;
  equipes: EquipeRowInput[];
};

/**
 * @param opts.range
 *   - `month` (défaut) : un mois (legacy + day/month ciblés)
 *   - `agenda` : juil. année-1 → juin année+1 (vue Année civile / exercice)
 */
export async function loadPlanningMonth(
  year: number,
  month: number,
  opts?: { weekdaysOnly?: boolean; range?: 'month' | 'agenda' },
): Promise<PlanningMonthData> {
  const weekdaysOnly = opts?.weekdaysOnly ?? false;
  const range = opts?.range ?? 'month';

  await ensurePrestataires();
  await assurerLiensGlobaux();
  await syncChantiersAuPlanning(year, month);
  await seedMonthDemo(year, month);

  const from =
    range === 'agenda'
      ? new Date(Date.UTC(year - 1, 6, 1))
      : new Date(Date.UTC(year, month, 1));
  const to =
    range === 'agenda'
      ? new Date(Date.UTC(year + 1, 5, 30))
      : new Date(Date.UTC(year, month, daysInMonth(year, month)));

  const equipesDb = await prisma.equipe.findMany({
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
    include: {
      affaire: { select: { id: true, equipeId: true, client: true, adresse: true } },
    },
  });

  const dayList: { day: number; date: string; weekend: boolean; ferie: boolean }[] = [];
  for (let t = from.getTime(); t <= to.getTime(); t += 86400000) {
    const d = new Date(t);
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    const day = d.getUTCDate();
    const weekend = isWeekendUTC(y, m, day);
    if (weekdaysOnly && weekend) continue;
    dayList.push({
      day,
      date: isoDateUTC(y, m, day),
      weekend,
      ferie: isFerieUTC(y, m, day),
    });
  }

  const defaultEquipeId =
    equipesDb.find((e) => e.categorie === 'equipe')?.id ?? equipesDb[0]?.id ?? null;

  const equipes: EquipeRowInput[] = equipesDb.map((e) => ({
    id: e.id,
    nom: e.nom,
    categorie: e.categorie,
    ordre: e.ordre,
    days: dayList.map((d) => {
      const slots = e.slots.filter((s) => s.date.toISOString().slice(0, 10) === d.date);
      const tacheSlots = taches
        .filter((t) => {
          if (t.dateEcheance.toISOString().slice(0, 10) !== d.date) return false;
          const target =
            t.affaire?.equipeId ?? defaultEquipeId;
          return target === e.id;
        })
        .map((t) => ({
          id: `tache-${t.id}`,
          type: 'tache',
          label: t.titre,
          affaireId: t.affaireId,
          niveau: t.niveau,
          affaire: t.affaire
            ? {
                id: t.affaire.id,
                client: t.affaire.client,
                numeroDevis: '',
                adresse: t.affaire.adresse,
              }
            : null,
        }));
      return {
        ...d,
        slots: [
          ...slots.map((s) => ({
            id: s.id,
            type: s.type,
            label: s.label,
            affaireId: s.affaireId,
            affaire: s.affaire
              ? {
                  id: s.affaire.id,
                  client: s.affaire.client,
                  numeroDevis: s.affaire.numeroDevis,
                  adresse: s.affaire.adresse,
                }
              : null,
          })),
          ...tacheSlots.filter(
            (x) => !slots.some((s) => s.type === 'tache' && s.label === x.label),
          ),
        ],
      };
    }),
  }));

  return { year, month, equipes };
}

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

  if (month !== 7) {
    for (let d = 1; d <= 7; d++) {
      const dow = new Date(Date.UTC(year, month, d)).getUTCDay();
      if (dow === 1) {
        samples.push({ equipeId: 'eq3', day: d, type: 'absent', label: 'UPDATE' });
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
      where: { equipeId: s.equipeId, date, type: s.type },
    });
    if (exists) continue;

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
