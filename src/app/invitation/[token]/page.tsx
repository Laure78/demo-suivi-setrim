import { InvitationAccept } from '@/components/InvitationAccept';

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <main className="invite-page">
      <InvitationAccept token={token} />
    </main>
  );
}
