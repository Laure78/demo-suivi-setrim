/**
 * Import Excel Batappli / historique SETRIM (3 onglets).
 * Mapping colonnes configurable + mémorisé.
 */

import * as XLSX from 'xlsx';
import type {
  Affaire,
  AffaireStatut,
  Affectation,
  AffectationType,
  ColumnMapping,
  ContratEntretien,
  Devis,
  DevisType,
  ImportSheetKind,
  PersistedState,
} from '@/lib/domain/types';
import { todayISO, toISODate } from '@/lib/dates';
import { uid } from '@/lib/domain/lookups';
import { currentExercice } from '@/lib/domain/ce-engine';

export type FieldDef = {
  id: string;
  label: string;
  required?: boolean;
  aliases: string[];
};

export const SHEET_FIELDS: Record<ImportSheetKind, FieldDef[]> = {
  portefeuille: [
    { id: 'numeroDevis', label: 'N° de devis', required: true, aliases: ['numero de devis', 'n de devis', 'devis', 'num devis'] },
    { id: 'syndic', label: 'Syndic / Client', required: true, aliases: ['syndic', 'client', 'nom client'] },
    { id: 'adresse', label: 'Adresse chantier', required: true, aliases: ['adresse', 'adresse chantier', 'adresse du chantier'] },
    { id: 'montantHT', label: 'Montant HT', aliases: ['montant ht', 'montant', 'ht', 'ca'] },
    { id: 'date', label: 'Date', aliases: ['date', 'date devis', 'date signature'] },
    { id: 'acompteAttendu', label: 'Acompte TTC', aliases: ['acompte ttc', 'acompte attendu', 'acompte'] },
    { id: 'acompteRecu', label: 'Acompte reçu', aliases: ['acompte recu', 'recu'] },
    { id: 'joursCharge', label: 'Jours de charge', aliases: ['jours de charge', 'jours', 'charge', 'j charge'] },
    { id: 'statut', label: 'Statut', aliases: ['statut', 'etat', 'status'] },
    { id: 'type', label: 'Type', aliases: ['type', 'type devis', 'nature'] },
    { id: 'commentaire', label: 'Commentaire', aliases: ['commentaire', 'commentaires', 'notes'] },
  ],
  planning: [
    { id: 'date', label: 'Date', required: true, aliases: ['date', 'jour'] },
    { id: 'equipe', label: 'Équipe', required: true, aliases: ['equipe', 'équipe', 'team'] },
    { id: 'numeroDevis', label: 'N° de devis', aliases: ['numero de devis', 'devis', 'n de devis', 'affaire'] },
    { id: 'type', label: 'Type affectation', aliases: ['type', 'type affectation', 'nature'] },
    { id: 'commentaire', label: 'Commentaire', aliases: ['commentaire', 'notes'] },
  ],
  planning_ce: [
    { id: 'syndic', label: 'Syndic', required: true, aliases: ['syndic', 'client'] },
    { id: 'adresse', label: 'Adresse', required: true, aliases: ['adresse', 'adresse chantier', 'immeuble'] },
    { id: 'montantHT', label: 'Montant HT annuel', aliases: ['montant ht', 'montant', 'ca annuel', 'ht annuel'] },
    { id: 'compagnons', label: 'Nb compagnons', aliases: ['compagnons', 'nb compagnons', 'comp'] },
    { id: 'moisPassage', label: 'Mois passage', required: true, aliases: ['mois', 'mois passage', 'mois contractuel'] },
    { id: 'statut', label: 'Statut', aliases: ['statut', 'etat'] },
    { id: 'commentaire', label: 'Commentaire', aliases: ['commentaire', 'notes'] },
  ],
};

export const SHEET_KIND_LABEL: Record<ImportSheetKind, string> = {
  portefeuille: 'Portefeuille',
  planning: 'Planning chantiers',
  planning_ce: 'Planning CE',
};

