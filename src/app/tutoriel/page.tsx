import { auth } from '@/auth';
import { Shell } from '@/components/Shell';
import { TutorielView } from '@/components/TutorielView';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function TutorielPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <Shell title="Tutoriel">
      <TutorielView />
    </Shell>
  );
}
