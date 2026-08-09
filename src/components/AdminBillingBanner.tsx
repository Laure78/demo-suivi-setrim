import { auth } from '@/auth';
import { isAdministrateur } from '@/lib/acces-labels';
import { getAdminBillingAlerts } from '@/lib/entreprise-settings';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

/** Bandeau visible des seuls administrateurs (échéance &lt; 30 j ou facture en attente). */
export async function AdminBillingBanner() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { acces: true, actif: true },
  });
  if (!me?.actif || !isAdministrateur(me.acces)) return null;

  const alerts = await getAdminBillingAlerts();
  if (!alerts.length) return null;

  return (
    <div className="admin-billing-banner" role="status">
      <div className="admin-billing-banner-inner">
        {alerts.map((a) => (
          <p key={a.type + a.message}>{a.message}</p>
        ))}
        <Link href="/parametres?tab=abonnement">Voir l’abonnement</Link>
      </div>
    </div>
  );
}
