/**
 * Planning CE — exercice 01/07 → 30/06 (pas calendaire civil).
 */

import type {
  ContratEntretien,
  PassageCE,
  PersistedState,
  UserId,
} from './types';
import {
  addDays,
  daysUntil,
  endOfMonth,
  formatFR,
  parseISODate,
  todayISO,
} from '@/lib/dates';
import { adresseCourte, getImmeuble, getSyndic } from './lookups';

export const MOIS_EXERCICE_LABELS = [
  'Juil',
  'Aoû',
  'Sep',
  'Oct',
  'Nov',
  'Déc',
  'Jan',
  'Fév',
  'Mar',
  'Avr',
  'Mai',
  'Juin',
] as const;

/** Index 0 = juillet … 11 = juin → mois calendaire 1-12 */
export function moisCalendaireFromIndex(i: number): number {
  return i < 6 ? i + 7 : i - 5;
}

export function indexFromMoisCalendaire(mois: number): number {
  return mois >= 7 ? mois - 7 : mois + 5;
}

export type ExerciceCE = {
  /** ex. "2025-2026" */
  label: string;
  /** Année du 1er juillet */
  startYear: number;
  start: string;
  end: string;
};

/**
 * Exercice en cours : bascule au 1er juillet, pas au 1er janvier.
 * Avant juillet N → exercice (N-1)-N ; à partir du 1er juillet N → N-(N+1).
 */
export function currentExercice(from = todayISO()): ExerciceCE {
  const d = parseISODate(from);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const startYear = m >= 7 ? y : y - 1;
  return {
    label: `${startYear}-${startYear + 1}`,
    startYear,
    start: `${startYear}-07-01`,
    end: `${startYear + 1}-06-30`,
  };
}

/** Année civile du mois contractuel dans un exercice donné */
export function yearOfContractMonth(moisCalendaire: number, ex: ExerciceCE): number {
  return moisCalendaire >= 7 ? ex.startYear : ex.startYear + 1;
}

export function firstDayOfContractMonth(moisCalendaire: number, ex: ExerciceCE): string {
  const y = yearOfContractMonth(moisCalendaire, ex);
  const mm = String(moisCalendaire).padStart(2, '0');
  return `${y}-${mm}-01`;
}

export function lastDayOfContractMonth(moisCalendaire: number, ex: ExerciceCE): string {
  return endOfMonth(firstDayOfContractMonth(moisCalendaire, ex));
}

