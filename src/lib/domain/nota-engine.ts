/**
 * Moteur de notas automatiques — délais 100 % paramétrables (settings.alertDelais).
 */

import type { Nota, NotaPriorite, PersistedState, UserId } from './types';
import { addDays, daysUntil, formatFR, todayISO } from '@/lib/dates';
import { getDevis, getImmeuble } from './lookups';
import { computeCeDesiredNotas } from './ce-engine';

type Desired = {
  alertKey: string;
  objet: string;
  entiteLiee: string;
  echeance: string;
  responsableId: UserId;
  priorite: NotaPriorite;
  bloquePlanification?: boolean;
  niveauRelance?: 1 | 2 | 3;
};

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function pickRole(state: PersistedState, role: string, fallback: UserId = 'denis'): UserId {
  return state.utilisateurs.find((u) => u.role === role && u.actif)?.id ?? fallback;
}

/** Calcule les notas AUTO attendues selon l'état métier. */
export function computeDesiredAutoNotas(state: PersistedState, from = todayISO()): Desired[] {
  const d = state.settings.alertDelais;
  const out: Desired[] = [];
  const assistante = pickRole(state, 'assistante', 'melissa');
  const responsable = pickRole(state, 'responsable', 'valerie');
  const suivi = pickRole(state, 'suivi_chantier', 'philippe');

  for (const a of state.affaires.filter((x) => !x.archived)) {
    const devis = getDevis(state, a.devisId);
    const imm = getImmeuble(state, a.immeubleId);
    const label = `${devis?.numeroBatappli ?? '?'} — ${imm?.adresse ?? ''}`;

    // Devis signé sans acompte → J+15, bloque planification
    if (
      a.statut === 'PORTEFEUILLE' &&
      a.acompteAttendu > 0 &&
      a.acompteRecu < a.acompteAttendu
    ) {
      const ref = a.dateAcompte ?? a.dateDerniereAction;
      const age = -daysUntil(ref, from);
      if (age >= d.acompteNonRecu) {
        out.push({
          alertKey: `acompte:${a.id}`,
          objet: `Acompte non reçu — ${label}`,
          entiteLiee: `affaire:${a.id}`,
          echeance: addDays(ref, d.acompteNonRecu),
          responsableId: assistante,
          priorite: 'bloquante',
          bloquePlanification: true,
        });
      }
    }

    // Affaire portefeuille sans action → J+30
    if (a.statut === 'PORTEFEUILLE') {
      const age = -daysUntil(a.dateDerniereAction, from);
      if (age >= d.affaireDormante) {
        out.push({
          alertKey: `dormante:${a.id}`,
          objet: `Affaire dormante — ${label}`,
          entiteLiee: `affaire:${a.id}`,
          echeance: addDays(a.dateDerniereAction, d.affaireDormante),
          responsableId: responsable,
          priorite: 'haute',
        });
      }
    }

    // Suspendue → relance tous les N jours
    if (a.statut === 'SUSPENDU') {
      const base = a.dateMotif ?? a.dateDerniereAction;
      const age = -daysUntil(base, from);
      if (age >= d.suspensionRelance) {
        const cycles = Math.floor(age / d.suspensionRelance);
        const echeance = addDays(base, cycles * d.suspensionRelance);
        out.push({
          alertKey: `suspendu:${a.id}:${echeance}`,
          objet: `Relance affaire suspendue — ${label}`,
          entiteLiee: `affaire:${a.id}`,
          echeance,
          responsableId: suivi,
          priorite: 'normale',
        });
      }
    }

    // Terminé non facturé → J+7
    if (a.statut === 'TERMINE') {
      const hasSolde = state.factures.some(
        (f) => f.affaireId === a.id && (f.type === 'SOLDE' || f.type === 'SITUATION'),
      );
      if (!hasSolde) {
        const age = -daysUntil(a.dateDerniereAction, from);
        if (age >= d.termineNonFacture) {
          out.push({
            alertKey: `facturer:${a.id}`,
            objet: `À facturer — ${label}`,
            entiteLiee: `affaire:${a.id}`,
            echeance: addDays(a.dateDerniereAction, d.termineNonFacture),
            responsableId: assistante,
            priorite: 'haute',
          });
        }
      }
    }
  }

  // Factures impayées → niveaux 1 / 2 / 3
  for (const f of state.factures.filter(
    (x) => !x.archived && (x.statut === 'EMISE' || x.statut === 'RELANCEE'),
  )) {
    const age = -daysUntil(f.dateEmission, from);
    let niveau: 1 | 2 | 3 | null = null;
    if (age >= d.factureImpaye3) niveau = 3;
    else if (age >= d.factureImpaye2) niveau = 2;
    else if (age >= d.factureImpaye1) niveau = 1;
    if (!niveau) continue;

    const labels = {
      1: 'Relance impayé niveau 1',
      2: 'Relance impayé niveau 2',
      3: 'Mise en demeure',
    } as const;
    const delai = niveau === 1 ? d.factureImpaye1 : niveau === 2 ? d.factureImpaye2 : d.factureImpaye3;

    out.push({
      alertKey: `facture:${f.id}:${niveau}`,
      objet: `${labels[niveau]} — ${f.numero}`,
      entiteLiee: `facture:${f.id}`,
      echeance: addDays(f.dateEmission, delai),
      responsableId: assistante,
      priorite: niveau === 3 ? 'bloquante' : 'haute',
      niveauRelance: niveau,
    });
  }

  // Commande non passée avant date besoin → J-3
  for (const c of state.commandes.filter((x) => x.statut === 'A_PASSER')) {
    const joursAvant = daysUntil(c.dateBesoin, from);
    if (joursAvant > d.commandeAvantBesoin) continue;
    out.push({
      alertKey: `commande:${c.id}`,
      objet: `Commande à passer — ${c.type} (${c.fournisseur})`,
      entiteLiee: `commande:${c.id}`,
      echeance: addDays(c.dateBesoin, -d.commandeAvantBesoin),
      responsableId: responsable,
      priorite: joursAvant < 0 ? 'haute' : 'normale',
    });
  }

  // Demande de prix sans réponse → J+7
  for (const dp of state.demandesPrix.filter(
    (x) => x.statut === 'ENVOYEE' || x.statut === 'RELANCEE',
  )) {
    const age = -daysUntil(dp.dateDemande, from);
    if (age < d.demandePrixSansReponse) continue;
    out.push({
      alertKey: `dp:${dp.id}`,
      objet: `Relancer le fournisseur — ${dp.fournisseur}`,
      entiteLiee: `demandePrix:${dp.id}`,
      echeance: addDays(dp.dateDemande, d.demandePrixSansReponse),
      responsableId: assistante,
      priorite: 'normale',
    });
  }

  // Check-list obligatoire non cochée à échéance → relance quotidienne
  for (const item of state.checklistItems) {
    if (item.fait || !item.obligatoire || item.archived) continue;
    if (daysUntil(item.echeance, from) > 0) continue;
    const cl = state.checklists.find((c) => c.id === item.checklistId);
    if (!cl) continue;
    out.push({
      alertKey: `cl:${item.id}:${from}`,
      objet: `Check-list : ${item.libelle}`,
      entiteLiee: `affaire:${cl.affaireId}`,
      echeance: from, // quotidien
      responsableId: item.assigneeId ?? suivi,
      priorite: 'haute',
    });
  }

  // Alertes Planning CE (J-45, J-15, HORS_DELAI dirigeant, reconduction, à facturer)
  for (const des of computeCeDesiredNotas(state, from)) {
    out.push(des);
  }

  return out;
}

