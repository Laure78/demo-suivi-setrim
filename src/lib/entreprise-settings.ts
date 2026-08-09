import {
  FactureAboStatut,
  ModeReglement,
  PeriodiciteAbo,
} from '@prisma/client';
import { prisma } from '@/lib/prisma';

const ENTREPRISE_ID = 'setrim';

/** Garantit l’entreprise SETRIM, l’abonnement démo et quelques factures. */
export async function ensureEntrepriseSettings() {
  const entreprise = await prisma.entreprise.upsert({
    where: { id: ENTREPRISE_ID },
    create: {
      id: ENTREPRISE_ID,
      raisonSociale: 'SETRIM Étanchéité',
      adresse: '12 Rue des Toitures, 92100 Boulogne-Billancourt',
      siret: '812 456 789 00015',
      tvaIntra: 'FR42812456789',
      facturationEmail: 'compta@setrim.fr',
      referenceCommande: '',
      modeReglement: ModeReglement.prelevement,
      periodicite: PeriodiciteAbo.mensuelle,
      supportEmail: 'support@bework.app',
      supportTelephone: '01 89 71 00 20',
      supportHoraires: 'Lun–Ven 9h–18h',
    },
    update: {},
  });

  const now = new Date();
  const debut = new Date(Date.UTC(2026, 0, 1, 12, 0, 0));
  const echeance = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 12, 0, 0));

  await prisma.abonnement.upsert({
    where: { entrepriseId: ENTREPRISE_ID },
    create: {
      entrepriseId: ENTREPRISE_ID,
      formule: 'Bureau 5',
      usersInclus: 5,
      fonctionnalites:
        'Messagerie, planning, portefeuille, contrats d’entretien, facturation chantier, tutoriel',
      dateDebut: debut,
      prochaineEcheance: echeance,
      renouvellementAuto: true,
    },
    update: {},
  });

  const count = await prisma.facturePlateforme.count({
    where: { entrepriseId: ENTREPRISE_ID },
  });
  if (count === 0) {
    const rows = [
      {
        numero: 'BW-2026-06',
        dateEmission: new Date(Date.UTC(2026, 5, 1, 12, 0, 0)),
        periodeDebut: new Date(Date.UTC(2026, 5, 1, 12, 0, 0)),
        periodeFin: new Date(Date.UTC(2026, 5, 30, 12, 0, 0)),
        montantHt: 89,
        montantTtc: 106.8,
        statut: FactureAboStatut.payee,
      },
      {
        numero: 'BW-2026-07',
        dateEmission: new Date(Date.UTC(2026, 6, 1, 12, 0, 0)),
        periodeDebut: new Date(Date.UTC(2026, 6, 1, 12, 0, 0)),
        periodeFin: new Date(Date.UTC(2026, 6, 31, 12, 0, 0)),
        montantHt: 89,
        montantTtc: 106.8,
        statut: FactureAboStatut.payee,
      },
      {
        numero: 'BW-2026-08',
        dateEmission: new Date(Date.UTC(2026, 7, 1, 12, 0, 0)),
        periodeDebut: new Date(Date.UTC(2026, 7, 1, 12, 0, 0)),
        periodeFin: new Date(Date.UTC(2026, 7, 31, 12, 0, 0)),
        montantHt: 89,
        montantTtc: 106.8,
        statut: FactureAboStatut.en_attente,
      },
    ];
    for (const f of rows) {
      await prisma.facturePlateforme.create({
        data: { ...f, entrepriseId: ENTREPRISE_ID },
      });
    }
  }

  return entreprise;
}

export async function getEntrepriseFull() {
  await ensureEntrepriseSettings();
  return prisma.entreprise.findUniqueOrThrow({
    where: { id: ENTREPRISE_ID },
    include: {
      abonnement: true,
      factures: { orderBy: { dateEmission: 'desc' } },
    },
  });
}

/** Alertes abo / facture pour le bandeau admin. */
export async function getAdminBillingAlerts() {
  const data = await getEntrepriseFull();
  const abo = data.abonnement;
  const alerts: { type: 'echeance' | 'facture'; message: string }[] = [];

  if (abo) {
    const days =
      (abo.prochaineEcheance.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (days <= 30) {
      const d = abo.prochaineEcheance.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      alerts.push({
        type: 'echeance',
        message:
          days < 0
            ? `Abonnement : échéance dépassée (${d}).`
            : `Abonnement : prochaine échéance le ${d} (moins de 30 jours).`,
      });
    }
  }

  const pending = data.factures.filter((f) => f.statut === FactureAboStatut.en_attente);
  if (pending.length) {
    alerts.push({
      type: 'facture',
      message:
        pending.length === 1
          ? `Facture ${pending[0].numero} en attente de règlement.`
          : `${pending.length} factures plateforme en attente de règlement.`,
    });
  }

  return alerts;
}

export function displayNom(u: {
  nom: string;
  prenom?: string | null;
  nomFamille?: string | null;
}): string {
  const p = (u.prenom ?? '').trim();
  const f = (u.nomFamille ?? '').trim();
  if (p || f) return [p, f].filter(Boolean).join(' ');
  return u.nom;
}