export function normalizeHeader(h: unknown): string {
  return String(h ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[°º]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function detectSheetKind(sheetName: string): ImportSheetKind | null {
  const n = normalizeHeader(sheetName);
  if (n.includes('portefeuille') || n.includes('devis') || n.includes('affaires'))
    return 'portefeuille';
  if (n.includes('planning ce') || n.includes('contrat') || n === 'ce') return 'planning_ce';
  if (n.includes('planning') || n.includes('chantier')) return 'planning';
  return null;
}

function cellToString(v: unknown): string {
  if (v == null) return '';
  if (v instanceof Date) return toISODate(v);
  return String(v).trim();
}

function parseMontant(v: unknown): number | null {
  if (v == null || v === '') return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const s = String(v).replace(/\s/g, '').replace('€', '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function parseExcelDate(v: unknown): string | null {
  if (v == null || v === '') return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return toISODate(v);
  if (typeof v === 'number' && Number.isFinite(v)) {
    const parsed = XLSX.SSF.parse_date_code(v);
    if (!parsed) return null;
    return toISODate(new Date(parsed.y, parsed.m - 1, parsed.d));
  }
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : toISODate(d);
}

function parseMois(v: unknown): number | null {
  if (v == null || v === '') return null;
  if (typeof v === 'number' && v >= 1 && v <= 12) return Math.round(v);
  const s = normalizeHeader(v);
  const names = [
    'janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre',
  ];
  const short = ['jan', 'fev', 'mar', 'avr', 'mai', 'juin', 'juil', 'aou', 'sep', 'oct', 'nov', 'dec'];
  const i = names.findIndex((n) => s.startsWith(n) || s === short[names.indexOf(n)]);
  if (i >= 0) return i + 1;
  const si = short.findIndex((n) => s.startsWith(n));
  if (si >= 0) return si + 1;
  const n = Number(s);
  return n >= 1 && n <= 12 ? n : null;
}

/** Construit un mapping fieldId → header Excel (texte). */
export function buildAutoMapping(
  headers: string[],
  kind: ImportSheetKind,
  saved?: ColumnMapping | null,
): ColumnMapping {
  const fields = SHEET_FIELDS[kind];
  const normalized = headers.map(normalizeHeader);
  const mapping: ColumnMapping = {};

  for (const f of fields) {
    // 1) mapping mémorisé (header toujours présent)
    if (saved?.[f.id]) {
      const want = normalizeHeader(saved[f.id]);
      const idx = normalized.findIndex((h) => h === want);
      if (idx >= 0) {
        mapping[f.id] = headers[idx]!;
        continue;
      }
    }
    // 2) alias auto
    const aliases = f.aliases.map(normalizeHeader);
    const idx = normalized.findIndex((h) => aliases.includes(h) || h === normalizeHeader(f.label));
    if (idx >= 0) mapping[f.id] = headers[idx]!;
  }
  return mapping;
}

export function readWorkbook(buffer: ArrayBuffer): {
  ok: true;
  workbook: XLSX.WorkBook;
  sheets: { name: string; headers: string[]; rowCount: number }[];
} | { ok: false; error: string } {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  } catch {
    return { ok: false, error: 'Impossible de lire ce fichier .xlsx.' };
  }
  if (!workbook.SheetNames.length) {
    return { ok: false, error: 'Aucune feuille dans le fichier.' };
  }
  const sheets = workbook.SheetNames.map((name) => {
    const matrix = XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(
      workbook.Sheets[name]!,
      { header: 1, defval: null, raw: true },
    );
    const headers = (matrix[0] ?? []).map((c) => (c == null ? '' : String(c)));
    return {
      name,
      headers: headers.filter((h) => h.trim()),
      rowCount: Math.max(0, matrix.length - 1),
    };
  });
  return { ok: true, workbook, sheets };
}

export type PreviewStatus = 'create' | 'update' | 'ignore' | 'error';

export type PreviewRow = {
  sourceRow: number;
  status: PreviewStatus;
  motif: string;
  data: Record<string, string | number | null>;
  key?: string;
};

function mappingToIndex(headers: string[], mapping: ColumnMapping): Record<string, number> {
  const idx: Record<string, number> = {};
  const norm = headers.map(normalizeHeader);
  for (const [field, header] of Object.entries(mapping)) {
    if (!header) continue;
    const i = norm.findIndex((h) => h === normalizeHeader(header));
    if (i >= 0) idx[field] = i;
  }
  return idx;
}

function getCell(
  line: (string | number | Date | null)[],
  idx: Record<string, number>,
  field: string,
): unknown {
  const i = idx[field];
  if (i == null) return null;
  return line[i] ?? null;
}

function parseStatutAffaire(v: unknown): AffaireStatut | null {
  const s = normalizeHeader(v);
  const map: Record<string, AffaireStatut> = {
    portefeuille: 'PORTEFEUILLE',
    planifie: 'PLANIFIE',
    'en cours': 'EN_COURS',
    encours: 'EN_COURS',
    termine: 'TERMINE',
    facture: 'FACTURE',
    solde: 'SOLDE',
    suspendu: 'SUSPENDU',
    bloque: 'SUSPENDU',
  };
  return map[s] ?? null;
}

function parseTypeDevis(v: unknown): DevisType {
  const s = normalizeHeader(v);
  if (s.includes('resine')) return 'RESINE';
  if (s.includes('nettoyage')) return 'NETTOYAGE';
  if (s.includes('divers')) return 'DIVERS';
  if (s === 'ce' || s.includes('entretien')) return 'CE';
  return 'TRAVAUX';
}

function parseAffectationType(v: unknown): AffectationType {
  const s = normalizeHeader(v);
  if (s.includes('conges') || s.includes('cong')) return 'CONGES';
  if (s.includes('absent')) return 'ABSENT';
  if (s.includes('ferie')) return 'FERIE';
  if (s.includes('intemper')) return 'INTEMPERIE';
  if (s.includes('rdv')) return 'RDV';
  if (s.includes('formation')) return 'FORMATION';
  return 'CHANTIER';
}

export function buildPreview(
  workbook: XLSX.WorkBook,
  sheetName: string,
  kind: ImportSheetKind,
  mapping: ColumnMapping,
  state: PersistedState,
): { rows: PreviewRow[]; error?: string } {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return { rows: [], error: 'Feuille introuvable.' };
  const matrix = XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(sheet, {
    header: 1,
    defval: null,
    raw: true,
  });
  if (!matrix.length) return { rows: [], error: 'Feuille vide.' };

  const headers = (matrix[0] ?? []).map((c) => (c == null ? '' : String(c)));
  const idx = mappingToIndex(headers, mapping);
  const fields = SHEET_FIELDS[kind];
  for (const f of fields.filter((x) => x.required)) {
    if (idx[f.id] == null) {
      return { rows: [], error: `Colonne obligatoire manquante : ${f.label}` };
    }
  }

  const rows: PreviewRow[] = [];

  for (let i = 1; i < matrix.length; i++) {
    const line = matrix[i] ?? [];
    const empty = line.every((c) => c == null || String(c).trim() === '');
    if (empty) continue;

    if (kind === 'portefeuille') {
      const numero = cellToString(getCell(line, idx, 'numeroDevis'));
      if (!numero) {
        rows.push({
          sourceRow: i + 1,
          status: 'error',
          motif: 'N° de devis manquant',
          data: {},
        });
        continue;
      }
      const data = {
        numeroDevis: numero,
        syndic: cellToString(getCell(line, idx, 'syndic')),
        adresse: cellToString(getCell(line, idx, 'adresse')),
        montantHT: parseMontant(getCell(line, idx, 'montantHT')),
        date: parseExcelDate(getCell(line, idx, 'date')),
        acompteAttendu: parseMontant(getCell(line, idx, 'acompteAttendu')),
        acompteRecu: parseMontant(getCell(line, idx, 'acompteRecu')),
        joursCharge: parseMontant(getCell(line, idx, 'joursCharge')),
        statut: cellToString(getCell(line, idx, 'statut')),
        type: cellToString(getCell(line, idx, 'type')),
        commentaire: cellToString(getCell(line, idx, 'commentaire')),
      };
      const existing = state.devis.find(
        (d) => normalizeHeader(d.numeroBatappli) === normalizeHeader(numero),
      );
      if (!existing) {
        rows.push({
          sourceRow: i + 1,
          status: 'create',
          motif: 'Nouveau devis',
          data,
          key: numero,
        });
      } else {
        const aff = state.affaires.find((a) => a.devisId === existing.id);
        const same =
          existing.montantHT === (data.montantHT ?? existing.montantHT) &&
          (aff?.commentaire ?? '') === (data.commentaire || aff?.commentaire || '') &&
          (aff?.joursChargeEstimes ?? null) ===
            (data.joursCharge != null ? data.joursCharge : aff?.joursChargeEstimes ?? null);
        if (same) {
          rows.push({
            sourceRow: i + 1,
            status: 'ignore',
            motif: 'Déjà à jour (doublon n° devis)',
            data,
            key: numero,
          });
        } else {
          rows.push({
            sourceRow: i + 1,
            status: 'update',
            motif: 'Conflit / mise à jour — même n° devis',
            data,
            key: numero,
          });
        }
      }
    } else if (kind === 'planning') {
      const date = parseExcelDate(getCell(line, idx, 'date'));
      const equipe = cellToString(getCell(line, idx, 'equipe'));
      const numero = cellToString(getCell(line, idx, 'numeroDevis'));
      const typeRaw = cellToString(getCell(line, idx, 'type')) || 'CHANTIER';
      if (!date || !equipe) {
        rows.push({
          sourceRow: i + 1,
          status: 'error',
          motif: 'Date ou équipe manquante',
          data: {},
        });
        continue;
      }
      const data = {
        date,
        equipe,
        numeroDevis: numero,
        type: typeRaw,
        commentaire: cellToString(getCell(line, idx, 'commentaire')),
      };
      const eq = state.equipes.find(
        (e) => normalizeHeader(e.libelle).includes(normalizeHeader(equipe)) ||
          normalizeHeader(equipe).includes(normalizeHeader(e.libelle).slice(0, 8)),
      );
      const affType = parseAffectationType(typeRaw);
      const affaire =
        numero && affType === 'CHANTIER'
          ? state.affaires.find((a) => {
              const d = state.devis.find((x) => x.id === a.devisId);
              return d && normalizeHeader(d.numeroBatappli) === normalizeHeader(numero);
            })
          : undefined;
      const exists = state.affectations.some(
        (a) =>
          a.date === date &&
          a.equipeId === (eq?.id ?? '') &&
          ((affType === 'CHANTIER' && a.affaireId === affaire?.id) ||
            (affType !== 'CHANTIER' && a.type === affType)),
      );
      rows.push({
        sourceRow: i + 1,
        status: exists ? 'ignore' : 'create',
        motif: exists
          ? 'Affectation déjà présente'
          : !eq
            ? 'Équipe inconnue — sera ignorée à la validation'
            : affType === 'CHANTIER' && numero && !affaire
              ? 'Devis inconnu — créer le portefeuille d’abord'
              : 'Nouvelle affectation',
        data,
        key: `${date}|${equipe}|${numero}|${typeRaw}`,
      });
      if (!eq || (affType === 'CHANTIER' && numero && !affaire)) {
        rows[rows.length - 1]!.status = exists ? 'ignore' : 'error';
      }
    } else {
      // planning_ce
      const syndic = cellToString(getCell(line, idx, 'syndic'));
      const adresse = cellToString(getCell(line, idx, 'adresse'));
      const mois = parseMois(getCell(line, idx, 'moisPassage'));
      if (!syndic || !adresse || !mois) {
        rows.push({
          sourceRow: i + 1,
          status: 'error',
          motif: 'Syndic, adresse ou mois manquant',
          data: {},
        });
        continue;
      }
      const data = {
        syndic,
        adresse,
        montantHT: parseMontant(getCell(line, idx, 'montantHT')),
        compagnons: parseMontant(getCell(line, idx, 'compagnons')),
        moisPassage: mois,
        statut: cellToString(getCell(line, idx, 'statut')),
        commentaire: cellToString(getCell(line, idx, 'commentaire')),
      };
      const imm = state.immeubles.find(
        (im) =>
          normalizeHeader(im.adresse).includes(normalizeHeader(adresse).slice(0, 12)) ||
          normalizeHeader(adresse).includes(normalizeHeader(im.adresse).slice(0, 12)),
      );
      const existing = imm
        ? state.contrats.find((c) => c.immeubleId === imm.id && !c.archived)
        : undefined;
      if (!existing) {
        rows.push({
          sourceRow: i + 1,
          status: 'create',
          motif: imm ? 'Nouveau contrat' : 'Immeuble à créer + contrat',
          data,
          key: `${syndic}|${adresse}|${mois}`,
        });
      } else if (existing.moisPassageContractuel === mois) {
        rows.push({
          sourceRow: i + 1,
          status: 'ignore',
          motif: 'Contrat déjà présent (même immeuble / mois)',
          data,
          key: `${syndic}|${adresse}|${mois}`,
        });
      } else {
        rows.push({
          sourceRow: i + 1,
          status: 'update',
          motif: 'Mise à jour mois / montant contrat',
          data,
          key: `${syndic}|${adresse}|${mois}`,
        });
      }
    }
  }

  return { rows };
}

export type ImportReportLine = {
  status: 'create' | 'update' | 'ignore' | 'error';
  motif: string;
  sourceRow: number;
  label: string;
};

export type ImportReport = {
  created: number;
  updated: number;
  ignored: number;
  errors: number;
  lines: ImportReportLine[];
};

export function applyImport(
  state: PersistedState,
  workbook: XLSX.WorkBook,
  sheetName: string,
  kind: ImportSheetKind,
  mapping: ColumnMapping,
  userId: string,
): { state: PersistedState; report: ImportReport } {
  const preview = buildPreview(workbook, sheetName, kind, mapping, state);
  const report: ImportReport = {
    created: 0,
    updated: 0,
    ignored: 0,
    errors: 0,
    lines: [],
  };
  if (preview.error) {
    report.errors = 1;
    report.lines.push({
      status: 'error',
      motif: preview.error,
      sourceRow: 0,
      label: sheetName,
    });
    return { state, report };
  }

  let next = { ...state };
  const t = todayISO();

  for (const row of preview.rows) {
    const label =
      String(row.data.numeroDevis ?? row.data.adresse ?? row.data.syndic ?? `L${row.sourceRow}`);

    if (row.status === 'error') {
      report.errors += 1;
      report.lines.push({
        status: 'error',
        motif: row.motif,
        sourceRow: row.sourceRow,
        label,
      });
      continue;
    }
    if (row.status === 'ignore') {
      report.ignored += 1;
      report.lines.push({
        status: 'ignore',
        motif: row.motif,
        sourceRow: row.sourceRow,
        label,
      });
      continue;
    }

    if (kind === 'portefeuille') {
      const numero = String(row.data.numeroDevis);
      const existing = next.devis.find(
        (d) => normalizeHeader(d.numeroBatappli) === normalizeHeader(numero),
      );
      const ht = Number(row.data.montantHT) || 0;
      const jours =
        row.data.joursCharge != null && Number(row.data.joursCharge) > 0
          ? Number(row.data.joursCharge)
          : null;
      const statut =
        parseStatutAffaire(row.data.statut) ??
        (row.status === 'create' ? 'PORTEFEUILLE' : undefined);

      if (!existing) {
        if (jours == null) {
          report.errors += 1;
          report.lines.push({
            status: 'error',
            motif: 'Jours de charge obligatoires à la création',
            sourceRow: row.sourceRow,
            label,
          });
          continue;
        }
        const syndicNom = String(row.data.syndic || 'Syndic import');
        let syndic = next.syndics.find(
          (s) => normalizeHeader(s.nom) === normalizeHeader(syndicNom),
        );
        if (!syndic) {
          syndic = {
            id: uid('syn'),
            nom: syndicNom,
            contacts: [],
            telephone: '',
            email: '',
            notes: 'Créé par import Excel',
          };
          next = { ...next, syndics: [...next.syndics, syndic] };
        }
        const adresse = String(row.data.adresse || 'Adresse à préciser');
        let imm = next.immeubles.find(
          (im) =>
            im.syndicId === syndic!.id &&
            normalizeHeader(im.adresse) === normalizeHeader(adresse.split(',')[0] ?? adresse),
        );
        if (!imm) {
          imm = {
            id: uid('imm'),
            syndicId: syndic.id,
            adresse: adresse.split(',')[0]?.trim() || adresse,
            codePostal: '',
            ville: adresse.includes(',') ? adresse.split(',').slice(1).join(',').trim() : '',
            acces: '',
            notesTerrain: '',
          };
          next = { ...next, immeubles: [...next.immeubles, imm] };
        }
        const devisId = uid('dev');
        const affaireId = uid('aff');
        const date = String(row.data.date || t);
        const devis: Devis = {
          id: devisId,
          numeroBatappli: numero,
          date,
          montantHT: ht,
          montantTTC: Math.round(ht * 1.2),
          type: parseTypeDevis(row.data.type),
          immeubleId: imm.id,
          statut: 'SIGNE',
          source: 'IMPORT_EXCEL',
        };
        const affaire: Affaire = {
          id: affaireId,
          devisId,
          immeubleId: imm.id,
          statut: statut ?? 'PORTEFEUILLE',
          joursChargeEstimes: jours,
          acompteAttendu: Number(row.data.acompteAttendu) || 0,
          acompteRecu: Number(row.data.acompteRecu) || 0,
          dateDerniereAction: t,
          commentaire: String(row.data.commentaire || ''),
        };
        next = {
          ...next,
          devis: [...next.devis, devis],
          affaires: [...next.affaires, affaire],
        };
        report.created += 1;
        report.lines.push({
          status: 'create',
          motif: 'Devis + affaire créés',
          sourceRow: row.sourceRow,
          label,
        });
      } else {
        const aff = next.affaires.find((a) => a.devisId === existing.id);
        next = {
          ...next,
          devis: next.devis.map((d) =>
            d.id !== existing.id
              ? d
              : {
                  ...d,
                  montantHT: ht || d.montantHT,
                  montantTTC: ht ? Math.round(ht * 1.2) : d.montantTTC,
                  type: row.data.type ? parseTypeDevis(row.data.type) : d.type,
                },
          ),
          affaires: next.affaires.map((a) =>
            !aff || a.id !== aff.id
              ? a
              : {
                  ...a,
                  joursChargeEstimes:
                    jours ?? a.joursChargeEstimes,
                  acompteAttendu:
                    row.data.acompteAttendu != null
                      ? Number(row.data.acompteAttendu)
                      : a.acompteAttendu,
                  acompteRecu:
                    row.data.acompteRecu != null
                      ? Number(row.data.acompteRecu)
                      : a.acompteRecu,
                  commentaire: String(row.data.commentaire || a.commentaire),
                  statut: statut ?? a.statut,
                  dateDerniereAction: t,
                },
          ),
        };
        report.updated += 1;
        report.lines.push({
          status: 'update',
          motif: 'Devis / affaire mis à jour',
          sourceRow: row.sourceRow,
          label,
        });
      }
    } else if (kind === 'planning') {
      const date = String(row.data.date);
      const equipeLabel = String(row.data.equipe);
      const eq = next.equipes.find(
        (e) =>
          normalizeHeader(e.libelle).includes(normalizeHeader(equipeLabel)) ||
          normalizeHeader(equipeLabel).includes(normalizeHeader(e.libelle).slice(0, 8)),
      );
      if (!eq) {
        report.errors += 1;
        report.lines.push({
          status: 'error',
          motif: 'Équipe introuvable',
          sourceRow: row.sourceRow,
          label,
        });
        continue;
      }
      const affType = parseAffectationType(row.data.type || 'CHANTIER');
      const numero = String(row.data.numeroDevis || '');
      let affaireId: string | undefined;
      if (affType === 'CHANTIER' && numero) {
        const devis = next.devis.find(
          (d) => normalizeHeader(d.numeroBatappli) === normalizeHeader(numero),
        );
        affaireId = next.affaires.find((a) => a.devisId === devis?.id)?.id;
        if (!affaireId) {
          report.errors += 1;
          report.lines.push({
            status: 'error',
            motif: 'Affaire introuvable pour ce devis',
            sourceRow: row.sourceRow,
            label,
          });
          continue;
        }
      }
      const affectation: Affectation = {
        id: uid('affec'),
        date,
        equipeId: eq.id,
        affaireId,
        type: affType,
        commentaire: String(row.data.commentaire || ''),
      };
      let affaires = next.affaires;
      if (affaireId) {
        affaires = next.affaires.map((a) =>
          a.id === affaireId && a.statut === 'PORTEFEUILLE'
            ? { ...a, statut: 'PLANIFIE' as const, dateDerniereAction: t }
            : a,
        );
      }
      next = {
        ...next,
        affectations: [...next.affectations, affectation],
        affaires,
      };
      report.created += 1;
      report.lines.push({
        status: 'create',
        motif: 'Affectation créée',
        sourceRow: row.sourceRow,
        label,
      });
    } else {
      // planning_ce
      const syndicNom = String(row.data.syndic);
      const adresse = String(row.data.adresse);
      let syndic = next.syndics.find(
        (s) => normalizeHeader(s.nom) === normalizeHeader(syndicNom),
      );
      if (!syndic) {
        syndic = {
          id: uid('syn'),
          nom: syndicNom,
          contacts: [],
          telephone: '',
          email: '',
          notes: 'Créé par import Excel',
        };
        next = { ...next, syndics: [...next.syndics, syndic] };
      }
      let imm = next.immeubles.find(
        (im) =>
          normalizeHeader(im.adresse).includes(normalizeHeader(adresse).slice(0, 12)) ||
          normalizeHeader(adresse).includes(normalizeHeader(im.adresse).slice(0, 12)),
      );
      if (!imm) {
        imm = {
          id: uid('imm'),
          syndicId: syndic.id,
          adresse: adresse.split(',')[0]?.trim() || adresse,
          codePostal: '',
          ville: '',
          acces: '',
          notesTerrain: '',
        };
        next = { ...next, immeubles: [...next.immeubles, imm] };
      }
      const existing = next.contrats.find((c) => c.immeubleId === imm!.id && !c.archived);
      const mois = Number(row.data.moisPassage);
      const montant = Number(row.data.montantHT) || 0;
      if (!existing) {
        const ct: ContratEntretien = {
          id: uid('ce'),
          immeubleId: imm.id,
          syndicId: syndic.id,
          montantHTAnnuel: montant,
          nbCompagnons: Number(row.data.compagnons) || 2,
          nbJours: 2,
          moisPassageContractuel: mois,
          exerciceDebut: '07-01',
          exerciceFin: '06-30',
          taciteReconduction: true,
          preavisMois: 3,
          statut: 'ACTIF',
          commentaire: String(row.data.commentaire || ''),
        };
        const ex = currentExercice(t);
        next = {
          ...next,
          contrats: [...next.contrats, ct],
          passagesCe: [
            ...next.passagesCe,
            {
              id: uid('pass'),
              contratId: ct.id,
              exercice: ex.label,
              statut: 'A_PROGRAMMER',
              photos: [],
              compteRendu: '',
            },
          ],
        };
        report.created += 1;
        report.lines.push({
          status: 'create',
          motif: 'Contrat CE créé',
          sourceRow: row.sourceRow,
          label,
        });
      } else {
        next = {
          ...next,
          contrats: next.contrats.map((c) =>
            c.id !== existing.id
              ? c
              : {
                  ...c,
                  moisPassageContractuel: mois,
                  montantHTAnnuel: montant || c.montantHTAnnuel,
                  commentaire: String(row.data.commentaire || c.commentaire),
                },
          ),
        };
        report.updated += 1;
        report.lines.push({
          status: 'update',
          motif: 'Contrat CE mis à jour',
          sourceRow: row.sourceRow,
          label,
        });
      }
    }
  }

  // journal
  next = {
    ...next,
    settings: {
      ...next.settings,
      importMappings: {
        ...(next.settings.importMappings ?? {}),
        [kind]: mapping,
      },
    },
    journal: [
      {
        id: uid('j'),
        utilisateurId: userId,
        entite: `import:${kind}`,
        action: 'import_xlsx',
        valeurApres: `${report.created} créés, ${report.updated} maj, ${report.ignored} ignorés`,
        horodatage: new Date().toISOString(),
      },
      ...next.journal,
    ],
  };

  return { state: next, report };
}

/** Génère un classeur modèle 3 onglets (démo / reprise historique). */
export function buildExampleWorkbook(): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  const portefeuille = [
    {
      'N° de devis': 'D-IMPORT-01',
      Syndic: 'Cabinet Dupont',
      'Adresse chantier': '10 rue Import, 93000 Bobigny',
      'Montant HT': 12500,
      Date: '2026-07-15',
      'Acompte TTC': 3750,
      'Acompte reçu': 3750,
      'Jours de charge': 4,
      Statut: 'Portefeuille',
      Type: 'Travaux',
      Commentaire: 'Import initial',
    },
    {
      'N° de devis': 'D-25041',
      Syndic: 'Foncia',
      'Adresse chantier': 'Mise à jour test doublon',
      'Montant HT': 42800,
      Date: '2026-06-01',
      'Acompte TTC': 12840,
      'Acompte reçu': 12840,
      'Jours de charge': 12,
      Statut: 'En cours',
      Type: 'Travaux',
      Commentaire: 'Réimport — doit mettre à jour ou ignorer',
    },
  ];
  const planning = [
    {
      Date: '2026-08-10',
      Équipe: 'Équipe A',
      'N° de devis': 'D-25041',
      Type: 'CHANTIER',
      Commentaire: 'Import planning',
    },
    {
      Date: '2026-08-11',
      Équipe: 'Équipe B',
      'N° de devis': '',
      Type: 'CONGES',
      Commentaire: '',
    },
  ];
  const ce = [
    {
      Syndic: 'Cabinet Martin',
      Adresse: '5 place de la Mairie',
      'Montant HT annuel': 4800,
      'Nb compagnons': 2,
      'Mois passage': 'Octobre',
      Statut: 'Actif',
      Commentaire: 'Import CE',
    },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(portefeuille), 'Portefeuille');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(planning), 'Planning chantiers');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ce), 'Planning CE');
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

export function downloadExampleXlsx() {
  const buf = buildExampleWorkbook();
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'setrim-import-exemple.xlsx';
  a.click();
  URL.revokeObjectURL(url);
}