/**
 * Synchronise les notas AUTO : crée les manquantes, clôture celles devenues inutiles.
 * Respecte les reports manuels (ne pas écraser l'échéance reportée si encore OUVERT).
 */
export function syncAutoNotas(state: PersistedState): PersistedState {
  const desired = computeDesiredAutoNotas(state);
  const desiredKeys = new Set(desired.map((x) => x.alertKey));
  const now = new Date().toISOString();
  let notas: Nota[] = state.notas.map((n) => ({
    ...n,
    reports: n.reports ?? [],
  }));

  // Clôturer AUTO ouvertes dont la règle ne s'applique plus
  notas = notas.map((n) => {
    if (n.type !== 'AUTO' || n.statut !== 'OUVERT' || n.archived || !n.alertKey) return n;
    if (desiredKeys.has(n.alertKey)) return n;
    return {
      ...n,
      statut: 'ANNULE' as const,
      dateCloture: now,
      engineSuppressed: true,
    };
  });

  for (const des of desired) {
    const existing = notas.find(
      (n) => n.alertKey === des.alertKey && n.statut === 'OUVERT' && !n.archived,
    );
    if (existing) {
      const reported = (existing.reports?.length ?? 0) > 0;
      notas = notas.map((n) =>
        n.id !== existing.id
          ? n
          : {
              ...n,
              objet: des.objet,
              priorite: des.priorite,
              bloquePlanification: des.bloquePlanification,
              niveauRelance: des.niveauRelance,
              echeance: reported ? n.echeance : des.echeance,
              engineSuppressed: undefined,
            },
      );
      continue;
    }

    // Ne pas recréer si l'utilisateur a clôturé manuellement (hors suppression moteur)
    const alreadyDone = notas.some(
      (n) =>
        n.alertKey === des.alertKey &&
        (n.statut === 'FAIT' || n.statut === 'ANNULE') &&
        !n.engineSuppressed &&
        !des.alertKey.startsWith('cl:'),
    );
    if (alreadyDone) continue;

    const nota: Nota = {
      id: uid('nota'),
      objet: des.objet,
      type: 'AUTO',
      entiteLiee: des.entiteLiee,
      echeance: des.echeance,
      responsableId: des.responsableId,
      priorite: des.priorite,
      statut: 'OUVERT',
      creePar: 'systeme',
      createdAt: now,
      alertKey: des.alertKey,
      bloquePlanification: des.bloquePlanification,
      niveauRelance: des.niveauRelance,
      reports: [],
    };
    notas.unshift(nota);
  }

  return { ...state, notas };
}

