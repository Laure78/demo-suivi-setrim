'use client';

import type { JournalEntry } from '@/lib/types';
import { formatShortDateTime } from '@/lib/dates';

const KIND_LABEL: Record<JournalEntry['kind'], string> = {
  check: 'Coche',
  uncheck: 'Décoche',
  add_action: 'Ajout',
  photo: 'Photo',
  message_important: 'Alerte',
};

const KIND_COLOR: Record<JournalEntry['kind'], string> = {
  check: 'bg-emerald-100 text-emerald-800',
  uncheck: 'bg-slate-200 text-slate-700',
  add_action: 'bg-blue-100 text-blue-800',
  photo: 'bg-amber-100 text-amber-900',
  message_important: 'bg-red-100 text-red-800',
};

export function ChantierJournal({ entries }: { entries: JournalEntry[] }) {
  if (!entries.length) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
        Aucun événement pour l’instant. Les coches, photos et alertes apparaîtront ici.
      </p>
    );
  }

  return (
    <ol className="relative space-y-0 border-l-2 border-slate-200 pl-5">
      {entries.map((e) => (
        <li key={e.id} className="relative pb-5">
          <span className="absolute -left-[1.4rem] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-[var(--navy)]" />
          <div className="card !p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${KIND_COLOR[e.kind]}`}
              >
                {KIND_LABEL[e.kind]}
              </span>
              <span className="text-xs font-medium text-slate-500">
                {formatShortDateTime(e.createdAt)} · {e.userName}
              </span>
            </div>
            <p className="mt-1.5 text-sm text-slate-800">{e.text}</p>
            {e.photoDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={e.photoDataUrl}
                alt=""
                className="mt-2 h-20 w-20 rounded-lg object-cover"
              />
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
