/**
 * Import devis Batappli (fichier Excel) — parsing isolé.
 *
 * Batappli n'a pas d'API : l'export .xlsx est la passerelle.
 * Adapter EXPECTED_COLUMNS / HEADER_ALIASES quand on aura le vrai export.
 */

import * as XLSX from 'xlsx';
import { addDays, todayISO, toISODate } from '@/lib/dates';

/** Colonnes attendues (libellés « canoniques » affichés à l'utilisateur). */
export const EXPECTED_COLUMNS = [
  'Numéro de devis',
  'Client',
  'Adresse du chantier',
  'Montant HT',
  'Date',
] as const;

/** Colonnes optionnelles (présentes dans le cadrage, non bloquantes). */
const OPTIONAL_COLUMNS = ['Montant TTC', 'Client/syndic'] as const;

export type ExpectedColumn = (typeof EXPECTED_COLUMNS)[number];

/**
 * Alias acceptés pour chaque colonne (normalisés en minuscules, sans accents).
 * Point d'ajustement principal quand le vrai export Batappli arrivera.
 */
const HEADER_ALIASES: Record<ExpectedColumn | 'Montant TTC' | 'Client/syndic', string[]> = {
  'Numéro de devis': [
    'numero de devis',
    'n de devis',
    'n° de devis',
    'no de devis',
    'num devis',
    'devis',
    'numero devis',
  ],
  Client: ['client', 'nom client', 'raison sociale', 'client syndic', 'syndic'],
  'Adresse du chantier': [
    'adresse du chantier',
    'adresse chantier',
    'adresse',
    'lieu',
  ],
  'Montant HT': ['montant ht', 'montant', 'ht', 'total ht', 'montantht'],
  'Montant TTC': ['montant ttc', 'ttc', 'total ttc', 'montantttc'],
  'Client/syndic': ['client syndic', 'syndic', 'client/syndic'],
  Date: ['date', 'date devis', 'date du devis'],
};

export type DevisRow = {
  numeroDevis: string;
  client: string;
  adresse: string;
  montantHT: number | null;
  montantTTC: number | null;
  /** YYYY-MM-DD si parsable, sinon null */
  date: string | null;
  /** Ligne Excel d'origine (1-based, en-tête = 1) */
  sourceRow: number;
};

export type ParseSuccess = {
  ok: true;
  rows: DevisRow[];
  sheetName: string;
};

export type ParseFailure = {
  ok: false;
  error: string;
  missingColumns?: string[];
  foundHeaders?: string[];
};

export type ParseResult = ParseSuccess | ParseFailure;

/** Normalise un en-tête pour comparaison souple. */
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

function resolveColumnMap(
  headers: string[],
): {
  map: Record<ExpectedColumn, number> & Partial<Record<'Montant TTC', number>>;
} | { missing: string[]; found: string[] } {
  const normalized = headers.map(normalizeHeader);
  const map = {} as Record<ExpectedColumn, number> & Partial<Record<'Montant TTC', number>>;
  const missing: string[] = [];

  for (const col of EXPECTED_COLUMNS) {
    const aliases = HEADER_ALIASES[col].map(normalizeHeader);
    const idx = normalized.findIndex((h) => aliases.includes(h));
    if (idx === -1) missing.push(col);
    else map[col] = idx;
  }

  for (const col of OPTIONAL_COLUMNS) {
    if (col === 'Client/syndic') continue;
    const aliases = HEADER_ALIASES[col].map(normalizeHeader);
    const idx = normalized.findIndex((h) => aliases.includes(h));
    if (idx !== -1) map[col as 'Montant TTC'] = idx;
  }

  if (missing.length) {
    return {
      missing,
      found: headers.filter((h) => String(h).trim() !== ''),
    };
  }
  return { map };
}

function cellToString(v: unknown): string {
  if (v == null) return '';
  if (v instanceof Date) return toISODate(v);
  return String(v).trim();
}

