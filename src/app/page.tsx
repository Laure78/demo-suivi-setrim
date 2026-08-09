import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { Shell } from '@/components/Shell';
import { DashboardView } from '@/components/DashboardView';
import { daysLate } from '@/lib/format';
import { redirect } from 'next/navigation';
import { AffaireStatut } from '@prisma/client';
import { assurerLiensGlobaux } from '@/lib/affaire-lifecycle';

export const dynamic = 'force-dynamic';

export default async function AccueilPage({
  searchParams,
}: {
  searchParams?: Promise<{ erreur?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const sp = searchParams ? await searchParams : {};
  const erreurAdmin = sp.erreur === 'admin';

  await assurerLiensGlobaux();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [taches, slotsJour, affaires, contratsCount, messagesRecents] = await Promise.all([
    prisma.tache.findMany({
      where: { responsableId: session.user.id, fait: false },
      select: { dateEcheance: true },
    }),
    prisma.planningSlot.count({
      where: {
        date: { gte: today, lt: tomorrow },
        type: { in: ['chantier', 'ce'] },
      },
    }),
    prisma.affaire.findMany({
      include: { factures: { select: { type: true } } },
    }),
    prisma.contratEntretien.count(),
    prisma.message.count({
      where: { createdAt: { gte: weekAgo }, systeme: false },
    }),
  ]);

  const tachesRetard = taches.filter((t) => daysLate(t.dateEcheance) > 0).length;

  const affairesCommande = affaires.filter((a) => a.statut === AffaireStatut.commande).length;
  const affairesProgramme = affaires.filter((a) => a.statut === AffaireStatut.programme).length;
  const affairesEncours = affaires.filter((a) => a.statut === AffaireStatut.encours).length;

  const aFacturer = affaires.filter(
    (a) =>
      !a.factures.some((f) => f.type === 'solde') &&
      (a.statut === AffaireStatut.solde ||
        a.statut === AffaireStatut.encours ||
        !!a.dateFin),
  );
  const resteFacturerHt = aFacturer.reduce((s, a) => s + Number(a.montantHt), 0);

  const alertes: string[] = [];
  if (tachesRetard > 0) {
    alertes.push(
      `${tachesRetard} tâche${tachesRetard > 1 ? 's' : ''} en retard — à traiter dans Aujourd’hui.`,
    );
  }
  if (aFacturer.length > 0) {
    alertes.push(
      `${aFacturer.length} affaire${aFacturer.length > 1 ? 's' : ''} à facturer (solde manquant).`,
    );
  }
  if (slotsJour === 0) {
    alertes.push('Aucun chantier planifié aujourd’hui sur le planning.');
  }

  return (
    <Shell title="Accueil">
      {erreurAdmin ? (
        <p
          className="err"
          style={{
            marginBottom: 14,
            padding: '10px 12px',
            background: 'rgba(196,70,40,.08)',
            borderLeft: '3px solid var(--flamme)',
          }}
        >
          L&apos;administration est réservée à Valérie et Denis. Vous avez été renvoyé à
          l&apos;accueil.
        </p>
      ) : null}
      <DashboardView
        userName={session.user.name ?? 'SETRIM'}
        kpis={{
          tachesOuvertes: taches.length,
          tachesRetard,
          chantiersJour: slotsJour,
          affairesCommande,
          affairesProgramme,
          affairesEncours,
          resteFacturerHt,
          aFacturerCount: aFacturer.length,
          contratsCount,
          messagesRecents,
        }}
        alertes={alertes}
        liens={[
          {
            href: '/aujourdhui',
            label: 'Aujourd’hui',
            detail: 'Tâches et chantiers du jour',
          },
          {
            href: '/portefeuille',
            label: 'Portefeuille',
            detail: 'Affaires et fiches devis',
          },
          {
            href: '/clients',
            label: 'Clients',
            detail: 'Fiches syndics / clients',
          },
          {
            href: '/planning',
            label: 'Planning',
            detail: 'Agenda des équipes chantier',
          },
          {
            href: '/contrats',
            label: 'Contrats d’entretien',
            detail: 'Exercice et passages',
          },
          {
            href: '/facturation',
            label: 'Facturation',
            detail: 'Acomptes, soldes, impayés',
          },
          {
            href: '/messages',
            label: 'Messagerie',
            detail: 'Équipe et conversations',
          },
          {
            href: '/tutoriel',
            label: 'Tutoriel',
            detail: 'Fonctionnement de la plateforme',
          },
        ]}
      />
    </Shell>
  );
}
