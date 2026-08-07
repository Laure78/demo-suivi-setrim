import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { Shell } from '@/components/Shell';
import { TodayWall } from '@/components/TodayWall';
import { ROLE_LABEL } from '@/lib/format';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AujourdhuiPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const taches = await prisma.tache.findMany({
    where: { responsableId: session.user.id },
    include: { affaire: true },
    orderBy: [{ fait: 'asc' }, { dateEcheance: 'asc' }],
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const slots = await prisma.planningSlot.findMany({
    where: {
      date: { gte: today, lt: tomorrow },
      type: { in: ['chantier', 'ce'] },
    },
    include: { affaire: true, equipe: true },
  });

  const chantiers =
    slots.length > 0
      ? slots.map((s) => ({
          titre: s.affaire?.client ?? (s.label?.split('·')[0]?.trim() || 'Chantier'),
          detail:
            s.label ??
            `${s.affaire?.adresse ?? ''} — ${s.equipe.nom}`,
          ce: s.type === 'ce',
        }))
      : [
          { titre: 'SIMMONET', detail: '66 Bd Jean Jaurès, Clichy — équipes 1 et 2' },
          { titre: 'SAB IMMOBILIER', detail: '4 Rue du Dr Paquelin, Paris 20 — équipe 2' },
          {
            titre: "CPAB — contrat d'entretien",
            detail: '13/15 Rue Benjamin Franklin, Courbevoie',
            ce: true,
          },
        ];

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
        }))}
      />
    </Shell>
  );
}
