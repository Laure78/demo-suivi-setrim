import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/** Ancienne page → Paramètres / Mon profil */
export default async function ProfilRedirect() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  redirect('/parametres?tab=profil');
}
