'use client';

import Link from 'next/link';
import { useMemo, useState, useCallback, type DragEvent } from 'react';
import { useApp } from '@/context/AppStateContext';
import {
  addDays,
  formatFR,
  startOfWeek,
  todayISO,
  weekdayShort,
} from '@/lib/dates';
import {
  adresseCourte,
  getDevis,
  getImmeuble,
  getSyndicForImmeuble,
  joursConsommes,
} from '@/lib/domain/lookups';
import {
  isJourFerie,
  isWeekend,
  planifiableStatuts,
  STATUT_AFFAIRE_COLOR,
  TYPE_LABELS,
  TYPE_STYLES,
} from '@/lib/domain/planning';
import type { Affectation, AffectationType, Affaire } from '@/lib/domain/types';
import {
  ChevronLeft,
  ChevronRight,
  FileDown,
  Plus,
  Trash2,
} from 'lucide-react';

type DragPayload =
  | { kind: 'affaire'; affaireId: string }
  | { kind: 'affectation'; affectationId: string };

function parseDrag(e: DragEvent): DragPayload | null {
  try {
    const raw = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
    if (!raw) return null;
    return JSON.parse(raw) as DragPayload;
  } catch {
    return null;
  }
}

function setDrag(e: DragEvent, payload: DragPayload) {
  e.dataTransfer.setData('application/json', JSON.stringify(payload));
  e.dataTransfer.setData('text/plain', JSON.stringify(payload));
  e.dataTransfer.effectAllowed = 'move';
}

