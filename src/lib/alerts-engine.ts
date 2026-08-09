/**
 * Moteur d'alertes push — tâches + planning du jour + mentions.
 *
 * Niveaux :
 * - urgent (niveau ≥ 3 / retard) → push immédiat (ignore silence)
 * - normal → résumé / push le jour J (respecte silence)
 *
 * Une seule alerte par événement / jour. Ce qui est déjà traité dans la pop-up
 * (popup-done / popup-snooze / UrgenceTraitement) ne redéclenche pas de push.
 */

import { prisma } from '@/lib/prisma';
import { notifyUsers } from '@/lib/push-server';
import { daysLate } from '@/lib/format';
import { collectUrgencesForUser } from '@/lib/urgences';
import { differenceInCalendarDays, startOfDay } from 'date-fns';

function daysUntil(echeance: Date, now = new Date()): number {
  return differenceInCalendarDays(startOfDay(echeance), startOfDay(now));
}

async function alreadyLogged(
  userId: string,
  eventKey: string,
  kind: string,
  now: Date,
): Promise<boolean> {
  const hit = await prisma.notificationLog.findFirst({
    where: {
      userId,
      eventKey,
      kind,
      sentAt: { gte: startOfDay(now) },
    },
  });
  if (hit) return true;
  // Ancien format (tâche seule)
  if (eventKey.startsWith('tache:')) {
    const tacheId = eventKey.slice(6);
    const old = await prisma.notificationLog.findFirst({
      where: {
        userId,
        tacheId,
        kind,
        sentAt: { gte: startOfDay(now) },
      },
    });
    if (old) return true;
  }
  // Traité dans la pop-up aujourd’hui
  const treated = await prisma.notificationLog.findFirst({
    where: {
      userId,
      eventKey,
      kind: { in: ['popup-done', 'popup-snooze'] },
      sentAt: { gte: startOfDay(now) },
    },
  });
  return Boolean(treated);
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
    const eventKey = `tache:${t.id}`;
    const chantier = t.affaire
      ? t.affaire.client
      : (t.libelleAffaire ?? '').split('·')[0]?.trim() || 'SETRIM';
    const title = t.niveau >= 3 ? `Urgent — ${t.titre}` : t.titre;
    const body =
      (t.affaire
        ? `${t.affaire.client} · ${t.affaire.numeroDevis}`
        : t.libelleAffaire ?? '') + (late > 0 ? ` · en retard de ${late} j` : '');

    const kinds: { kind: string; escalate?: boolean }[] = [];

    if (t.niveau === 1 && until === 0) kinds.push({ kind: 'j0' });
    if (t.niveau >= 2) {
      if (until === 2) kinds.push({ kind: 'j-2' });
      if (until === 0) kinds.push({ kind: 'j0' });
      if (late >= 1) kinds.push({ kind: `daily-late-${late}` });
    }
    if (t.niveau === 3 && late >= 2) kinds.push({ kind: 'escalate', escalate: true });

    const isContrat = /contrat|entretien|CE/i.test(t.titre) || /CE ·/.test(t.libelleAffaire ?? '');
    const isRelance = /relance|impayé|demande de prix/i.test(t.titre);
    const alertType = isContrat
      ? ('contrats' as const)
      : isRelance
        ? ('relances' as const)
        : ('actions' as const);

    for (const { kind, escalate } of kinds) {
      const userIds = escalate
        ? [...new Set([t.responsableId, ...escalade.map((u) => u.id)])]
        : [t.responsableId];

      for (const uid of userIds) {
        if (await alreadyLogged(uid, eventKey, kind, now)) continue;

        const urgent = t.niveau >= 3 || late > 0 || Boolean(escalate);
        await notifyUsers({
          userIds: [uid],
          title: urgent ? title : `SETRIM — ${chantier}`,
          body: body || 'Tâche à traiter',
          url: t.affaireId
            ? `/portefeuille?affaire=${encodeURIComponent(t.affaireId)}`
            : '/aujourdhui',
          priority: urgent ? 'urgent' : 'normal',
          alertType,
          niveau: t.niveau,
        });

        await prisma.notificationLog.create({
          data: { userId: uid, tacheId: t.id, eventKey, kind },
        });
        sent++;
      }
    }
  }

  // Résumé matin : urgences du jour (planning + mentions) — une fois / utilisateur / jour
  const bureau = await prisma.user.findMany({
    where: { actif: true, terrain: false },
    select: { id: true },
  });

  for (const u of bureau) {
    const kind = 'morning-digest';
    if (await alreadyLogged(u.id, `digest:${u.id}`, kind, now)) continue;

    // Uniquement en matinée (6h–10h) pour le résumé normal
    const h = now.getHours();
    if (h < 6 || h > 10) continue;

    const urg = await collectUrgencesForUser(u.id, now);
    if (urg.count === 0) continue;

    // Regrouper par chantier
    const byChantier = new Map<string, number>();
    for (const it of [...urg.enRetard, ...urg.aujourdHui]) {
      byChantier.set(it.chantier, (byChantier.get(it.chantier) ?? 0) + 1);
    }
    const lines = [...byChantier.entries()]
      .slice(0, 4)
      .map(([c, n]) => `${c} (${n})`)
      .join(' · ');

    await notifyUsers({
      userIds: [u.id],
      title: `SETRIM — ${urg.count} urgence${urg.count > 1 ? 's' : ''} du jour`,
      body: lines || `${urg.enRetard.length} en retard · ${urg.aujourdHui.length} aujourd’hui`,
      url: '/',
      priority: urg.enRetard.length > 0 ? 'urgent' : 'normal',
      alertType: 'actions',
      niveau: urg.enRetard.length > 0 ? 3 : 2,
    });

    await prisma.notificationLog.create({
      data: {
        userId: u.id,
        eventKey: `digest:${u.id}`,
        kind,
      },
    });
    sent++;
  }

  return { checked: open.length, sent };
}
