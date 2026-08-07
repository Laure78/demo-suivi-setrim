/**
 * Moteur d'alertes — s'appuie uniquement sur Tache.dateEcheance et Tache.niveau.
 *
 * Niveau 1 : notification le jour J
 * Niveau 2 : J-2, J, puis rappel quotidien tant que fait = false
 * Niveau 3 : idem + escalade Valérie et Denis à J+2
 *
 * La seule façon d'éteindre une alerte est de cocher la tâche.
 */

import { prisma } from '@/lib/prisma';
import { notifyUsers } from '@/lib/push-server';
import { daysLate } from '@/lib/format';
import { differenceInCalendarDays, startOfDay } from 'date-fns';

function daysUntil(echeance: Date, now = new Date()): number {
  return differenceInCalendarDays(startOfDay(echeance), startOfDay(now));
}

export async function runAlertEngine(now = new Date()) {
  const open = await prisma.tache.findMany({
    where: { fait: false },
    include: { responsable: true, affaire: true },
  });

  const escalade = await prisma.user.findMany({
    where: { id: { in: ['valerie', 'denis'] } },
  });

  let sent = 0;

  for (const t of open) {
    const until = daysUntil(t.dateEcheance, now);
    const late = daysLate(t.dateEcheance, now);
    const title = t.niveau === 3 ? `Urgent — ${t.titre}` : t.titre;
    const body =
      (t.affaire
        ? `${t.affaire.client} · ${t.affaire.numeroDevis}`
        : t.libelleAffaire ?? '') + (late > 0 ? ` · en retard de ${late} j` : '');

    const kinds: string[] = [];

    if (t.niveau === 1 && until === 0) kinds.push('j0');
    if (t.niveau >= 2) {
      if (until === 2) kinds.push('j-2');
      if (until === 0) kinds.push('j0');
      if (late >= 1) kinds.push(`daily-late-${late}`);
    }
    if (t.niveau === 3 && late >= 2) kinds.push('escalate');

    for (const kind of kinds) {
      const already = await prisma.notificationLog.findFirst({
        where: {
          tacheId: t.id,
          kind,
          sentAt: {
            gte: startOfDay(now),
          },
        },
      });
      if (already) continue;

      const userIds =
        kind === 'escalate'
          ? [...new Set([t.responsableId, ...escalade.map((u) => u.id)])]
          : [t.responsableId];

      await notifyUsers({
        userIds,
        title,
        body: body || 'Tâche à traiter',
        url: '/aujourdhui',
      });

      for (const uid of userIds) {
        await prisma.notificationLog.create({
          data: { userId: uid, tacheId: t.id, kind },
        });
      }
      sent++;
    }
  }

  return { checked: open.length, sent };
}