function buildPrintHtml(opts: {
  weekStart: string;
  days: string[];
  equipes: { id: string; libelle: string; color: string }[];
  cells: Map<string, Affectation[]>;
  resolve: (it: Affectation) => {
    title: string;
    sub: string;
    num: string;
  };
  feries: Set<string>;
}): string {
  const { weekStart, days, equipes, cells, resolve, feries } = opts;
  const head = days
    .map((d) => {
      const ferie = feries.has(d);
      return `<th style="border:1px solid #94a3b8;padding:6px;background:${
        ferie ? '#e2e8f0' : '#f8fafc'
      };font-size:11px;text-align:center">${weekdayShort(d).toUpperCase()}<br/>${formatFR(d)}</th>`;
    })
    .join('');

  const body = equipes
    .map((eq) => {
      const tds = days
        .map((d) => {
          const ferie = feries.has(d);
          const items = cells.get(`${eq.id}|${d}`) ?? [];
          const inner = items
            .map((it) => {
              if (it.type !== 'CHANTIER') {
                return `<div style="margin:2px 0;padding:4px;background:#e2e8f0;border-radius:4px;font-size:10px;font-weight:700">${TYPE_LABELS[it.type]}</div>`;
              }
              const r = resolve(it);
              return `<div style="margin:2px 0;padding:4px;background:#dbeafe;border-left:3px solid ${eq.color};border-radius:3px;font-size:10px;line-height:1.25"><strong>${r.num}</strong><br/>${r.title}<br/>${r.sub}</div>`;
            })
            .join('');
          return `<td style="border:1px solid #94a3b8;padding:4px;vertical-align:top;min-width:110px;height:72px;background:${
            ferie ? '#f1f5f9' : '#fff'
          }">${inner || '&nbsp;'}</td>`;
        })
        .join('');
      return `<tr><th style="border:1px solid #94a3b8;padding:8px;text-align:left;background:#fff;color:${eq.color};font-size:12px;white-space:nowrap">${eq.libelle}</th>${tds}</tr>`;
    })
    .join('');

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/>
<title>Planning SETRIM — semaine du ${formatFR(weekStart)}</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 0; padding: 8px; }
  h1 { font-size: 18px; margin: 0 0 4px; color: #003366; }
  .meta { font-size: 11px; color: #64748b; margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style></head><body>
<h1>SETRIM — Planning chantiers</h1>
<p class="meta">Semaine du ${formatFR(weekStart)} au ${formatFR(days[6]!)} · Impression A4 paysage · mur atelier</p>
<table>
<thead><tr><th style="border:1px solid #94a3b8;padding:6px;background:#f8fafc;width:140px">Équipe</th>${head}</tr></thead>
<tbody>${body}</tbody>
</table>
<script>window.onload=function(){window.print();}</script>
</body></html>`;
}

export default function PlanningPage() {
  const {
    state,
    assignChantier,
    moveAffectation,
    createAffectationType,
    removeAffectation,
  } = useApp();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(todayISO()));
  const [mobileDay, setMobileDay] = useState(() => todayISO());
  const [dropHover, setDropHover] = useState<string | null>(null);
  const [menuCell, setMenuCell] = useState<{ equipeId: string; date: string } | null>(
    null,
  );

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const ferieSet = useMemo(() => {
    const s = new Set<string>();
    for (const d of days) {
      if (isJourFerie(state, d)) s.add(d);
    }
    return s;
  }, [days, state]);

  const cells = useMemo(() => {
    const map = new Map<string, Affectation[]>();
    for (const a of state.affectations) {
      const key = `${a.equipeId}|${a.date}`;
      const list = map.get(key) ?? [];
      list.push(a);
      map.set(key, list);
    }
    return map;
  }, [state.affectations]);

  const portefeuille = useMemo(() => {
    return state.affaires
      .filter((a) => !a.archived && planifiableStatuts().includes(a.statut))
      .map((a) => {
        const devis = getDevis(state, a.devisId)!;
        const imm = getImmeuble(state, a.immeubleId);
        const syndic = getSyndicForImmeuble(state, a.immeubleId);
        const conso = joursConsommes(state, a.id);
        return { a, devis, imm, syndic, conso };
      })
      .sort((x, y) => y.devis.date.localeCompare(x.devis.date));
  }, [state]);

  const resolveCard = useCallback(
    (it: Affectation) => {
      if (it.type !== 'CHANTIER' || !it.affaireId) {
        return {
          title: TYPE_LABELS[it.type],
          sub: it.commentaire || '',
          num: '',
          statut: undefined as Affaire['statut'] | undefined,
          syndic: '',
          href: undefined as string | undefined,
        };
      }
      const aff = state.affaires.find((a) => a.id === it.affaireId);
      const devis = aff ? getDevis(state, aff.devisId) : undefined;
      const imm = aff ? getImmeuble(state, aff.immeubleId) : undefined;
      const syndic = aff ? getSyndicForImmeuble(state, aff.immeubleId) : undefined;
      return {
        title: syndic?.nom ?? '—',
        sub: adresseCourte(imm),
        num: devis?.numeroBatappli ?? '?',
        statut: aff?.statut,
        syndic: syndic?.nom ?? '',
        href: aff ? `/affaires/${aff.id}` : undefined,
      };
    },
    [state],
  );

  function onDropCell(equipeId: string, date: string, e: DragEvent) {
    e.preventDefault();
    setDropHover(null);
    const payload = parseDrag(e);
    if (!payload) return;
    if (payload.kind === 'affaire') {
      assignChantier({ affaireId: payload.affaireId, equipeId, date });
    } else {
      moveAffectation(payload.affectationId, equipeId, date);
    }
  }

  function exportPdf() {
    const html = buildPrintHtml({
      weekStart,
      days,
      equipes: state.equipes.filter((e) => e.actif),
      cells,
      resolve: (it) => {
        const r = resolveCard(it);
        return { title: r.title, sub: r.sub, num: r.num };
      },
      feries: ferieSet,
    });
    const w = window.open('', '_blank', 'noopener,noreferrer,width=1200,height=800');
    if (!w) {
      alert('Autorisez les pop-ups pour exporter le PDF.');
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  const equipes = state.equipes.filter((e) => e.actif);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--navy)] sm:text-2xl">
            Planning chantiers
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Équipes × jours · glisser-déposer depuis le portefeuille · jours fériés grisés.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn-secondary inline-flex items-center gap-1.5 py-2"
            onClick={() => setWeekStart(addDays(weekStart, -7))}
          >
            <ChevronLeft size={16} />
          </button>
          <span className="min-w-[9rem] text-center text-sm font-semibold">
            Semaine du {formatFR(weekStart)}
          </span>
          <button
            type="button"
            className="btn-secondary inline-flex items-center gap-1.5 py-2"
            onClick={() => setWeekStart(addDays(weekStart, 7))}
          >
            <ChevronRight size={16} />
          </button>
          <button
            type="button"
            className="btn-primary inline-flex items-center gap-1.5 py-2"
            onClick={exportPdf}
            title="Export PDF A4 paysage"
          >
            <FileDown size={16} />
            PDF semaine
          </button>
        </div>
      </div>

      {/* Légende types */}
      <div className="flex flex-wrap gap-1.5 text-[10px] font-semibold">
        {(Object.keys(TYPE_LABELS) as AffectationType[]).map((t) => (
          <span
            key={t}
            className="rounded px-2 py-0.5"
            style={{ background: TYPE_STYLES[t].bg, color: TYPE_STYLES[t].fg }}
          >
            {TYPE_LABELS[t]}
          </span>
        ))}
      </div>

      {/* Mobile : chantiers du jour par équipe */}
      <div className="space-y-3 lg:hidden">
        <label className="card block text-sm font-medium">
          Jour
          <input
            type="date"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={mobileDay}
            onChange={(e) => setMobileDay(e.target.value)}
          />
        </label>
        {isJourFerie(state, mobileDay) ? (
          <p className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
            Jour férié — colonne grisée
          </p>
        ) : null}
        {equipes.map((eq) => {
          const items = cells.get(`${eq.id}|${mobileDay}`) ?? [];
          return (
            <section key={eq.id} className="card space-y-2">
              <h2 className="font-bold" style={{ color: eq.color }}>
                {eq.libelle}
              </h2>
              {items.length === 0 ? (
                <p className="text-sm text-slate-400">Aucun chantier</p>
              ) : (
                items.map((it) => {
                  const r = resolveCard(it);
                  const style =
                    it.type === 'CHANTIER'
                      ? { bg: eq.bg, fg: eq.color }
                      : TYPE_STYLES[it.type];
                  return (
                    <div
                      key={it.id}
                      className="rounded-lg px-3 py-2 text-sm"
                      style={{ background: style.bg, color: style.fg }}
                    >
                      {it.type !== 'CHANTIER' ? (
                        <strong>{TYPE_LABELS[it.type]}</strong>
                      ) : (
                        <>
                          <p className="font-bold">{r.num}</p>
                          <p>{r.title}</p>
                          <p className="text-xs opacity-80">{r.sub}</p>
                          {r.href ? (
                            <Link href={r.href} className="text-xs underline">
                              Ouvrir
                            </Link>
                          ) : null}
                        </>
                      )}
                    </div>
                  );
                })
              )}
              <select
                className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
                defaultValue=""
                onChange={(e) => {
                  const v = e.target.value;
                  e.target.value = '';
                  if (!v) return;
                  if (v.startsWith('aff:')) {
                    assignChantier({
                      affaireId: v.slice(4),
                      equipeId: eq.id,
                      date: mobileDay,
                    });
                  } else {
                    createAffectationType({
                      equipeId: eq.id,
                      date: mobileDay,
                      type: v as Exclude<AffectationType, 'CHANTIER'>,
                    });
                  }
                }}
              >
                <option value="">+ Ajouter…</option>
                <optgroup label="Affaire portefeuille">
                  {portefeuille.map(({ a, devis }) => (
                    <option key={a.id} value={`aff:${a.id}`}>
                      {devis.numeroBatappli} ({a.statut})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Type">
                  {(Object.keys(TYPE_LABELS) as AffectationType[])
                    .filter((t) => t !== 'CHANTIER')
                    .map((t) => (
                      <option key={t} value={t}>
                        {TYPE_LABELS[t]}
                      </option>
                    ))}
                </optgroup>
              </select>
            </section>
          );
        })}
      </div>

      {/* Desktop : sidebar + grille */}
      <div className="hidden gap-4 lg:grid lg:grid-cols-[220px_1fr]">
        <aside className="card max-h-[70vh] space-y-2 overflow-y-auto p-3">
          <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Portefeuille (glisser)
          </h2>
          {portefeuille.map(({ a, devis, imm, syndic, conso }) => (
            <div
              key={a.id}
              draggable
              onDragStart={(e) => setDrag(e, { kind: 'affaire', affaireId: a.id })}
              className="cursor-grab rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs active:cursor-grabbing"
              style={{ borderLeft: `4px solid ${STATUT_AFFAIRE_COLOR[a.statut] ?? '#64748b'}` }}
            >
              <p className="font-bold text-[var(--navy)]">{devis.numeroBatappli}</p>
              <p className="text-slate-700">{syndic?.nom}</p>
              <p className="truncate text-slate-500">{adresseCourte(imm)}</p>
              <p className="mt-0.5 text-[10px] text-slate-400">
                {a.statut} · charge {conso}/{a.joursChargeEstimes ?? '—'} j
              </p>
            </div>
          ))}
        </aside>

        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-left">Équipe</th>
                {days.map((d) => {
                  const ferie = ferieSet.has(d);
                  const we = isWeekend(d);
                  return (
                    <th
                      key={d}
                      className={`px-2 py-2 text-center ${
                        ferie ? 'bg-slate-300 text-slate-600' : we ? 'bg-slate-100' : ''
                      }`}
                    >
                      {weekdayShort(d)}
                      <br />
                      {formatFR(d).slice(0, 5)}
                      {ferie ? (
                        <span className="mt-0.5 block text-[9px] font-bold normal-case">
                          Férié
                        </span>
                      ) : null}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {equipes.map((eq) => (
                <tr key={eq.id} className="border-t border-slate-100">
                  <td
                    className="sticky left-0 z-10 bg-white px-3 py-2 font-semibold"
                    style={{ color: eq.color }}
                  >
                    {eq.libelle}
                    <p className="text-[10px] font-normal text-slate-400">
                      {eq.compagnons.length} compagnons
                    </p>
                  </td>
                  {days.map((d) => {
                    const key = `${eq.id}|${d}`;
                    const items = cells.get(key) ?? [];
                    const ferie = ferieSet.has(d);
                    const hovering = dropHover === key;
                    return (
                      <td
                        key={d}
                        className={`relative min-h-[5rem] px-1 py-1 align-top transition ${
                          ferie ? 'bg-slate-200/80' : ''
                        } ${hovering ? 'ring-2 ring-inset ring-[var(--navy)]' : ''}`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          setDropHover(key);
                        }}
                        onDragLeave={() => setDropHover((h) => (h === key ? null : h))}
                        onDrop={(e) => onDropCell(eq.id, d, e)}
                      >
                        {items.map((it) => {
                          const r = resolveCard(it);
                          const style =
                            it.type === 'CHANTIER'
                              ? { bg: eq.bg, fg: eq.color }
                              : TYPE_STYLES[it.type];
                          return (
                            <div
                              key={it.id}
                              draggable
                              onDragStart={(e) =>
                                setDrag(e, { kind: 'affectation', affectationId: it.id })
                              }
                              className="group relative mb-1 cursor-grab rounded-md px-1.5 py-1 text-[11px] leading-tight active:cursor-grabbing"
                              style={{
                                background: style.bg,
                                color: style.fg,
                                borderLeft:
                                  it.type === 'CHANTIER' && r.statut
                                    ? `3px solid ${STATUT_AFFAIRE_COLOR[r.statut]}`
                                    : undefined,
                              }}
                            >
                              {it.type !== 'CHANTIER' ? (
                                <strong>{TYPE_LABELS[it.type]}</strong>
                              ) : (
                                <>
                                  <strong>{r.num}</strong>
                                  <br />
                                  {r.title}
                                  <br />
                                  <span className="opacity-80">{r.sub}</span>
                                </>
                              )}
                              <button
                                type="button"
                                className="absolute right-0.5 top-0.5 hidden rounded bg-white/80 p-0.5 text-red-600 group-hover:block"
                                title="Retirer"
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  removeAffectation(it.id);
                                }}
                              >
                                <Trash2 size={10} />
                              </button>
                            </div>
                          );
                        })}
                        <button
                          type="button"
                          className="mt-0.5 inline-flex items-center gap-0.5 text-[10px] text-slate-400 hover:text-slate-700"
                          onClick={() => setMenuCell({ equipeId: eq.id, date: d })}
                        >
                          <Plus size={10} /> type
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {menuCell ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xs rounded-2xl bg-white p-4 shadow-xl">
            <h3 className="mb-3 font-bold text-[var(--navy)]">Type d&apos;affectation</h3>
            <p className="mb-2 text-xs text-slate-500">
              {formatFR(menuCell.date)}
            </p>
            <div className="grid gap-2">
              {(Object.keys(TYPE_LABELS) as AffectationType[])
                .filter((t) => t !== 'CHANTIER')
                .map((t) => (
                  <button
                    key={t}
                    type="button"
                    className="rounded-lg px-3 py-2 text-left text-sm font-semibold"
                    style={{ background: TYPE_STYLES[t].bg, color: TYPE_STYLES[t].fg }}
                    onClick={() => {
                      createAffectationType({
                        equipeId: menuCell.equipeId,
                        date: menuCell.date,
                        type: t as Exclude<AffectationType, 'CHANTIER'>,
                      });
                      setMenuCell(null);
                    }}
                  >
                    {TYPE_LABELS[t]}
                  </button>
                ))}
            </div>
            <button
              type="button"
              className="mt-3 w-full rounded-lg border py-2 text-sm"
              onClick={() => setMenuCell(null)}
            >
              Annuler
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
