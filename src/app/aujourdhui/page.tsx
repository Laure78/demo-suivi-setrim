import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { Shell } from '@/components/Shell';
import { TodayWall } from '@/components/TodayWall';
import { ROLE_LABEL } from '@/lib/format';
import { redirect } from 'next/navigation';
import { assurerLiensGlobaux } from '@/lib/affaire-lifecycle';

export const dynamic = 'force-dynamic';

export default async function AujourdhuiPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  await assurerLiensGlobaux();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const taches = await prisma.tache.findMany({
    where: {
      responsableId: session.user.id,
      OR: [
        { fait: false },
        { fait: true, faitAt: { gte: today } },
      ],
    },
    include: { affaire: true },
    orderBy: [{ fait: 'asc' }, { niveau: 'desc' }, { dateEcheance: 'asc' }],
  });

  const slots = await prisma.planningSlot.findMany({
    where: {
      date: { gte: today, lt: tomorrow },
      type: { in: ['chantier', 'ce'] },
    },
    include: { affaire: true, equipe: true },
  });

  let chantiers =
    slots.length > 0
      ? slots.map((s) => {
          const titre =
            s.affaire?.client ?? (s.label?.split('·')[0]?.trim() || 'Chantier');
          const detail =
            s.label ??
            (s.affaire
              ? `${s.affaire.client} · ${s.affaire.adresse}`
              : `${titre} — ${s.equipe.nom}`);
          return {
            id: s.id,
            titre,
            detail,
            ce: s.type === 'ce',
            affaireId: s.affaireId ?? s.affaire?.id ?? null,
            numeroDevis: s.affaire?.numeroDevis ?? null,
          };
        })
      : [];

  // Fallback démo : retrouver les affaires réelles pour le lien portefeuille
  if (chantiers.length === 0) {
    const fallbacks = [
      { client: 'SAB IMMOBILIER', ce: false },
      { client: 'SIMMONET', ce: false },
      { client: 'CPAB', ce: true },
    ];
    const found = await Promise.all(
      fallbacks.map(async (f) => {
        const a = await prisma.affaire.findFirst({
          where: { client: { contains: f.client, mode: 'insensitive' } },
          orderBy: { dateDevis: 'desc' },
        });
        return {
          id: a?.id ?? f.client,
          titre: a?.client ?? f.client,
          detail: a
            ? `${a.client} · ${a.adresse}`
            : f.ce
              ? "Contrat d'entretien"
              : 'Voir le portefeuille',
          ce: f.ce,
          affaireId: a?.id ?? null,
          numeroDevis: a?.numeroDevis ?? null,
        };
      }),
    );
    chantiers = found;
  }

  return (
    <Shell title="Aujourd'hui">
      <TodayWall
        userName={session.user.name ?? ''}
        userRole={ROLE_LABEL[session.user.role] ?? session.user.role}
        chantiers={chantiers}
        taches={taches.map((t) => ({
          id: t.id,
          titre: t.titre,
          niveau: t.niveau,
          dateEcheance: t.dateEcheance.toISOString(),
          fait: t.fait,
          libelle:
            t.libelleAffaire ??
            (t.affaire
              ? `${t.affaire.client} · ${t.affaire.adresse.split(',')[0]}`
              : 'Sans affaire'),
          affaireId: t.affaireId ?? t.affaire?.id ?? null,
        }))}
      />
    </Shell>
  );
}
