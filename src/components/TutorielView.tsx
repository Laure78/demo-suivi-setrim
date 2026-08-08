import Link from 'next/link';
import {
  TUTORIEL_INTRO,
  TUTORIEL_MAJ,
  TUTORIEL_SECTIONS,
} from '@/lib/tutoriel';
import { AideTip } from '@/components/AideTip';

export function TutorielView() {
  return (
    <div className="tutoriel">
      <header className="tutoriel-hero">
        <span className="eyebrow">Tutoriel</span>
        <h1>{TUTORIEL_INTRO.titre}</h1>
        <p>{TUTORIEL_INTRO.texte}</p>
        <p className="hint">
          Dernière mise à jour du contenu : {TUTORIEL_MAJ}. Sur les écrans, survolez les pastilles{' '}
          <AideTip text="Survolez chaque ? bleu pour lire la consigne locale." placement="bottom" />{' '}
          pour l’aide au fil de l’eau.
        </p>
      </header>

      <nav className="tutoriel-sommaire" aria-label="Sommaire du tutoriel">
        <span className="eyebrow">Sommaire</span>
        <ul>
          {TUTORIEL_SECTIONS.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`}>{s.titre}</a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="tutoriel-sections">
        {TUTORIEL_SECTIONS.map((s) => (
          <section key={s.id} id={s.id} className="tutoriel-section">
            <h2>{s.titre}</h2>
            <p className="tutoriel-resume">{s.resume}</p>
            <ul>
              {s.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            {s.lien ? (
              <Link href={s.lien.href} className="btn-note tutoriel-lien">
                {s.lien.label} →
              </Link>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  );
}
