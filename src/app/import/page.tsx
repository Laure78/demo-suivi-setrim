'use client';

import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { useApp } from '@/context/AppStateContext';
import type { ColumnMapping, ImportSheetKind } from '@/lib/domain/types';
import {
  applyImport,
  buildAutoMapping,
  buildPreview,
  detectSheetKind,
  downloadExampleXlsx,
  readWorkbook,
  SHEET_FIELDS,
  SHEET_KIND_LABEL,
  type PreviewRow,
} from '@/lib/domain/xlsx-import';
import { Download, FileSpreadsheet, Upload } from 'lucide-react';

type Step = 'upload' | 'mapping' | 'preview' | 'report';

export default function ImportPage() {
  const { state, user, commitImportedState, saveImportMapping } = useApp();
  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheets, setSheets] = useState<
    { name: string; headers: string[]; rowCount: number }[]
  >([]);
  const [sheetName, setSheetName] = useState('');
  const [kind, setKind] = useState<ImportSheetKind>('portefeuille');
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [previewError, setPreviewError] = useState('');
  const [report, setReport] = useState<ReturnType<typeof applyImport>['report'] | null>(
    null,
  );
  const [error, setError] = useState('');

  const headers = useMemo(
    () => sheets.find((s) => s.name === sheetName)?.headers ?? [],
    [sheets, sheetName],
  );

  const savedMapping = state.settings.importMappings?.[kind];

  async function onFile(file: File | null) {
    if (!file) return;
    setError('');
    setReport(null);
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setError('Seuls les fichiers .xlsx sont acceptés.');
      return;
    }
    const buf = await file.arrayBuffer();
    const res = readWorkbook(buf);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setFileName(file.name);
    setWorkbook(res.workbook);
    setSheets(res.sheets);
    const first = res.sheets[0]!;
    setSheetName(first.name);
    const detected = detectSheetKind(first.name) ?? 'portefeuille';
    setKind(detected);
    const map = buildAutoMapping(
      first.headers,
      detected,
      state.settings.importMappings?.[detected],
    );
    setMapping(map);
    setStep('mapping');
  }

  function changeSheet(name: string) {
    setSheetName(name);
    const sh = sheets.find((s) => s.name === name);
    if (!sh) return;
    const detected = detectSheetKind(name) ?? kind;
    setKind(detected);
    setMapping(
      buildAutoMapping(sh.headers, detected, state.settings.importMappings?.[detected]),
    );
  }

  function changeKind(k: ImportSheetKind) {
    setKind(k);
    setMapping(buildAutoMapping(headers, k, state.settings.importMappings?.[k]));
  }

  function goPreview() {
    if (!workbook) return;
    saveImportMapping(kind, mapping);
    const res = buildPreview(workbook, sheetName, kind, mapping, state);
    if (res.error) {
      setPreviewError(res.error);
      setPreview([]);
    } else {
      setPreviewError('');
      setPreview(res.rows);
    }
    setStep('preview');
  }

  function validate() {
    if (!workbook || !user) return;
    const { state: next, report: r } = applyImport(
      state,
      workbook,
      sheetName,
      kind,
      mapping,
      user.id,
    );
    commitImportedState(next);
    setReport(r);
    setStep('report');
  }

  const counts = useMemo(() => {
    return {
      create: preview.filter((r) => r.status === 'create').length,
      update: preview.filter((r) => r.status === 'update').length,
      ignore: preview.filter((r) => r.status === 'ignore').length,
      error: preview.filter((r) => r.status === 'error').length,
    };
  }, [preview]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--navy)] sm:text-2xl">
            Import Excel Batappli
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Pas d&apos;API Batappli — reprise via .xlsx (Portefeuille, Planning, Planning CE).
            Le mapping colonnes est mémorisé.
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary inline-flex items-center gap-1.5 py-2 text-sm"
          onClick={() => downloadExampleXlsx()}
        >
          <Download size={16} />
          Modèle 3 onglets
        </button>
      </div>

      <ol className="flex flex-wrap gap-2 text-xs font-semibold">
        {(
          [
            ['upload', '1. Fichier'],
            ['mapping', '2. Mapping'],
            ['preview', '3. Prévisualisation'],
            ['report', '4. Rapport'],
          ] as const
        ).map(([s, label]) => (
          <li
            key={s}
            className={`rounded-full px-3 py-1 ${
              step === s ? 'bg-[var(--navy)] text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {label}
          </li>
        ))}
      </ol>

      {step === 'upload' ? (
        <div className="card space-y-4">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center hover:border-[var(--navy)] hover:bg-blue-50/40">
            <Upload size={28} className="text-[var(--navy)]" />
            <span className="font-semibold text-[var(--navy)]">Choisir un fichier .xlsx</span>
            <span className="text-xs text-slate-500">ou glisser-déposer</span>
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
            />
          </label>
          {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
        </div>
      ) : null}

      {step === 'mapping' && workbook ? (
        <div className="space-y-4">
          <div className="card grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">
              Feuille Excel
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                value={sheetName}
                onChange={(e) => changeSheet(e.target.value)}
              >
                {sheets.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name} ({s.rowCount} lignes)
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              Type d&apos;import
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                value={kind}
                onChange={(e) => changeKind(e.target.value as ImportSheetKind)}
              >
                {(Object.keys(SHEET_KIND_LABEL) as ImportSheetKind[]).map((k) => (
                  <option key={k} value={k}>
                    {SHEET_KIND_LABEL[k]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {savedMapping && Object.keys(savedMapping).length > 0 ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              Mapping précédent rétabli automatiquement pour « {SHEET_KIND_LABEL[kind]} ».
            </p>
          ) : (
            <p className="text-sm text-slate-600">
              Mapping détecté par alias de colonnes — ajustez si besoin.
            </p>
          )}

          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Champ SETRIM</th>
                  <th className="px-3 py-2 text-left">Colonne Excel</th>
                </tr>
              </thead>
              <tbody>
                {SHEET_FIELDS[kind].map((f) => (
                  <tr key={f.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-medium">
                      {f.label}
                      {f.required ? <span className="text-red-600"> *</span> : null}
                    </td>
                    <td className="px-3 py-2">
                      <select
                        className="w-full rounded border border-slate-300 px-2 py-1.5"
                        value={mapping[f.id] ?? ''}
                        onChange={(e) =>
                          setMapping((m) => ({ ...m, [f.id]: e.target.value }))
                        }
                      >
                        <option value="">— Non mappé —</option>
                        {headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={() => setStep('upload')}>
              Autre fichier
            </button>
            <button type="button" className="btn-primary" onClick={goPreview}>
              Prévisualiser
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Fichier : {fileName} · {SHEET_KIND_LABEL[kind]}
          </p>
        </div>
      ) : null}

      {step === 'preview' ? (
        <div className="space-y-4">
          {previewError ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {previewError}
            </p>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-4">
            <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm">
              <p className="text-xs text-emerald-700">À créer</p>
              <p className="text-xl font-bold text-emerald-900">{counts.create}</p>
            </div>
            <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm">
              <p className="text-xs text-amber-700">Conflits / maj</p>
              <p className="text-xl font-bold text-amber-900">{counts.update}</p>
            </div>
            <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm">
              <p className="text-xs text-slate-600">Ignorés</p>
              <p className="text-xl font-bold">{counts.ignore}</p>
            </div>
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm">
              <p className="text-xs text-red-700">Erreurs</p>
              <p className="text-xl font-bold text-red-900">{counts.error}</p>
            </div>
          </div>

          <div className="card max-h-[50vh] overflow-auto p-0">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Ligne</th>
                  <th className="px-3 py-2">Statut</th>
                  <th className="px-3 py-2">Motif</th>
                  <th className="px-3 py-2">Données</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((r) => (
                  <tr
                    key={`${r.sourceRow}-${r.key}`}
                    className={`border-t ${
                      r.status === 'update'
                        ? 'bg-amber-50'
                        : r.status === 'error'
                          ? 'bg-red-50'
                          : r.status === 'ignore'
                            ? 'bg-slate-50 text-slate-500'
                            : ''
                    }`}
                  >
                    <td className="px-3 py-2 tabular-nums">{r.sourceRow}</td>
                    <td className="px-3 py-2 font-semibold uppercase text-xs">
                      {r.status === 'create'
                        ? 'Créer'
                        : r.status === 'update'
                          ? 'Maj'
                          : r.status === 'ignore'
                            ? 'Ignorer'
                            : 'Erreur'}
                    </td>
                    <td className="px-3 py-2">{r.motif}</td>
                    <td className="max-w-xs truncate px-3 py-2 text-xs">
                      {Object.entries(r.data)
                        .filter(([, v]) => v != null && v !== '')
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(' · ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={() => setStep('mapping')}>
              Retour mapping
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={validate}
              disabled={!!previewError || preview.length === 0}
            >
              Valider l&apos;import
            </button>
          </div>
        </div>
      ) : null}

      {step === 'report' && report ? (
        <div className="space-y-4">
          <div className="card border border-emerald-200 bg-emerald-50">
            <p className="flex items-center gap-2 font-bold text-emerald-900">
              <FileSpreadsheet size={18} /> Import terminé
            </p>
            <p className="mt-2 text-sm text-emerald-900">
              <strong>{report.created}</strong> créés · <strong>{report.updated}</strong> mis à
              jour · <strong>{report.ignored}</strong> ignorés ·{' '}
              <strong>{report.errors}</strong> erreurs
            </p>
          </div>
          <ul className="card max-h-[40vh] space-y-1 overflow-auto text-sm">
            {report.lines.map((l, i) => (
              <li key={i} className="border-b border-slate-100 py-1.5 last:border-0">
                <span className="font-semibold uppercase text-[10px] text-slate-500">
                  {l.status}
                </span>{' '}
                L{l.sourceRow} · {l.label} — {l.motif}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setStep('upload');
              setWorkbook(null);
              setReport(null);
              setPreview([]);
            }}
          >
            Nouvel import
          </button>
        </div>
      ) : null}
    </div>
  );
}
