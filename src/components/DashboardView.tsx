'use client';

import Link from 'next/link';
import { eur0 } from '@/lib/format';
import { AIDES } from '@/lib/aides';
import { AideLabel } from '@/components/AideTip';

export type DashKpi = {
  tachesOuvertes: number;
  tachesRetard: number;
  chantiersJour: number;
  affairesCommande: number;
  affairesProgramme: number;
  affairesEncours: number;
  resteFacturerHt: number;
  aFacturerCount: number;
  contratsCount: number;
  messagesRecents: number;
};

export type DashLien = {
  href: string;
  label: string;
  detail: string;
};

export function DashboardView({
  userName,
  kpis,
  liens,
  alertes,
}: {
  userName: string;
  kpis: DashKpi;
  liens: DashLien[];
  alertes: string[];
}) {
  return (
    <div className="dashboard">
      <header className="dashboard-hero">
        <AideLabel aide={AIDES.accueil}>
          <span className="eyebrow">Accueil</span>
        </AideLabel>
        <h1>Tableau de bord</h1>
        <p>
          Bonjour {userName}. Vue d&apos;ensemble SETRIM — cliquez une carte pour aller à
          l&apos;écran concerné.
        </p>
      </header>

      {alertes.length > 0 ? (
        <ul className="dashboard-alertes" aria-label="Points d’attention">
          {alertes.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      ) : null}

      <div className="fact-grid dashboard-kpis">
        <Link href="/aujourdhui" className={`card stat${kpis.tachesRetard ? ' alarm' : ''}`}>
          <span className="eyebrow">Mes tâches</span>
          <span className="v">{kpis.tachesOuvertes}</span>
          <span className="hint">
            {kpis.tachesRetard
              ? `${kpis.tachesRetard} en retard`
              : 'À traiter aujourd’hui'}
          </span>
        </Link>
        <Link href="/aujourdhui" className="card stat">
          <span className="eyebrow">Chantiers du jour</span>
          <span className="v">{kpis.chantiersJour}</span>
          <span className="hint">Équipes terrain planifiées</span>
        </Link>
        <Link href="/portefeuille" className="card stat">
          <span className="eyebrow">Affaires actives</span>
          <span className="v">
            {kpis.affairesCommande + kpis.affairesProgramme + kpis.affairesEncours}
          </span>
          <span className="hint">
            {kpis.affairesCommande} commande · {kpis.affairesProgramme} programmé ·{' '}
            {kpis.affairesEncours} en cours
          </span>
        </Link>
        <Link
          href="/facturation"
          className={`card stat${kpis.aFacturerCount ? ' alarm' : ''}`}
        >
          <span className="eyebrow">Reste à facturer</span>
          <span className="v">{eur0(kpis.resteFacturerHt)}</span>
          <span className="hint">
            {kpis.aFacturerCount} affaire{kpis.aFacturerCount > 1 ? 's' : ''} sans solde
          </span>
        </Link>
        <Link href="/contrats" className="card stat">
          <span className="eyebrow">Contrats d’entretien</span>
          <span className="v">{kpis.contratsCount}</span>
          <span className="hint">Sur l’exercice en cours</span>
        </Link>
        <Link href="/messages" className="card stat">
          <span className="eyebrow">Messagerie</span>
          <span className="v">{kpis.messagesRecents}</span>
          <span className="hint">Messages récents (7 jours)</span>
        </Link>
      </div>

      <div className="sec-head">
        <span className="eyebrow">Accès rapide</span>
      </div>
      <div className="dashboard-liens">
        {liens.map((l) => (
          <Link key={l.href} href={l.href} className="card dashboard-lien">
            <strong>{l.label}</strong>
            <span>{l.detail}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
