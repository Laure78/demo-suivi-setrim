import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Shell } from '@/components/Shell';
import { ParametresView } from '@/components/ParametresView';
import { ensureBureauUsers } from '@/lib/bureau-users';
import { ensureEntrepriseSettings } from '@/lib/entreprise-settings';
import { isAdministrateur } from '@/lib/acces-labels';
import { prisma } from '@/lib/prisma';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

const ADMIN_TABS = new Set(['utilisateurs', 'externes', 'entreprise', 'abonnement']);

export default async function ParametresPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string; erreur?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (!session.user.id) redirect('/login?erreur=session');

  await ensureBureauUsers();
  await ensureEntrepriseSettings();

  const sp = searchParams ? await searchParams : {};
  const tab = sp.tab ?? 'profil';

  if (ADMIN_TABS.has(tab)) {
    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { acces: true, actif: true },
    });
    if (!me?.actif || !isAdministrateur(me.acces)) {
      redirect('/parametres?tab=profil&erreur=admin');
    }
  }

  return (
    <Shell title="Paramètres">
      {sp.erreur === 'admin' ? (
        <p className="err" style={{ marginBottom: 12 }}>
          Cet onglet est réservé aux administrateurs (Valérie, Denis).
        </p>
      ) : null}
      <Suspense fallback={<p className="hint">Chargement…</p>}>
        <ParametresView />
      </Suspense>
    </Shell>
  );
}
