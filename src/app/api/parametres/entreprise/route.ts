import { ModeReglement, PeriodiciteAbo } from '@prisma/client';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/acces';
import { getEntrepriseFull, ensureEntrepriseSettings } from '@/lib/entreprise-settings';
import { prisma } from '@/lib/prisma';
import {
  FACTURE_ABO_STATUT_LABEL,
  MODE_REGLEMENT_LABEL,
  PERIODICITE_LABEL,
} from '@/lib/parametres-labels';
import { formatDateFr, eur } from '@/lib/format';

export async function GET() {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const data = await getEntrepriseFull();
  const abo = data.abonnement;

  return NextResponse.json({
    entreprise: {
      id: data.id,
      raisonSociale: data.raisonSociale,
      adresse: data.adresse,
      siret: data.siret,
      tvaIntra: data.tvaIntra,
      logoUrl: data.logoUrl,
      facturationAdresse: data.facturationAdresse,
      facturationEmail: data.facturationEmail,
      referenceCommande: data.referenceCommande,
      modeReglement: data.modeReglement,
      modeReglementLabel: MODE_REGLEMENT_LABEL[data.modeReglement],
      periodicite: data.periodicite,
      periodiciteLabel: PERIODICITE_LABEL[data.periodicite],
      supportEmail: data.supportEmail,
      supportTelephone: data.supportTelephone,
      supportHoraires: data.supportHoraires,
    },
    abonnement: abo
      ? {
          formule: abo.formule,
          usersInclus: abo.usersInclus,
          fonctionnalites: abo.fonctionnalites,
          dateDebut: abo.dateDebut.toISOString(),
          dateDebutLabel: formatDateFr(abo.dateDebut),
          prochaineEcheance: abo.prochaineEcheance.toISOString(),
          prochaineEcheanceLabel: formatDateFr(abo.prochaineEcheance),
          renouvellementAuto: abo.renouvellementAuto,
        }
      : null,
    factures: data.factures.map((f) => ({
      id: f.id,
      numero: f.numero,
      dateEmission: f.dateEmission.toISOString(),
      dateEmissionLabel: formatDateFr(f.dateEmission),
      periode:
        `${formatDateFr(f.periodeDebut)} – ${formatDateFr(f.periodeFin)}`,
      montantHt: Number(f.montantHt),
      montantTtc: Number(f.montantTtc),
      montantHtLabel: eur(Number(f.montantHt)),
      montantTtcLabel: eur(Number(f.montantTtc)),
      statut: f.statut,
      statutLabel: FACTURE_ABO_STATUT_LABEL[f.statut] ?? f.statut,
      pdfUrl: f.pdfUrl ?? `/api/parametres/factures/${f.id}/pdf`,
    })),
  });
}

export async function PATCH(req: Request) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  await ensureEntrepriseSettings();
  const body = await req.json();
  const section = String(body.section ?? 'entreprise');

  if (section === 'abonnement') {
    const renouvellementAuto = Boolean(body.renouvellementAuto);
    await prisma.abonnement.update({
      where: { entrepriseId: 'setrim' },
      data: { renouvellementAuto },
    });
    return NextResponse.json({ ok: true });
  }

  const modeReglement = (Object.values(ModeReglement) as string[]).includes(
    String(body.modeReglement),
  )
    ? (body.modeReglement as ModeReglement)
    : undefined;
  const periodicite = (Object.values(PeriodiciteAbo) as string[]).includes(
    String(body.periodicite),
  )
    ? (body.periodicite as PeriodiciteAbo)
    : undefined;

  await prisma.entreprise.update({
    where: { id: 'setrim' },
    data: {
      raisonSociale: String(body.raisonSociale ?? '').trim() || undefined,
      adresse: String(body.adresse ?? '').trim(),
      siret: String(body.siret ?? '').trim(),
      tvaIntra: String(body.tvaIntra ?? '').trim(),
      logoUrl:
        body.logoUrl === null
          ? null
          : body.logoUrl
            ? String(body.logoUrl)
            : undefined,
      facturationAdresse: String(body.facturationAdresse ?? '').trim(),
      facturationEmail: String(body.facturationEmail ?? '').trim(),
      referenceCommande: String(body.referenceCommande ?? '').trim(),
      ...(modeReglement ? { modeReglement } : {}),
      ...(periodicite ? { periodicite } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