function parseMontant(v: unknown): number | null {
  if (v == null || v === '') return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const s = String(v)
    .replace(/\s/g, '')
    .replace('€', '')
    .replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Excel serial date ou chaîne → YYYY-MM-DD */
function parseExcelDate(v: unknown): string | null {
  if (v == null || v === '') return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return toISODate(v);
  if (typeof v === 'number' && Number.isFinite(v)) {
    // Serial Excel → JS date (SheetJS)
    const parsed = XLSX.SSF.parse_date_code(v);
    if (!parsed) return null;
    const d = new Date(parsed.y, parsed.m - 1, parsed.d);
    return toISODate(d);
  }
  const s = String(v).trim();
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  // DD/MM/YYYY
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const dd = m[1].padStart(2, '0');
    const mm = m[2].padStart(2, '0');
    return `${m[3]}-${mm}-${dd}`;
  }
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return toISODate(d);
  return null;
}

/**
 * Parse un ArrayBuffer .xlsx Batappli.
 * Point d'entrée unique — à brancher plus tard sur un vrai export sans toucher l'UI.
 */
export function parseBatappliExcel(input: ArrayBuffer | Buffer): ParseResult {
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(input)) {
    const ab = input.buffer.slice(
      input.byteOffset,
      input.byteOffset + input.byteLength,
    ) as ArrayBuffer;
    return parseBatappliDevisBuffer(ab);
  }
  return parseBatappliDevisBuffer(input as ArrayBuffer);
}

export function parseBatappliDevisBuffer(buffer: ArrayBuffer): ParseResult {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  } catch {
    return {
      ok: false,
      error: 'Impossible de lire ce fichier. Vérifiez qu’il s’agit bien d’un Excel (.xlsx) ou d’un PDF devis.',
    };
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { ok: false, error: 'Le fichier Excel ne contient aucune feuille.' };
  }

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(sheet, {
    header: 1,
    defval: null,
    raw: true,
  });

  if (!matrix.length) {
    return { ok: false, error: 'La feuille est vide.' };
  }

  const headerRow = (matrix[0] ?? []).map((c) => (c == null ? '' : String(c)));
  const resolved = resolveColumnMap(headerRow);

  if ('missing' in resolved) {
    return {
      ok: false,
      error: `Colonne(s) manquante(s) dans l’export : ${resolved.missing.join(', ')}.`,
      missingColumns: resolved.missing,
      foundHeaders: resolved.found,
    };
  }

  const { map } = resolved;
  const rows: DevisRow[] = [];

  for (let i = 1; i < matrix.length; i++) {
    const line = matrix[i] ?? [];
    const numeroDevis = cellToString(line[map['Numéro de devis']]);
    const client = cellToString(line[map.Client]);
    const adresse = cellToString(line[map['Adresse du chantier']]);
    // Ligne complètement vide → ignorer
    if (!numeroDevis && !client && !adresse) continue;

    rows.push({
      numeroDevis: numeroDevis || `(sans n°)`,
      client: client || 'Client non renseigné',
      adresse: adresse || 'Adresse à préciser',
      montantHT: parseMontant(line[map['Montant HT']]),
      montantTTC:
        map['Montant TTC'] != null ? parseMontant(line[map['Montant TTC']]) : null,
      date: parseExcelDate(line[map.Date]),
      sourceRow: i + 1,
    });
  }

  if (!rows.length) {
    return {
      ok: false,
      error: 'Aucune ligne de devis trouvée sous l’en-tête.',
      foundHeaders: headerRow.filter((h) => h.trim()),
    };
  }

  return { ok: true, rows, sheetName };
}

/** Dates de planning proposées à partir de la date devis. */
export function suggestDatesFromDevis(date: string | null): {
  startDate: string;
  endDate: string;
} {
  const t = todayISO();
  const start = date && date >= t ? date : addDays(t, 7);
  return { startDate: start, endDate: addDays(start, 21) };
}

export function formatMontantHT(n: number | null): string {
  if (n == null) return '—';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(n);
}

function cleanPdfText(s: string) {
  return s
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n');
}

function pickMontant(text: string, labels: RegExp[]): number | null {
  for (const lab of labels) {
    const m = text.match(lab);
    if (!m?.[1]) continue;
    const n = parseMontant(m[1]);
    if (n != null) return n;
  }
  return null;
}

