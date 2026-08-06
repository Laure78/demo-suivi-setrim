import type { Chantier, Contrat, Message, PersistedState } from './types';
import { addDays, todayISO } from './dates';
import { emptyUnreadByUser } from './messaging';
import { buildStandardChecklist } from './checklist-template';

const STORAGE_KEY = 'demo-suivi-etancheite-v5';
export const STATE_VERSION = 5;

/**
 * Données de départ fictives.
 * - Dupont / Voltaire : EN COURS
 * - Gymnase / Jaurès : PROGRAMMÉS (à venir)
 * Dates réparties sur ~8 semaines ; échéances Dupont restent parlantes (fait / retard / bientôt).
 */
export function createSeedState(): PersistedState {
  const t = todayISO();

  const chantiers: Chantier[] = [
    {
      id: 'chantier-dupont',
      title: 'Dupont',
      client: 'Cabinet Dupont',
      address: '12 rue des Lilas, 75011 Paris',
      startDate: addDays(t, -5),
      endDate: addDays(t, 16),
      teamId: 'equipe-a',
      actions: [
        {
          id: 'dupont-1',
          label: "Facture d'acompte envoyée",
          dueDate: addDays(t, -10),
          done: true,
          doneAt: new Date(addDays(t, -9) + 'T10:30:00').toISOString(),
          doneBy: 'Assistante 1',
        },
        {
          id: 'dupont-2',
          label: 'Commande de benne',
          dueDate: addDays(t, -2),
          done: false,
        },
        {
          id: 'dupont-3',
          label: 'Location roulotte',
          dueDate: addDays(t, 3),
          done: false,
        },
        {
          id: 'dupont-4',
          label: 'Situation n°1',
          dueDate: addDays(t, 14),
          done: false,
        },
        {
          id: 'dupont-5',
          label: 'DOE transmis',
          dueDate: addDays(t, 28),
          done: false,
        },
      ],
    },
    {
      id: 'chantier-voltaire',
      title: 'Résidence Voltaire',
      client: 'SCI Voltaire Habitat',
      address: '8 avenue Voltaire, 94200 Ivry-sur-Seine',
      startDate: addDays(t, -12),
      endDate: addDays(t, 10),
      teamId: 'equipe-b',
      actions: [
        {
          id: 'vol-1',
          label: "Facture d'acompte envoyée",
          dueDate: addDays(t, -15),
          done: true,
          doneAt: new Date(addDays(t, -14) + 'T09:00:00').toISOString(),
          doneBy: 'Assistante 2',
        },
        {
          id: 'vol-2',
          label: 'Commande de benne',
          dueDate: addDays(t, -11),
          done: true,
          doneAt: new Date(addDays(t, -11) + 'T14:00:00').toISOString(),
          doneBy: 'Responsable',
        },
        {
          id: 'vol-3',
          label: 'Situation n°1',
          dueDate: addDays(t, -1),
          done: false,
        },
        {
          id: 'vol-4',
          label: 'DOE transmis',
          dueDate: addDays(t, 12),
          done: false,
        },
      ],
    },
    {
      id: 'chantier-gymnase',
      title: 'Gymnase Est',
      client: 'Ville de Saint-Denis',
      address: '3 rue du Stade, 93200 Saint-Denis',
      startDate: addDays(t, 21),
      endDate: addDays(t, 42),
      teamId: 'equipe-a',
      actions: buildStandardChecklist(addDays(t, 21), addDays(t, 42), 'gym'),
    },
    {
      id: 'chantier-jaures',
      title: 'Copro Jaurès',
      client: 'Syndic Jaurès Gestion',
      address: '45 boulevard Jaurès, 92110 Clichy',
      startDate: addDays(t, 35),
      endDate: addDays(t, 56),
      teamId: 'equipe-c',
      actions: [
        ...buildStandardChecklist(addDays(t, 35), addDays(t, 56), 'jau'),
        {
          // Préparation en retard pour peupler le tableau de bord
          id: 'jau-retard-prep',
          label: 'Demande d’accès parties communes',
          dueDate: addDays(t, -3),
          done: false,
        },
      ],
    },
  ];

  const contrats: Contrat[] = [
    {
      id: 'contrat-1',
      client: 'Copropriété Les Acacias',
      anniversaryDate: addDays(t, -5),
      status: 'a_facturer',
    },
    {
      id: 'contrat-2',
      client: 'Mairie de Pantin — écoles',
      anniversaryDate: addDays(t, 20),
      status: 'a_facturer',
    },
  ];

  const messages: Message[] = [
    {
      id: 'msg-1',
      threadId: 'general',
      authorId: 'dirigeant',
      authorName: 'Dirigeant',
      text: 'Briefing du matin : on priorise la benne Dupont aujourd’hui.',
      createdAt: new Date(t + 'T07:45:00').toISOString(),
      isImportant: false,
    },
    {
      id: 'msg-2',
      threadId: 'general',
      authorId: 'melissa',
      authorName: 'Mélissa',
      text: 'OK, je suis sur Voltaire ce matin. Dispo après 14h pour Dupont.',
      createdAt: new Date(t + 'T07:52:00').toISOString(),
      isImportant: false,
    },
    {
      id: 'msg-3',
      threadId: 'chantier-dupont',
      authorId: 'assistante-1',
      authorName: 'Assistante 1',
      text: 'Acompte envoyé. J’attends le bon de commande benne.',
      createdAt: new Date(addDays(t, -1) + 'T16:20:00').toISOString(),
      isImportant: false,
    },
    {
      id: 'msg-4',
      threadId: 'chantier-dupont',
      authorId: 'responsable',
      authorName: 'Responsable',
      text: 'Pas de benne sur place demain matin — à traiter en urgence.',
      createdAt: new Date(t + 'T08:10:00').toISOString(),
      isImportant: true,
    },
    {
      id: 'msg-5',
      threadId: 'chantier-voltaire',
      authorId: 'assistante-2',
      authorName: 'Assistante 2',
      text: 'Situation n°1 à relancer — le client a demandé un devis complémentaire.',
      createdAt: new Date(addDays(t, -1) + 'T11:05:00').toISOString(),
      isImportant: false,
    },
  ];

  const unreadByUser = emptyUnreadByUser(chantiers);
  unreadByUser.dirigeant['chantier-dupont'] = 1;

  return {
    version: STATE_VERSION,
    activeUserId: 'dirigeant',
    chantiers,
    contrats,
    messages,
    unreadByUser,
  };
}

export function loadState(): PersistedState {
  if (typeof window === 'undefined') return createSeedState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSeedState();
    const parsed = JSON.parse(raw) as PersistedState;
    if (
      !parsed ||
      parsed.version !== STATE_VERSION ||
      !Array.isArray(parsed.chantiers) ||
      !Array.isArray(parsed.messages) ||
      !parsed.unreadByUser ||
      !parsed.chantiers[0]?.startDate
    ) {
      return createSeedState();
    }
    return parsed;
  } catch {
    return createSeedState();
  }
}

export function saveState(state: PersistedState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetState(): PersistedState {
  const seed = createSeedState();
  saveState(seed);
  return seed;
}

export { STORAGE_KEY };
