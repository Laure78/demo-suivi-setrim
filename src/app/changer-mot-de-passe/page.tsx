import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Shell } from '@/components/Shell';
import { ChangerMotDePasseView } from '@/components/ChangerMotDePasseView';

export const dynamic = 'force-dynamic';

export default async function ChangerMotDePassePage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <Shell title="Mot de passe">
      <ChangerMotDePasseView />
    </Shell>
  );
}
