import Image from 'next/image';
import { Globe, Mail, MapPin, Phone, Printer } from 'lucide-react';

export function SetrimFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:grid-cols-[auto_1fr] sm:items-start sm:gap-10">
        <div className="flex flex-col gap-3">
          <Image
            src="/logo-setrim.png"
            alt="SETRIM étanchéité"
            width={160}
            height={43}
            className="h-9 w-auto"
          />
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Logiciel de démonstration
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <address className="not-italic text-sm leading-relaxed text-slate-600">
            <p className="mb-2 flex items-start gap-2 font-semibold text-[var(--navy)]">
              <MapPin size={16} className="mt-0.5 shrink-0" aria-hidden />
              <span>
                30, rue Bisson
                <br />
                93300 Aubervilliers
              </span>
            </p>
            <p className="flex items-center gap-2">
              <Phone size={16} className="shrink-0 text-[var(--navy)]" aria-hidden />
              <a href="tel:+33148112424" className="hover:text-[var(--navy)] hover:underline">
                Tél. 01 48 11 24 24
              </a>
            </p>
            <p className="mt-1 flex items-center gap-2">
              <Printer size={16} className="shrink-0 text-[var(--navy)]" aria-hidden />
              <span>Fax 01 48 11 24 28</span>
            </p>
          </address>

          <div className="text-sm leading-relaxed text-slate-600">
            <p className="flex items-center gap-2">
              <Mail size={16} className="shrink-0 text-[var(--navy)]" aria-hidden />
              <a
                href="mailto:contact@setrim.fr"
                className="hover:text-[var(--navy)] hover:underline"
              >
                contact@setrim.fr
              </a>
            </p>
            <p className="mt-1 flex items-center gap-2">
              <Globe size={16} className="shrink-0 text-[var(--navy)]" aria-hidden />
              <a
                href="http://www.setrim.fr/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[var(--navy)] hover:underline"
              >
                www.setrim.fr
              </a>
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs text-slate-500">
          <span>© {new Date().getFullYear()} SETRIM étanchéité</span>
          <span>Outil interne — suivi de chantier</span>
        </div>
      </div>
    </footer>
  );
}
