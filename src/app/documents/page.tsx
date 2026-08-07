'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useApp } from '@/context/AppStateContext';
import type { DocumentType } from '@/lib/domain/types';
import { adresseCourte, getImmeuble, getSyndic } from '@/lib/domain/lookups';
import { formatFR } from '@/lib/dates';
import { FileText, Trash2, Upload } from 'lucide-react';

const TYPE_LABELS: Record<DocumentType, string> = {
  DEVIS: 'Devis',
  FACTURE: 'Facture',
  PHOTO: 'Photo',
  PV: 'PV',
  PLAN: 'Plan',
  BON: 'Bon',
  AUTRE: 'Autre',
};

const TYPE_OPTIONS = Object.keys(TYPE_LABELS) as DocumentType[];

export default function DocumentsPage() {
  const { state, addDocument, removeDocument } = useApp();
  const [filterType, setFilterType] = useState<DocumentType | ''>('');
  const [filterEntite, setFilterEntite] = useState('');
  const [entiteLiee, setEntiteLiee] = useState('');
  const [docType, setDocType] = useState<DocumentType>('DEVIS');
  const [error, setError] = useState('');

  const entiteOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    for (const a of state.affaires.filter((x) => !x.archived)) {
      const d = state.devis.find((x) => x.id === a.devisId);
      const imm = getImmeuble(state, a.immeubleId);
      opts.push({
        value: `affaire:${a.id}`,
        label: `Affaire · ${d?.numeroBatappli ?? a.id} — ${adresseCourte(imm)}`,
      });
    }
    for (const c of state.contrats.filter((x) => !x.archived)) {
      const imm = getImmeuble(state, c.immeubleId);
      const syn = getSyndic(state, c.syndicId);
      opts.push({
        value: `contrat:${c.id}`,
        label: `Contrat CE · ${syn?.nom ?? ''} — ${adresseCourte(imm)}`,
      });
    }
    for (const im of state.immeubles.filter((x) => !x.archived)) {
      opts.push({
        value: `immeuble:${im.id}`,
        label: `Immeuble · ${adresseCourte(im)}`,
      });
    }
    return opts;
  }, [state]);

  const docs = useMemo(() => {
    return state.documents
      .filter((d) => {
        if (d.archived) return false;
        if (filterType && d.type !== filterType) return false;
        if (filterEntite && !d.entiteLiee.startsWith(filterEntite)) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [state.documents, filterType, filterEntite]);

  function labelEntite(entiteLiee: string): string {
    return entiteOptions.find((o) => o.value === entiteLiee)?.label ?? entiteLiee;
  }

  function onUpload(file: File | null) {
    setError('');
    if (!file) return;
    if (!entiteLiee) {
      setError('Choisissez une entité (affaire, contrat ou immeuble).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? '');
      const id = addDocument({
        entiteLiee,
        type: docType,
        nomFichier: file.name,
        fichier: dataUrl,
        mime: file.type,
      });
      if (!id) setError('Impossible d’ajouter le document.');
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-[var(--navy)] sm:text-2xl">
          Bibliothèque documents
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Devis, factures, photos, PV, plans, bons — rattachés aux affaires, contrats et
          immeubles.
        </p>
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold text-[var(--navy)]">Déposer un document</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium">
            Entité liée
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={entiteLiee}
              onChange={(e) => setEntiteLiee(e.target.value)}
            >
              <option value="">— Choisir —</option>
              {entiteOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Type
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={docType}
              onChange={(e) => setDocType(e.target.value as DocumentType)}
            >
              {TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--navy)] px-4 py-2.5 text-sm font-semibold text-white">
          <Upload size={16} />
          Choisir un fichier
          <input
            type="file"
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.xlsx"
            onChange={(e) => onUpload(e.target.files?.[0] ?? null)}
          />
        </label>
        {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
      </div>

      <div className="card grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium">
          Filtrer par type
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as DocumentType | '')}
          >
            <option value="">Tous</option>
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Filtrer par famille
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={filterEntite}
            onChange={(e) => setFilterEntite(e.target.value)}
          >
            <option value="">Toutes</option>
            <option value="affaire:">Affaires</option>
            <option value="contrat:">Contrats</option>
            <option value="immeuble:">Immeubles</option>
          </select>
        </label>
      </div>

      <ul className="space-y-2">
        {docs.length === 0 ? (
          <li className="card text-sm text-slate-500">Aucun document.</li>
        ) : null}
        {docs.map((d) => {
          const isImage = d.mime?.startsWith('image/') || d.fichier.startsWith('data:image');
          const href = d.entiteLiee.startsWith('affaire:')
            ? `/affaires/${d.entiteLiee.slice(8)}`
            : d.entiteLiee.startsWith('contrat:')
              ? '/planning-ce'
              : '/portefeuille';
          return (
            <li key={d.id} className="card flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-semibold text-[var(--navy)]">
                  <FileText size={16} />
                  {d.nomFichier}
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-700">
                    {TYPE_LABELS[d.type]}
                  </span>
                </p>
                <p className="mt-1 text-sm text-slate-600">{labelEntite(d.entiteLiee)}</p>
                <p className="text-xs text-slate-500">
                  {formatFR(d.date)}
                  {d.deposeParNom ? ` · ${d.deposeParNom}` : ''}
                </p>
                {isImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={d.fichier}
                    alt={d.nomFichier}
                    className="mt-2 max-h-24 rounded border border-slate-200"
                  />
                ) : d.fichier.startsWith('data:') ? (
                  <a
                    href={d.fichier}
                    download={d.nomFichier}
                    className="mt-1 inline-block text-xs font-medium text-[var(--navy)] underline"
                  >
                    Télécharger
                  </a>
                ) : null}
              </div>
              <div className="flex gap-2">
                <Link href={href} className="btn-secondary py-1.5 text-xs">
                  Ouvrir
                </Link>
                <button
                  type="button"
                  className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
                  title="Archiver"
                  onClick={() => removeDocument(d.id)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
