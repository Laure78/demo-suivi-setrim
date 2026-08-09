import { Suspense } from 'react';
import { LoginForm } from '@/components/LoginForm';
import { ensureBureauUsers } from '@/lib/bureau-users';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  await ensureBureauUsers();

  return (
    <Suspense fallback={<div className="login-wrap">Chargement…</div>}>
      <LoginForm />
    </Suspense>
  );
}
