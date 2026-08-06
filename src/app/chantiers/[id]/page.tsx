import { redirect } from 'next/navigation';

export default async function LegacyChantierRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await params;
  redirect('/portefeuille');
}
