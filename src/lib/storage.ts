import type { Chantier, Contrat, JournalEntry, Message, PersistedState } from './types';
import { addDays, todayISO } from './dates';
import { emptyUnreadByUser } from './messaging';
import { buildChecklistFromTemplate } from './checklist-template';

const STORAGE_KEY = 'demo-suivi-etancheite-v7';
export const STATE_VERSION = 7;

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
      templateId: 'refection',
      actions: [
        {
          id: 'dupont-1',
          label: "Facture d'acompte envoyée",
          dueDate: addDays(t, -10),
          done: true,
          doneAt: new Date(addDays(t, -9) + 'T10:30:00').toISOString(),
          doneBy: 'Melissa',
          assigneeId: 'melissa',
          photos: [],
        },
        {
          id: 'dupont-2',
          label: 'Commande de benne',
          dueDate: addDays(t, -2),
          done: false,
          assigneeId: 'valerie',
          photos: [],
        },
        {
          id: 'dupont-3',
          label: 'Location roulotte',
          dueDate: addDays(t, 3),
          done: false,
          assigneeId: 'valerie',
          photos: [],
        },
        {
          id: 'dupont-4',
          label: 'Situation n°1',
          dueDate: addDays(t, 14),
          done: false,
          assigneeId: 'melissa',
          photos: [],
        },
        {
          id: 'dupont-5',
          label: 'DOE transmis',
          dueDate: addDays(t, 28),
          done: false,
          assigneeId: 'audrey',
          photos: [],
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
      templateId: 'refection',
      actions: [
        {
          id: 'vol-1',
          label: "Facture d'acompte envoyée",
          dueDate: addDays(t, -15),
          done: true,
          doneAt: new Date(addDays(t, -14) + 'T09:00:00').toISOString(),
          doneBy: 'Audrey',
          assigneeId: 'audrey',
          photos: [],
        },
        {
          id: 'vol-2',
          label: 'Commande de benne',
          dueDate: addDays(t, -11),
          done: true,
          doneAt: new Date(addDays(t, -11) + 'T14:00:00').toISOString(),
          doneBy: 'Valérie',
          assigneeId: 'valerie',
          photos: [],
        },
        {
          // Escalade : retard > 5 j
          id: 'vol-3',
          label: 'Situation n°1',
          dueDate: addDays(t, -8),
          done: false,
          assigneeId: 'melissa',
          photos: [],
        },
        {
          id: 'vol-4',
          label: 'DOE transmis',
          dueDate: addDays(t, 12),
          done: false,
          assigneeId: 'audrey',
          photos: [],
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
      templateId: 'neuf',
      actions: buildChecklistFromTemplate('neuf', addDays(t, 21), 'gym'),
    },
    {
      id: 'chantier-jaures',
      title: 'Copro Jaurès',
      client: 'Syndic Jaurès Gestion',
      address: '45 boulevard Jaurès, 92110 Clichy',
      startDate: addDays(t, 35),
      endDate: addDays(t, 56),
      teamId: 'equipe-c',
      templateId: 'entretien',
      actions: [
        ...buildChecklistFromTemplate('entretien', addDays(t, 35), 'jau'),
        {
          id: 'jau-retard-prep',
          label: 'Demande d’accès parties communes',
          dueDate: addDays(t, -3),
          done: false,
          assigneeId: 'philippe',
          photos: [],
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
      status: 'a_venir',
    },
  ];

  const messages: Message[] = [
    {
      id: 'msg-1',
      threadId: 'general',
      authorId: 'denis',
      authorName: 'Denis',
      text: 'Briefing du matin : on priorise la benne Dupont aujourd’hui.',
      createdAt: new Date(t + 'T07:45:00').toISOString(),
      isImportant: false,
    },
    {
      id: 'msg-2',
      threadId: 'general',
      authorId: 'philippe',
      authorName: 'Philippe',
      text: 'OK, je suis sur Voltaire ce matin. Dispo après 14h pour Dupont.',
      createdAt: new Date(t + 'T07:52:00').toISOString(),
      isImportant: false,
    },
    {
      id: 'msg-3',
      threadId: 'chantier-dupont',
      authorId: 'melissa',
      authorName: 'Melissa',
      text: 'Acompte envoyé. J’attends le bon de commande benne.',
      createdAt: new Date(addDays(t, -1) + 'T16:20:00').toISOString(),
      isImportant: false,
    },
    {
      id: 'msg-4',
      threadId: 'chantier-dupont',
      authorId: 'valerie',
      authorName: 'Valérie',
      text: 'Pas de benne sur place demain matin — à traiter en urgence.',
      createdAt: new Date(t + 'T08:10:00').toISOString(),
      isImportant: true,
    },
    {
      id: 'msg-5',
      threadId: 'chantier-voltaire',
      authorId: 'audrey',
      authorName: 'Audrey',
      text: 'Situation n°1 à relancer — le client a demandé un devis complémentaire.',
      createdAt: new Date(addDays(t, -1) + 'T11:05:00').toISOString(),
      isImportant: false,
    },
  ];

  const journal: JournalEntry[] = [
    {
      id: 'j-1',
      chantierId: 'chantier-dupont',
      createdAt: new Date(addDays(t, -9) + 'T10:30:00').toISOString(),
      userId: 'melissa',
      userName: 'Melissa',
      kind: 'check',
      text: "Action cochée : Facture d'acompte envoyée",
      actionId: 'dupont-1',
    },
    {
      id: 'j-2',
      chantierId: 'chantier-dupont',
      createdAt: new Date(t + 'T08:10:00').toISOString(),
      userId: 'valerie',
      userName: 'Valérie',
      kind: 'message_important',
      text: 'Message important : Pas de benne sur place demain matin — à traiter en urgence.',
    },
  ];

  const unreadByUser = emptyUnreadByUser(chantiers);
  unreadByUser.denis['chantier-dupont'] = 1;

  return {
    version: STATE_VERSION,
    activeUserId: 'denis',
    chantiers,
    contrats,
    messages,
    journal,
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
      !Array.isArray(parsed.journal) ||
      !parsed.unreadByUser ||
      !parsed.chantiers[0]?.templateId
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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota localStorage (photos) — on ignore pour la démo
    console.warn('localStorage plein — état non sauvegardé');
  }
}

export function resetState(): PersistedState {
  const seed = createSeedState();
  saveState(seed);
  return seed;
}

export { STORAGE_KEY };