export function hrefForEntite(state: PersistedState, entiteLiee: string): string {
  if (entiteLiee.startsWith('affaire:')) return `/affaires/${entiteLiee.slice(8)}`;
  if (entiteLiee.startsWith('action:'))
    return `/mes-actions?action=${encodeURIComponent(entiteLiee.slice(7))}`;
  if (entiteLiee.startsWith('facture:')) {
    const id = entiteLiee.slice(8);
    const f = state.factures.find((x) => x.id === id);
    return f?.affaireId ? `/affaires/${f.affaireId}` : '/facturation';
  }
  if (entiteLiee.startsWith('commande:')) {
    const id = entiteLiee.slice(9);
    const c = state.commandes.find((x) => x.id === id);
    return c ? `/affaires/${c.affaireId}` : '/commandes';
  }
  if (entiteLiee.startsWith('demandePrix:')) {
    const id = entiteLiee.slice(12);
    const dp = state.demandesPrix.find((x) => x.id === id);
    return dp ? `/affaires/${dp.affaireId}` : '/commandes';
  }
  if (entiteLiee.startsWith('contrat:') || entiteLiee.startsWith('passage:'))
    return '/planning-ce';
  return '/';
}

export function formatNotaSubtitle(n: Nota): string {
  const bits = [`Échéance ${formatFR(n.echeance)}`, n.priorite];
  if (n.bloquePlanification) bits.push('bloque planification');
  if (n.niveauRelance) bits.push(`relance n°${n.niveauRelance}`);
  if (n.type === 'AUTO') bits.push('auto');
  return bits.join(' · ');
}
