import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { AdminBillingBanner } from '@/components/AdminBillingBanner';
import { daysLate } from '@/lib/format';

export async function Shell({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const session = await auth();
  const userId = session?.user?.id;

  let lateCount = 0;
  if (userId) {
    const taches = await prisma.tache.findMany({
      where: { responsableId: userId, fait: false },
      select: { dateEcheance: true },
    });
    lateCount = taches.filter((t) => daysLate(t.dateEcheance) > 0).length;
  }

  return (
    <AppShell lateCount={lateCount} unreadCount={0} title={title}>
      <AdminBillingBanner />
      {children}
    </AppShell>
  );
}
