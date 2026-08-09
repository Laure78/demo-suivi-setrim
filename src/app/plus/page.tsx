import { auth } from '@/auth';
import { Shell } from '@/components/Shell';
import { PlusView } from '@/components/PlusView';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function PlusPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <Shell title="Plus">
      <PlusView />
    </Shell>
  );
}
