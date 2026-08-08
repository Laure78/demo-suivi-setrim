import Image from 'next/image';
import Link from 'next/link';

/** Pied de page minimal — sans adresse ni téléphone. */
export function SetrimFooter() {
  return (
    <footer className="setrim-footer">
      <div className="setrim-footer-mini">
        <Link href="/" className="brand-link" title="Accueil — tableau de bord" aria-label="Accueil SETRIM">
          <Image
            src="/logo-setrim.png"
            alt="SETRIM"
            width={100}
            height={28}
            className="setrim-footer-logo"
          />
        </Link>
        <span className="setrim-footer-copy">
          SETRIM — Suivi d&apos;affaires · © {new Date().getFullYear()}
        </span>
        <a
          href="https://www.setrim.fr"
          target="_blank"
          rel="noopener noreferrer"
          className="setrim-footer-web"
        >
          setrim.fr
        </a>
      </div>
    </footer>
  );
}
