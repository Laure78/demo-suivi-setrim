/**
 * Urgences du jour — agrège tâches, planning, mentions pour un utilisateur.
 * Une alerte = un événement (eventKey) ; un traitement popup bloque le push du jour.
 */

import { addDays, endOfDay, startOfDay, differenceInCalendarDays } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { daysLate } from '@/lib/format';

export type UrgenceBloc = 'retard' | 'aujourd_hui' | 'anticiper';

export type UrgenceItem = {
  eventKey: string;
  bloc: UrgenceBloc;
  kind: 'tache' | 'planning' | 'mention';
  titre: string;
  chantier: string;
  responsable: string;
  responsableId: string | null;
  niveau: number;
  dateEcheance: string;
  joursRetard: number;
  /** Lien vers la fiche / écran */
  href: string;
  affaireId: string | null;
  tacheId: string | null;
  /** Peut cocher « fait » côté serveur (tâche) */
  canToggle: boolean;
};

export type UrgencesPayload = {
  date: string;
  enRetard: UrgenceItem[];
  aujourdHui: UrgenceItem[];
  anticiper: UrgenceItem[];
  count: number;
};

function isoDay(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function mentionTokens(user: {
  id: string;
  nom: string;
  prenom: string;
  nomFamille: string;
  initiales: string;
}): string[] {
  const tokens = new Set<string>();
  const add = (s: string) => {
    const t = s.trim().toLowerCase();
    if (t.length >= 2) tokens.add(t);
  };
  add(user.id);
  add(user.nom);
  add(user.prenom);
  add(user.nomFamille);
  add(user.initiales);
  const first = user.prenom.trim() || user.nom.trim();
  if (first) add(first.split(/\s+/)[0]!);
  return [...tokens];
}

function isMentioned(texte: string | null | undefined, tokens: string[]): boolean {
  if (!texte) return false;
  const mentions = texte.match(/@(\w+)/g) ?? [];
  if (!mentions.length) return false;
  return mentions.some((m) => {
    const name = m.slice(1).toLowerCase();
    return tokens.some((t) => t.startsWith(name) || name.startsWith(t));
  });
}

export async function getActiveTraitements(userId: string, now = new Date()) {
  return prisma.urgenceTraitement.findMany({
    where: { userId, until: { gte: now } },
    select: { eventKey: true, action: true, until: true },
  });
}

export async function upsertTraitement(input: {
  userId: string;
  eventKey: string;
  action: 'done' | 'snooze';
  until: Date;
}) {
  return prisma.urgenceTraitement.upsert({
    where: {
      userId_eventKey: { userId: input.userId, eventKey: input.eventKey },
    },
    create: {
      userId: input.userId,
      eventKey: input.eventKey,
      action: input.action,
      until: input.until,
    },
    update: {
      action: input.action,
      until: input.until,
    },
  });
}

/** Collecte les urgences visibles pour un utilisateur (responsable ou mentionné). */
export async function collectUrgencesForUser(
  userId: string,
  now = new Date(),
): Promise<UrgencesPayload> {
  const today = startOfDay(now);
  const horizon = addDays(today, 7);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { date: isoDay(now), enRetard: [], aujourdHui: [], anticiper: [], count: 0 };
  }

  const traitements = await getActiveTraitements(userId, now);
  const muted = new Set(traitements.map((t) => t.eventKey));

  const taches = await prisma.tache.findMany({
    where: { responsableId: userId, fait: false },
    include: { affaire: true, responsable: true },
    orderBy: [{ dateEcheance: 'asc' }, { niveau: 'desc' }],
  });

  const items: UrgenceItem[] = [];

  for (const t of taches) {
    const eventKey = `tache:${t.id}`;
    if (muted.has(eventKey)) continue;

    const ech = startOfDay(t.dateEcheance);
    const late = daysLate(t.dateEcheance, now);
    const until = differenceInCalendarDays(ech, today);
    const chantier =
      t.libelleAffaire ??
      (t.affaire ? `${t.affaire.client} · ${t.affaire.adresse.split(',')[0]}` : 'Sans affaire');
    const href = t.affaireId
      ? `/portefeuille?affaire=${encodeURIComponent(t.affaireId)}`
      : '/aujourdhui';

    let bloc: UrgenceBloc | null = null;
    if (late > 0) bloc = 'retard';
    else if (until === 0) bloc = 'aujourd_hui';
    else if (until > 0 && until <= 7) bloc = 'anticiper';
    if (!bloc) continue;

    items.push({
      eventKey,
      bloc,
      kind: 'tache',
      titre: t.titre,
      chantier,
      responsable: t.responsable.nom,
      responsableId: t.responsableId,
      niveau: t.niveau,
      dateEcheance: t.dateEcheance.toISOString(),
      joursRetard: late,
      href,
      affaireId: t.affaireId,
      tacheId: t.id,
      canToggle: true,
    });
  }

  // Interventions planning (aujourd’hui + 7 j) — visibles pour le bureau
  const slots = await prisma.planningSlot.findMany({
    where: {
      date: { gte: today, lt: addDays(horizon, 1) },
      type: { in: ['chantier', 'ce'] },
    },
    include: { affaire: true, equipe: true },
    orderBy: { date: 'asc' },
  });

  for (const s of slots) {
    const eventKey = `planning:${s.id}`;
    if (muted.has(eventKey)) continue;
    const d = startOfDay(s.date);
    const until = differenceInCalendarDays(d, today);
    if (until < 0 || until > 7) continue;

    const chantier =
      s.label ??
      (s.affaire
        ? `${s.affaire.client} · ${s.affaire.adresse.split(',')[0]}`
        : s.equipe.nom);
    const titre =
      s.type === 'ce'
        ? `Entretien CE — ${s.affaire?.client ?? s.equipe.nom}`
        : `Intervention — ${s.affaire?.client ?? s.label ?? s.equipe.nom}`;
    const href = s.affaireId
      ? `/portefeuille?affaire=${encodeURIComponent(s.affaireId)}`
      : '/planning';

    items.push({
      eventKey,
      bloc: until === 0 ? 'aujourd_hui' : 'anticiper',
      kind: 'planning',
      titre,
      chantier,
      responsable: s.equipe.chef || s.equipe.nom,
      responsableId: null,
      niveau: until === 0 ? 2 : 1,
      dateEcheance: s.date.toISOString(),
      joursRetard: 0,
      href,
      affaireId: s.affaireId,
      tacheId: null,
      canToggle: false,
    });
  }

  // Mentions non lues (messages récents)
  const tokens = mentionTokens({
    id: user.id,
    nom: user.nom,
    prenom: user.prenom,
    nomFamille: user.nomFamille,
    initiales: user.initiales,
  });
  const recentMsgs = await prisma.message.findMany({
    where: {
      createdAt: { gte: addDays(today, -14) },
      auteurId: { not: userId },
      systeme: false,
      texte: { contains: '@' },
    },
    include: { affaire: true, auteur: true },
    orderBy: { createdAt: 'desc' },
    take: 80,
  });

  for (const m of recentMsgs) {
    if (!isMentioned(m.texte, tokens)) continue;
    const eventKey = `mention:${m.id}`;
    if (muted.has(eventKey)) continue;

    const threadId = m.threadKey;
    const chantier = m.affaire
      ? `${m.affaire.client} · ${m.affaire.adresse.split(',')[0]}`
      : 'Messagerie';
    const msgDay = startOfDay(m.createdAt);
    const until = differenceInCalendarDays(msgDay, today);

    items.push({
      eventKey,
      bloc: until < 0 ? 'retard' : until === 0 ? 'aujourd_hui' : 'anticiper',
      kind: 'mention',
      titre: `${m.auteur.nom} vous a mentionné`,
      chantier,
      responsable: m.auteur.nom,
      responsableId: m.auteurId,
      niveau: 2,
      dateEcheance: m.createdAt.toISOString(),
      joursRetard: until < 0 ? -until : 0,
      href: `/messages?thread=${encodeURIComponent(threadId)}`,
      affaireId: m.affaireId,
      tacheId: null,
      canToggle: false,
    });
  }

  // Dédup par eventKey (sécurité)
  const seen = new Set<string>();
  const unique = items.filter((i) => {
    if (seen.has(i.eventKey)) return false;
    seen.add(i.eventKey);
    return true;
  });

  const enRetard = unique
    .filter((i) => i.bloc === 'retard')
    .sort((a, b) => b.joursRetard - a.joursRetard || b.niveau - a.niveau);
  const aujourdHui = unique
    .filter((i) => i.bloc === 'aujourd_hui')
    .sort((a, b) => b.niveau - a.niveau);
  const anticiper = unique
    .filter((i) => i.bloc === 'anticiper')
    .sort(
      (a, b) =>
        new Date(a.dateEcheance).getTime() - new Date(b.dateEcheance).getTime() ||
        b.niveau - a.niveau,
    );

  return {
    date: isoDay(now),
    enRetard,
    aujourdHui,
    anticiper,
    count: enRetard.length + aujourdHui.length + anticiper.length,
  };
}

export function endOfToday(now = new Date()) {
  return endOfDay(now);
}

export function snoozeUntil(option: 'tomorrow' | '3days' | string, now = new Date()): Date {
  if (option === 'tomorrow') return endOfDay(addDays(startOfDay(now), 1));
  if (option === '3days') return endOfDay(addDays(startOfDay(now), 3));
  const d = new Date(option);
  if (Number.isNaN(d.getTime())) return endOfDay(addDays(startOfDay(now), 1));
  return endOfDay(d);
}
