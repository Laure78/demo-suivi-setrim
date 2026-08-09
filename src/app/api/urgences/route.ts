import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { addDays, endOfDay, startOfDay } from 'date-fns';
import { prisma } from '@/lib/prisma';
import {
  collectUrgencesForUser,
  endOfToday,
  snoozeUntil,
  upsertTraitement,
} from '@/lib/urgences';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const data = await collectUrgencesForUser(session.user.id);
  return NextResponse.json(data);
}

/**
 * Actions pop-up : fait | reporter
 * Body: { eventKey, action: 'done'|'snooze', snooze?: 'tomorrow'|'3days'|ISO date, tacheId? }
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const eventKey = String(body.eventKey ?? '');
  const action = body.action as 'done' | 'snooze';
  if (!eventKey || (action !== 'done' && action !== 'snooze')) {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });
  }

  const userId = session.user.id;
  const now = new Date();

  // Tâche : cocher ou reporter l’échéance
  if (eventKey.startsWith('tache:')) {
    const tacheId = eventKey.slice('tache:'.length);
    const tache = await prisma.tache.findUnique({ where: { id: tacheId } });
    if (!tache) return NextResponse.json({ error: 'Tâche introuvable' }, { status: 404 });
    if (tache.responsableId !== userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    if (action === 'done') {
      await prisma.tache.update({
        where: { id: tacheId },
        data: { fait: true, faitAt: now },
      });
      await upsertTraitement({
        userId,
        eventKey,
        action: 'done',
        until: endOfToday(now),
      });
      // Empêche un push le même jour pour cet événement
      await prisma.notificationLog.create({
        data: {
          userId,
          tacheId,
          eventKey,
          kind: 'popup-done',
        },
      });
    } else {
      const ech =
        body.snooze === 'tomorrow'
          ? startOfDay(addDays(now, 1))
          : body.snooze === '3days'
            ? startOfDay(addDays(now, 3))
            : startOfDay(new Date(String(body.snooze)));
      const safeEch = Number.isNaN(ech.getTime())
        ? startOfDay(addDays(now, 1))
        : ech;
      await prisma.tache.update({
        where: { id: tacheId },
        data: { dateEcheance: safeEch },
      });
      await upsertTraitement({
        userId,
        eventKey,
        action: 'snooze',
        until: endOfDay(safeEch),
      });
      await prisma.notificationLog.create({
        data: {
          userId,
          tacheId,
          eventKey,
          kind: 'popup-snooze',
        },
      });
    }
  } else {
    // Planning / mention : « fait » masque 30 j ; « reporter » jusqu’à la date choisie
    const until =
      action === 'done'
        ? endOfDay(addDays(startOfDay(now), 30))
        : snoozeUntil(String(body.snooze ?? 'tomorrow'), now);

    await upsertTraitement({ userId, eventKey, action, until });
    await prisma.notificationLog.create({
      data: {
        userId,
        eventKey,
        kind: action === 'done' ? 'popup-done' : 'popup-snooze',
      },
    });
  }

  const data = await collectUrgencesForUser(userId);
  return NextResponse.json({ ok: true, ...data });
}