export function hasPreuvePassage(p: PassageCE): boolean {
  const bon = Boolean(p.bonIntervention?.trim());
  const photos = (p.photos ?? []).some((x) => Boolean(x?.trim()));
  return bon || photos;
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function pickRole(state: PersistedState, role: string, fallback: UserId): UserId {
  return state.utilisateurs.find((u) => u.role === role && u.actif)?.id ?? fallback;
}

/**
 * Assure un passage par contrat actif pour l'exercice courant,
 * et bascule en HORS_DELAI si le mois contractuel est écoulé sans réalisation.
 */
export function syncPassagesCe(state: PersistedState, from = todayISO()): PersistedState {
  const ex = currentExercice(from);
  let passages = [...state.passagesCe];

  for (const ct of state.contrats.filter(
    (c) => !c.archived && (c.statut === 'ACTIF' || c.statut === 'ATTENTE_OS' || c.statut === 'EN_RESILIATION'),
  )) {
    let p = passages.find((x) => x.contratId === ct.id && x.exercice === ex.label);
    if (!p) {
      // Réutiliser un passage de l'ancien libellé d'exercice mal seedé
      const legacy = passages.find((x) => x.contratId === ct.id);
      if (legacy && legacy.exercice !== ex.label) {
        p = { ...legacy, exercice: ex.label };
        passages = passages.map((x) => (x.id === legacy.id ? p! : x));
      } else {
        p = {
          id: uid('pass'),
          contratId: ct.id,
          exercice: ex.label,
          statut: 'A_PROGRAMMER',
          photos: [],
          compteRendu: '',
        };
        passages.push(p);
      }
    }

    const done = p.statut === 'REALISE' || p.statut === 'FACTURE';
    if (done) continue;

    const finMois = lastDayOfContractMonth(ct.moisPassageContractuel, ex);
    if (from > finMois) {
      if (p.statut !== 'HORS_DELAI') {
        passages = passages.map((x) =>
          x.id === p!.id ? { ...x, statut: 'HORS_DELAI' as const } : x,
        );
      }
    }
  }

  return { ...state, passagesCe: passages };
}

export type DesiredCeNota = {
  alertKey: string;
  objet: string;
  entiteLiee: string;
  echeance: string;
  responsableId: UserId;
  priorite: 'normale' | 'haute' | 'bloquante';
};

/** Alertes CE à fusionner dans le moteur de notas */
export function computeCeDesiredNotas(
  state: PersistedState,
  from = todayISO(),
): DesiredCeNota[] {
  const d = state.settings.alertDelais;
  const ex = currentExercice(from);
  const out: DesiredCeNota[] = [];
  const suivi = pickRole(state, 'suivi_chantier', 'philippe');
  const dirigeant = pickRole(state, 'dirigeant', 'denis');
  const assistante = pickRole(state, 'assistante', 'melissa');

  for (const ct of state.contrats.filter(
    (c) => !c.archived && c.statut !== 'RESILIE',
  )) {
    const imm = getImmeuble(state, ct.immeubleId);
    const syn = getSyndic(state, ct.syndicId);
    const label = `${syn?.nom ?? '?'} — ${adresseCourte(imm)}`;
    const p = state.passagesCe.find(
      (x) => x.contratId === ct.id && x.exercice === ex.label,
    );
    if (!p) continue;

    const debutMois = firstDayOfContractMonth(ct.moisPassageContractuel, ex);
    const finMois = lastDayOfContractMonth(ct.moisPassageContractuel, ex);
    const programmed =
      p.statut === 'PROGRAMME' || p.statut === 'REALISE' || p.statut === 'FACTURE';

    // J-45 / J-15 avant le mois si rien n'est programmé
    if (!programmed && p.statut !== 'HORS_DELAI') {
      const j45 = addDays(debutMois, -d.passageCeJ45);
      const j15 = addDays(debutMois, -d.passageCeJ15);
      if (from >= j45 && from < j15) {
        out.push({
          alertKey: `ce-j45:${p.id}`,
          objet: `CE J-${d.passageCeJ45} — programmer le passage — ${label}`,
          entiteLiee: `passage:${p.id}`,
          echeance: j45,
          responsableId: suivi,
          priorite: 'normale',
        });
      }
      if (from >= j15 && from <= finMois) {
        out.push({
          alertKey: `ce-j15:${p.id}`,
          objet: `CE J-${d.passageCeJ15} — passage non programmé — ${label}`,
          entiteLiee: `passage:${p.id}`,
          echeance: j15,
          responsableId: suivi,
          priorite: 'haute',
        });
      }
    }

    // HORS_DELAI → alerte bloquante escaladée au dirigeant
    if (p.statut === 'HORS_DELAI') {
      out.push({
        alertKey: `ce-hdl:${p.id}`,
        objet: `ALERTE BLOQUANTE — Passage CE hors délai — ${label}`,
        entiteLiee: `passage:${p.id}`,
        echeance: from,
        responsableId: dirigeant,
        priorite: 'bloquante',
      });
    }

    // Passage réalisé non facturé → J+7
    if (p.statut === 'REALISE' && p.dateRealisee) {
      const age = -daysUntil(p.dateRealisee, from);
      if (age >= d.ceAFacturer) {
        out.push({
          alertKey: `ce-fac:${p.id}`,
          objet: `CE à facturer — ${label}`,
          entiteLiee: `passage:${p.id}`,
          echeance: addDays(p.dateRealisee, d.ceAFacturer),
          responsableId: assistante,
          priorite: 'haute',
        });
      }
    }
  }

  // Reconduction / préavis — J-90 avant fin d'exercice (30 juin)
  const j90 = addDays(ex.end, -d.reconductionJ90);
  if (from >= j90 && from <= ex.end) {
    for (const ct of state.contrats.filter(
      (c) => !c.archived && (c.statut === 'ACTIF' || c.statut === 'EN_RESILIATION'),
    )) {
      const imm = getImmeuble(state, ct.immeubleId);
      const syn = getSyndic(state, ct.syndicId);
      out.push({
        alertKey: `ce-reconduction:${ct.id}:${ex.label}`,
        objet: ct.statut === 'EN_RESILIATION'
          ? `Préavis résiliation CE — ${syn?.nom ?? ''} — ${adresseCourte(imm)}`
          : `Reconduction CE à traiter — ${syn?.nom ?? ''} — ${adresseCourte(imm)}`,
        entiteLiee: `contrat:${ct.id}`,
        echeance: j90,
        responsableId: pickRole(state, 'responsable', 'valerie'),
        priorite: 'normale',
      });
    }
  }

  return out;
}

export function cellLabel(passage: PassageCE | undefined): string {
  if (!passage) return 'à programmer';
  if (passage.statut === 'REALISE' || passage.statut === 'FACTURE') {
    return passage.dateRealisee ? formatFR(passage.dateRealisee) : 'réalisé';
  }
  if (passage.statut === 'PROGRAMME') {
    return passage.datePrevue ? `Prév. ${formatFR(passage.datePrevue)}` : 'programmé';
  }
  if (passage.statut === 'HORS_DELAI') return 'HORS DÉLAI';
  return 'à programmer';
}

export function bandeauCe(state: PersistedState, from = todayISO()) {
  const ex = currentExercice(from);
  const actifs = state.contrats.filter(
    (c) => !c.archived && (c.statut === 'ACTIF' || c.statut === 'ATTENTE_OS'),
  );
  const ca = actifs.reduce((s, c) => s + c.montantHTAnnuel, 0);
  const passagesEx = state.passagesCe.filter((p) => p.exercice === ex.label);
  const nonProg = passagesEx.filter(
    (p) => p.statut === 'A_PROGRAMMER' || p.statut === 'HORS_DELAI',
  ).length;
  const realNonFac = passagesEx.filter((p) => p.statut === 'REALISE').length;
  return { actifs: actifs.length, ca, nonProg, realNonFac, exercice: ex };
}

/** Libellé mois + année pour en-tête (ex. Juil 25) */
export function moisHeaderLabel(index: number, ex: ExerciceCE): string {
  const moisCal = moisCalendaireFromIndex(index);
  const y = yearOfContractMonth(moisCal, ex);
  return `${MOIS_EXERCICE_LABELS[index]} ${String(y).slice(2)}`;
}

export function statutContratLabel(s: ContratEntretien['statut']): string {
  const map = {
    ACTIF: 'Actif',
    EN_RESILIATION: 'En résiliation',
    RESILIE: 'Résilié',
    ATTENTE_OS: 'Attente OS',
  };
  return map[s];
}

export function isContractMonthOverdue(
  ct: ContratEntretien,
  passage: PassageCE | undefined,
  from = todayISO(),
): boolean {
  if (passage?.statut === 'HORS_DELAI') return true;
  if (passage?.statut === 'REALISE' || passage?.statut === 'FACTURE') return false;
  const ex = currentExercice(from);
  return from > lastDayOfContractMonth(ct.moisPassageContractuel, ex);
}
