import Image from 'next/image';

/** Bandeau démo + mentions légales BeWork — remplace le filigrane plein écran. */
export function DemoBanner() {
  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <Image
            src="/logo-bework-banner.png"
            alt="BeWork — Assistants travaux augmentés par l'IA"
            width={200}
            height={52}
            className="h-9 w-auto sm:h-10"
            priority
          />
          <p className="text-[12px] font-semibold text-slate-700 sm:text-[13px]">
            Logiciel de démo créé par{' '}
            <span className="font-extrabold tracking-wide text-[#0077c8]">BeWork</span>
          </p>
        </div>
        <p className="text-[10px] leading-snug text-slate-500 sm:max-w-xl sm:text-right sm:text-[11px]">
          © {new Date().getFullYear()} BeWork — Tous droits réservés. Ce logiciel et ses
          contenus sont protégés par le droit d’auteur. Toute reproduction, représentation,
          adaptation ou utilisation non autorisée est interdite.
        </p>
      </div>
    </div>
  );
}
