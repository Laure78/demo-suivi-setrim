/**
 * Régénère public/examples/devis-exemple.xlsx
 * Usage : node scripts/generate-devis-exemple.mjs
 */
import * as XLSX from 'xlsx';
import { mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = join(__dirname, '../public/examples/devis-exemple.xlsx');

const rows = [
  {
    'Numéro de devis': 'DEV-2026-0142',
    Client: 'SCI Les Peupliers',
    'Adresse du chantier': '22 rue des Peupliers, 93100 Montreuil',
    'Montant HT': 18450.0,
    Date: '2026-09-15',
  },
  {
    'Numéro de devis': 'DEV-2026-0158',
    Client: 'Copropriété Bellevue',
    'Adresse du chantier': '7 avenue Bellevue, 94130 Nogent-sur-Marne',
    'Montant HT': 32780.5,
    Date: '2026-10-02',
  },
];

mkdirSync(dirname(out), { recursive: true });
const ws = XLSX.utils.json_to_sheet(rows);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Devis');
XLSX.writeFile(wb, out);
console.log('Écrit', out);
