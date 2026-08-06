'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileSpreadsheet, Upload } from 'lucide-react';
import { useApp } from '@/context/AppStateContext';
import {
  EXPECTED_COLUMNS,
  formatMontantHT,
  parseBatappliDevisBuffer,
  suggestDatesFromDevis,
  type DevisRow,
  type ParseFailure,
} from '@/lib/batappli-import';
import { TEAMS } from '@/lib/users';
import { formatFR } from '@/lib/dates';
import type { TeamId } from '@/lib/types';

type PreviewState = {
  rows: DevisRow[];
  sheetName: string;
  /** Lignes cochées pour import */
  selected: Set<number>;
  teamId: TeamId;
};

export function ImportDevisPanel() {
  const { createProgrammedChantier } = useApp();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<ParseFailure | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File | undefined) {
    setError(null);
    setPreview(null);
    if (!file) return;

    if (!/\.xlsx$/i.test(file.name) && !/\.xls$/i.test(file.name)) {
      setError({
        ok: false,
        error: 'Format non supporté. Importez un fichier Excel (.xlsx).',
      });
      return;
    }

    setBusy(true);
    try {
      const buffer = await file.arrayBuffer();
      const result = parseBatappliDevisBuffer(buffer);
      if (!result.ok) {
        setError(result);
        return;
      }
      setPreview({
        rows: result.rows,
        sheetName: result.sheetName,
        selected: new Set(result.rows.map((_, i) => i)),
        teamId: 'equipe-a',
      });
    } catch {
      setError({
        ok: false,
        error: 'Erreur inattendue lors de la lecture du fichier.',
      });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function toggleRow(index: number) {
    setPreview((p) => {
      if (!p) return p;
      const selected = new Set(p.selected);
      if (selected.has(index)) selected.delete(index);
      else selected.add(index);
      return { ...p, selected };
    });
  }

  function confirmImport() {
    if (!preview || preview.selected.size === 0) return;
    const ids: string[] = [];
    for (const i of Array.from(preview.selected).sort((a, b) => a - b)) {
      const row = preview.rows[i];
      if (!row) continue;
      const { startDate, endDate } = suggestDatesFromDevis(row.date);
      const id = createProgrammedChantier({
        title: `Devis ${row.numeroDevis}`,
        client: row.client,
        address: row.adresse,
        startDate,
        endDate,
        teamId: preview.teamId,
        devisNumero: row.numeroDevis,
        montantHT: row.montantHT ?? undefined,
      });
      ids.push(id);
    }
    setPreview(null);
    if (ids.length === 1) router.push(`/chantiers/${ids[0]}`);
  }

  return (
    <div className="card space-y-4 border-dashed border-[var(--navy)]/30 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-base font-bold text-[var(--navy)]">
            <FileSpreadsheet size={18} />
            Importer un devis (Excel)
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Export Batappli → aperçu → création chantier + check-list standard.
            Colonnes attendues : {EXPECTED_COLUMNS.join(', ')}.
          </p>
        </div>
        <a
          href="/examples/devis-exemple.xlsx"
          className="btn-secondary text-xs"
          download
        >
          Télécharger l’exemple
        </a>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <button
          type="button"
          className="btn-primary"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          <Upload size={16} />
          {busy ? 'Lecture…' : 'Importer un devis (Excel)'}
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-[var(--danger-bg)] px-4 py-3 text-sm text-red-900">
          <p className="font-bold">Import impossible</p>
          <p className="mt-1">{error.error}</p>
          {error.missingColumns?.length ? (
            <ul className="mt-2 list-inside list-disc text-red-800">
              {error.missingColumns.map((c) => (
                <li key={c}>
                  Colonne manquante : <strong>{c}</strong>
                </li>
              ))}
            </ul>
          ) : null}
          {error.foundHeaders?.length ? (
            <p className="mt-2 text-xs text-red-700">
              En-têtes trouvés : {error.foundHeaders.join(' · ')}
            </p>
          ) : null}
        </div>
      ) : null}

      {preview ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <p className="text-sm font-semibold text-slate-800">
              Aperçu — feuille « {preview.sheetName} » ({preview.rows.length} ligne
              {preview.rows.length > 1 ? 's' : ''})
            </p>
            <label className="block text-sm">
              Équipe pour ces chantiers
              <select
                className="input mt-1 min-w-[12rem]"
                value={preview.teamId}
                onChange={(e) =>
                  setPreview((p) =>
                    p ? { ...p, teamId: e.target.value as TeamId } : p,
                  )
                }
              >
                {TEAMS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Import</th>
                  <th className="px-3 py-2">N° devis</th>
                  <th className="px-3 py-2">Client</th>
                  <th className="px-3 py-2">Adresse</th>
                  <th className="px-3 py-2">Montant HT</th>
                  <th className="px-3 py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, i) => (
                  <tr key={`${row.numeroDevis}-${i}`} className="border-t border-slate-100">
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        className="h-5 w-5 accent-[var(--navy)]"
                        checked={preview.selected.has(i)}
                        onChange={() => toggleRow(i)}
                        aria-label={`Importer ${row.numeroDevis}`}
                      />
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-[var(--navy)]">
                      {row.numeroDevis}
                    </td>
                    <td className="px-3 py-2.5">{row.client}</td>
                    <td className="px-3 py-2.5 text-slate-600">{row.adresse}</td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {formatMontantHT(row.montantHT)}
                    </td>
                    <td className="px-3 py-2.5">
                      {row.date ? formatFR(row.date) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary"
              disabled={preview.selected.size === 0}
              onClick={confirmImport}
            >
              Valider l’import ({preview.selected.size})
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setPreview(null)}
            >
              Annuler
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
