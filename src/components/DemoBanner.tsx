/** Bandeau démo + mentions légales BeWork — remplace le filigrane plein écran. */
export function DemoBanner() {
  return (
    <div className="border-b border-amber-300/80 bg-amber-50 text-amber-950">
      <div className="mx-auto flex max-w-7xl flex-col gap-0.5 px-4 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <p className="text-[12px] font-semibold sm:text-[13px]">
          Logiciel de démo créé par{' '}
          <span className="font-extrabold tracking-wide">BEWORK</span>
        </p>
        <p className="text-[10px] leading-snug text-amber-900/80 sm:max-w-xl sm:text-right sm:text-[11px]">
          © {new Date().getFullYear()} BeWork — Tous droits réservés. Ce logiciel et ses
          contenus sont protégés par le droit d’auteur. Toute reproduction, représentation,
          adaptation ou utilisation non autorisée est interdite.
        </p>
      </div>
    </div>
  );
}
