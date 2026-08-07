/**
 * Recherche globale : adresses, syndics, n° devis, n° facture.
 */

import type { PersistedState } from './types';
import { adresseCourte, getDevis, getImmeuble, getSyndic } from './lookups';

export type SearchHit = {
  id: string;
  label: string;
  sub?: string;
  href: string;
  kind: 'affaire' | 'syndic' | 'devis' | 'facture' | 'immeuble' | 'contrat';
};

export function globalSearch(state: PersistedState, query: string, limit = 12): SearchHit[] {
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) return [];
  const hits: SearchHit[] = [];
  const seen = new Set<string>();

  function push(h: SearchHit) {
    if (seen.has(h.id)) return;
    seen.add(h.id);
    hits.push(h);
  }

  // Adresses → chantier (affaire) en priorité
  for (const imm of state.immeubles.filter((x) => !x.archived)) {
    const blob = `${imm.adresse} ${imm.ville} ${imm.codePostal}`.toLowerCase();
    if (!blob.includes(needle)) continue;
    const aff = state.affaires.find((a) => a.immeubleId === imm.id && !a.archived);
    if (aff) {
      const devis = getDevis(state, aff.devisId);
      push({
        id: `aff-${aff.id}`,
        kind: 'affaire',
        label: `${devis?.numeroBatappli ?? 'Affaire'} — ${adresseCourte(imm)}`,
        sub: 'Chantier',
        href: `/affaires/${aff.id}`,
      });
    } else {
      push({
        id: `imm-${imm.id}`,
        kind: 'immeuble',
        label: adresseCourte(imm),
        sub: 'Immeuble',
        href: `/portefeuille?q=${encodeURIComponent(imm.adresse)}`,
      });
    }
  }

  for (const s of state.syndics.filter((x) => !x.archived)) {
    if (!s.nom.toLowerCase().includes(needle)) continue;
    push({
      id: `syn-${s.id}`,
      kind: 'syndic',
      label: `Syndic ${s.nom}`,
      href: `/portefeuille?q=${encodeURIComponent(s.nom)}`,
    });
  }

  for (const d of state.devis.filter((x) => !x.archived)) {
    if (!d.numeroBatappli.toLowerCase().includes(needle)) continue;
    const aff = state.affaires.find((a) => a.devisId === d.id && !a.archived);
    push({
      id: `dev-${d.id}`,
      kind: 'devis',
      label: `Devis ${d.numeroBatappli}`,
      sub: aff ? 'Affaire' : undefined,
      href: aff ? `/affaires/${aff.id}` : '/portefeuille',
    });
  }

  for (const f of state.factures.filter((x) => !x.archived)) {
    if (!f.numero.toLowerCase().includes(needle)) continue;
    push({
      id: `fac-${f.id}`,
      kind: 'facture',
      label: `Facture ${f.numero}`,
      sub: `${f.type} · ${f.statut}`,
      href: f.affaireId ? `/affaires/${f.affaireId}` : '/facturation',
    });
  }

  for (const c of state.contrats.filter((x) => !x.archived)) {
    const imm = getImmeuble(state, c.immeubleId);
    const syn = getSyndic(state, c.syndicId);
    const blob = `${syn?.nom ?? ''} ${adresseCourte(imm)} ${c.commentaire}`.toLowerCase();
    if (!blob.includes(needle)) continue;
    push({
      id: `ce-${c.id}`,
      kind: 'contrat',
      label: `CE · ${syn?.nom ?? ''} — ${adresseCourte(imm)}`,
      href: '/planning-ce',
    });
  }

  return hits.slice(0, limit);
}
