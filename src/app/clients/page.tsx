import { Shell } from '@/components/Shell';
import { ClientsView } from '@/components/ClientsView';
import { prisma } from '@/lib/prisma';
import { assurerFichesClients } from '@/lib/clients';

export const dynamic = 'force-dynamic';

export default async function ClientsPage() {
  await assurerFichesClients();

  const clients = await prisma.client.findMany({
    orderBy: { nom: 'asc' },
    include: {
      affaires: {
        select: {
          id: true,
          numeroDevis: true,
          adresse: true,
          statut: true,
          type: true,
          montantHt: true,
        },
        orderBy: { dateDevis: 'desc' },
      },
    },
  });

  return (
    <Shell title="Clients">
      <ClientsView
        clients={clients.map((c) => ({
          id: c.id,
          nom: c.nom,
          contact: c.contact,
          telephone: c.telephone,
          email: c.email,
          adresse: c.adresse,
          note: c.note,
          nbChantiers: c.affaires.length,
          affaires: c.affaires.map((a) => ({
            id: a.id,
            numeroDevis: a.numeroDevis,
            adresse: a.adresse,
            statut: a.statut,
            type: a.type,
            montantHt: Number(a.montantHt),
          })),
        }))}
      />
    </Shell>
  );
}
