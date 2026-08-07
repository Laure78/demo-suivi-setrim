import Image from 'next/image';

export function SetrimFooter() {
  return (
    <footer className="setrim-footer">
      <div className="setrim-footer-inner">
        <div className="setrim-footer-brand">
          <Image
            src="/logo-setrim.png"
            alt="SETRIM étanchéité"
            width={140}
            height={40}
            className="setrim-footer-logo"
          />
          <p className="setrim-footer-tag">Étanchéité · Aubervilliers</p>
        </div>

        <div className="setrim-footer-cols">
          <div className="setrim-footer-col">
            <span className="eyebrow">Adresse</span>
            <p>
              30, rue Bisson
              <br />
              93300 Aubervilliers
            </p>
          </div>
          <div className="setrim-footer-col">
            <span className="eyebrow">Téléphone</span>
            <p>
              <a href="tel:+33148112424">Tél. 01 48 11 24 24</a>
              <br />
              Fax 01 48 11 24 28
            </p>
          </div>
          <div className="setrim-footer-col">
            <span className="eyebrow">Contact</span>
            <p>
              <a href="mailto:contact@setrim.fr">contact@setrim.fr</a>
              <br />
              <a
                href="https://www.setrim.fr"
                target="_blank"
                rel="noopener noreferrer"
              >
                www.setrim.fr
              </a>
            </p>
          </div>
        </div>
      </div>
      <div className="setrim-footer-legal">
        <span>SETRIM — Suivi d&apos;affaires</span>
        <span className="mono">© {new Date().getFullYear()}</span>
      </div>
    </footer>
  );
}
