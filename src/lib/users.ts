import type { AppUser, Team, TeamId } from './types';

export const USERS: AppUser[] = [
  { id: 'dirigeant', name: 'Dirigeant', role: 'Gérant' },
  { id: 'assistante-1', name: 'Assistante 1', role: 'Admin' },
  { id: 'assistante-2', name: 'Assistante 2', role: 'Admin' },
  { id: 'responsable', name: 'Responsable', role: 'Chantier' },
  { id: 'melissa', name: 'Mélissa', role: 'Terrain' },
];

export function getUser(id: string): AppUser {
  return USERS.find((u) => u.id === id) ?? USERS[0];
}

export const TEAMS: Team[] = [
  {
    id: 'equipe-a',
    label: 'Équipe A — Toitures',
    shortLabel: 'Équipe A',
    color: '#0070ba',
    bg: '#dbeafe',
  },
  {
    id: 'equipe-b',
    label: 'Équipe B — Terrasses',
    shortLabel: 'Équipe B',
    color: '#0f766e',
    bg: '#ccfbf1',
  },
  {
    id: 'equipe-c',
    label: 'Équipe C — Urgences',
    shortLabel: 'Équipe C',
    color: '#9a3412',
    bg: '#ffedd5',
  },
];

export function getTeam(id: TeamId): Team {
  return TEAMS.find((t) => t.id === id) ?? TEAMS[0];
}
