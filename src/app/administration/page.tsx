import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/** Ancienne page → Paramètres / Utilisateurs */
export default async function AdministrationRedirect() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  redirect('/parametres?tab=utilisateurs');
}