/**
 * Import d’un devis PDF Batappli (un devis = un fichier).
 * Extrait n° devis, client, adresse, montants si le texte est lisible.
 */
export async function parseBatappliPdf(
  input: Buffer,
  filename = 'devis.pdf',
): Promise<ParseResult> {
  let text = '';
  try {
    // pdf-parse v1 — CommonJS
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>;
    const data = await pdfParse(input);
    text = cleanPdfText(data.text || '');
  } catch {
    return {
      ok: false,
      error:
        'Impossible de lire ce PDF. Essayez un export Excel Batappli, ou un PDF texte (non scanné).',
    };
  }

  if (!text.trim()) {
    // Fallback : n° depuis le nom de fichier
    const fromName = filename.replace(/\.pdf$/i, '').trim();
    const numGuess =
      fromName.match(/(\d{4,6}(?:-\d+[A-Z]?)?)/)?.[1] ??
      fromName.slice(0, 24) ??
      `PDF-${Date.now().toString(36)}`;
    return {
      ok: true,
      sheetName: filename,
      rows: [
        {
          numeroDevis: numGuess,
          client: 'Client à préciser',
          adresse: 'Adresse à préciser',
          montantHT: null,
          montantTTC: null,
          date: null,
          sourceRow: 1,
        },
      ],
    };
  }

  const numero =
    text.match(
      /(?:n[°o]?\.?\s*de\s*devis|devis\s*n[°o]?\.?|num[ée]ro\s*de\s*devis)\s*[:\s]*([A-Z0-9][\w./-]{2,24})/i,
    )?.[1] ??
    text.match(/\b(\d{4,6}(?:-\d+[A-Za-z]?)?)\b/)?.[1] ??
    filename.replace(/\.pdf$/i, '').slice(0, 24);

  const client =
    text.match(
      /(?:client|syndic|raison\s*sociale|ma[iî]tre\s*d['’]ouvrage)\s*[:\s]+([^\n]{3,80})/i,
    )?.[1]?.trim() ?? 'Client à préciser';

  const adresse =
    text.match(
      /(?:adresse\s*(?:du\s*)?chantier|lieu\s*d['’]intervention|adresse)\s*[:\s]+([^\n]{5,120})/i,
    )?.[1]?.trim() ?? 'Adresse à préciser';

  const montantHT = pickMontant(text, [
    /montant\s*h\.?\s*t\.?\s*[:\s]*([\d\s]+(?:[.,]\d{1,2})?)\s*€?/i,
    /total\s*h\.?\s*t\.?\s*[:\s]*([\d\s]+(?:[.,]\d{1,2})?)/i,
    /h\.?\s*t\.?\s*[:\s]*([\d\s]+(?:[.,]\d{1,2})?)\s*€/i,
  ]);

  const montantTTC = pickMontant(text, [
    /montant\s*t\.?\s*t\.?\s*c\.?\s*[:\s]*([\d\s]+(?:[.,]\d{1,2})?)\s*€?/i,
    /total\s*t\.?\s*t\.?\s*c\.?\s*[:\s]*([\d\s]+(?:[.,]\d{1,2})?)/i,
  ]);

  const dateRaw =
    text.match(
      /(?:date\s*(?:du\s*)?devis|fait\s*le|le)\s*[:\s]*(\d{1,2}[/.]\d{1,2}[/.]\d{2,4})/i,
    )?.[1] ?? text.match(/\b(\d{1,2}\/\d{1,2}\/\d{4})\b/)?.[1];

  const date = dateRaw ? parseExcelDate(dateRaw.replace(/\./g, '/')) : null;

  return {
    ok: true,
    sheetName: filename,
    rows: [
      {
        numeroDevis: String(numero).trim() || `PDF-${Date.now().toString(36)}`,
        client: client.slice(0, 120),
        adresse: adresse.slice(0, 200),
        montantHT,
        montantTTC,
        date,
        sourceRow: 1,
      },
    ],
  };
}

/** Détecte Excel / CSV / PDF d’après le nom ou le contenu. */
export function isPdfFile(filename: string, mime?: string | null) {
  const n = filename.toLowerCase();
  return n.endsWith('.pdf') || mime === 'application/pdf';
}

