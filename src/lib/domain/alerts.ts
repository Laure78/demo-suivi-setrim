/**
 * Moteur d'alertes / Notas du jour.
 * Génère des lignes cliquables pour l'écran d'accueil.
 */

import type { PersistedState } from './types';
import { daysUntil, formatFR, todayISO } from '@/lib/dates';
import { adresseCourte, getDevis, getImmeuble, getSyndicForImmeuble } from './lookups';

export type AlertBucket = 'aujourdhui' | 'retard' | 'semaine';

export type DayAlert = {
  id: string;
  bucket: AlertBucket;
  title: string;
  subtitle: string;
  href: string;
  priorite: 'normale' | 'haute' | 'bloquante';
};

function bucketFromEcheance(echeance: string, from = todayISO()): AlertBucket {
  const d = daysUntil(echeance, from);
  if (d < 0) return 'retard';
  if (d === 0) return 'aujourdhui';
  if (d <= 7) return 'semaine';
  return 'semaine';
}

export function buildMesAlertes(state: PersistedState, userId: string): DayAlert[] {
  const t = todayISO();
  const delais = state.settings.alertDelais;
  const alerts: DayAlert[] = [];

  // Notas ouvertes assignées à l'utilisateur (ou à tous si dirigeant)
  const user = state.utilisateurs.find((u) => u.id === userId);
  const isDirigeant = user?.role === 'dirigeant';

  for (const n of state.notas.filter((x) => x.statut === 'OUVERT')) {
    const mine = n.responsableId === userId;
    const seeBlocking = isDirigeant && n.priorite === 'bloquante';
    if (!mine && !seeBlocking && !isDirigeant) continue;
    if (!mine && isDirigeant && n.priorite !== 'bloquante') {
      // dirigeant voit aussi toutes les notas ouvertes (escalades)
    }

    const href = n.entiteLiee.startsWith('affaire:')
      ? `/affaires/${n.entiteLiee.slice(8)}`
      : n.entiteLiee.startsWith('passage:')
        ? '/planning-ce'
        : n.entiteLiee.startsWith('commande:')
          ? `/affaires/${state.commandes.find((c) => c.id === n.entiteLiee.slice(9))?.affaireId ?? ''}`
          : n.entiteLiee.startsWith('demandePrix:')
            ? `/affaires/${state.demandesPrix.find((d) => d.id === n.entiteLiee.slice(12))?.affaireId ?? ''}`
            : '/';

    alerts.push({
      id: `nota-${n.id}`,
      bucket: bucketFromEcheance(n.echeance, t),
      title: n.objet,
      subtitle: `Échéance ${formatFR(n.echeance)} · ${n.priorite}`,
      href: href || '/',
      priorite: n.priorite === 'basse' ? 'normale' : n.priorite,
    });
  }

  // Règles auto sur affaires
  for (const a of state.affaires.filter((x) => !x.archived)) {
    const devis = getDevis(state, a.devisId);
    const imm = getImmeuble(state, a.immeubleId);
    const syndic = getSyndicForImmeuble(state, a.immeubleId);
    const label = `${devis?.numeroBatappli ?? '?'} — ${imm?.adresse ?? ''}`;

    if (a.joursChargeEstimes == null && a.statut === 'PORTEFEUILLE') {
      alerts.push({
        id: `charge-${a.id}`,
        bucket: 'retard',
        title: 'Charge non renseignée',
        subtitle: `${label} · exclue du plan de charge`,
        href: `/affaires/${a.id}`,
        priorite: 'haute',
      });
    }

    if (
      a.statut === 'PORTEFEUILLE' &&
      a.acompteAttendu > 0 &&
      a.acompteRecu < a.acompteAttendu &&
      daysUntil(a.dateDerniereAction, t) <= -delais.acompteNonRecu
    ) {
      alerts.push({
        id: `acompte-${a.id}`,
        bucket: 'retard',
        title: 'Acompte non reçu — bloque la planification',
        subtitle: `${label} · ${syndic?.nom ?? ''}`,
        href: `/affaires/${a.id}`,
        priorite: 'bloquante',
      });
    }

    if (
      a.statut === 'PORTEFEUILLE' &&
      daysUntil(a.dateDerniereAction, t) <= -delais.affaireDormante
    ) {
      alerts.push({
        id: `dormante-${a.id}`,
        bucket: 'retard',
        title: 'Affaire dormante',
        subtitle: `${label} · aucune action depuis ${formatFR(a.dateDerniereAction)}`,
        href: `/affaires/${a.id}`,
        priorite: 'haute',
      });
    }

    if (a.statut === 'TERMINE') {
      const hasSolde = state.factures.some(
        (f) => f.affaireId === a.id && f.type === 'SOLDE',
      );
      if (!hasSolde && daysUntil(a.dateDerniereAction, t) <= -delais.termineNonFacture) {
        alerts.push({
          id: `facturer-${a.id}`,
          bucket: 'retard',
          title: 'À facturer',
          subtitle: `${label} · chantier terminé`,
          href: `/affaires/${a.id}`,
          priorite: 'haute',
        });
      }
    }

    if (a.statut === 'SUSPENDU') {
      alerts.push({
        id: `suspendu-${a.id}`,
        bucket: 'semaine',
        title: 'Affaire suspendue — relance',
        subtitle: `${label} · ${a.motifSuspension ?? ''}`,
        href: `/affaires/${a.id}`,
        priorite: 'normale',
      });
    }
  }

  // Check-list obligatoire en retard
  for (const item of state.checklistItems) {
    if (item.fait || !item.obligatoire) continue;
    if (daysUntil(item.echeance, t) >= 0) continue;
    const cl = state.checklists.find((c) => c.id === item.checklistId);
    if (!cl) continue;
    alerts.push({
      id: `cl-${item.id}`,
      bucket: 'retard',
      title: `Check-list : ${item.libelle}`,
      subtitle: `Échéance ${formatFR(item.echeance)}`,
      href: `/affaires/${cl.affaireId}`,
      priorite: 'haute',
    });
  }

  // Commandes
  for (const c of state.commandes.filter((x) => x.statut === 'A_PASSER')) {
    const d = daysUntil(c.dateBesoin, t);
    if (d > delais.commandeAvantBesoin) continue;
    alerts.push({
      id: `cmd-${c.id}`,
      bucket: d < 0 ? 'retard' : d === 0 ? 'aujourdhui' : 'semaine',
      title: `Commande à passer — ${c.type}`,
      subtitle: `${c.fournisseur} · besoin ${formatFR(c.dateBesoin)}`,
      href: `/affaires/${c.affaireId}`,
      priorite: d < 0 ? 'haute' : 'normale',
    });
  }

  // Demandes de prix
  for (const dp of state.demandesPrix.filter((x) => x.statut === 'ENVOYEE' || x.statut === 'RELANCEE')) {
    if (daysUntil(dp.dateDemande, t) > -delais.demandePrixSansReponse) continue;
    alerts.push({
      id: `dp-${dp.id}`,
      bucket: 'retard',
      title: 'Relancer le fournisseur',
      subtitle: `${dp.fournisseur} — ${dp.objet}`,
      href: `/affaires/${dp.affaireId}`,
      priorite: 'normale',
    });
  }

  // Factures impayées
  for (const f of state.factures.filter((x) => x.statut === 'EMISE' || x.statut === 'RELANCEE')) {
    const age = -daysUntil(f.dateEmission, t);
    if (age < delais.factureImpaye1) continue;
    alerts.push({
      id: `fac-${f.id}`,
      bucket: 'retard',
      title: `Impayé ${f.numero}`,
      subtitle: `Émise le ${formatFR(f.dateEmission)} · ${f.montant.toLocaleString('fr-FR')} €`,
      href: f.affaireId ? `/affaires/${f.affaireId}` : '/facturation',
      priorite: age >= delais.factureImpaye3 ? 'bloquante' : 'haute',
    });
  }

  // Passages CE hors délai
  for (const p of state.passagesCe.filter((x) => x.statut === 'HORS_DELAI')) {
    const ct = state.contrats.find((c) => c.id === p.contratId);
    const imm = ct ? getImmeuble(state, ct.immeubleId) : undefined;
    alerts.push({
      id: `ce-hdl-${p.id}`,
      bucket: 'retard',
      title: 'ALERTE BLOQUANTE — Passage CE hors délai',
      subtitle: adresseCourte(imm),
      href: '/planning-ce',
      priorite: 'bloquante',
    });
  }

  // Dédupliquer par id
  const seen = new Set<string>();
  const unique = alerts.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });

  const rank = { bloquante: 0, haute: 1, normale: 2 };
  const bucketRank = { retard: 0, aujourdhui: 1, semaine: 2 };
  return unique.sort(
    (a, b) =>
      bucketRank[a.bucket] - bucketRank[b.bucket] ||
      rank[a.priorite] - rank[b.priorite],
  );
}
