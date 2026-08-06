import type { Metadata } from 'next';
import { AppProvider } from '@/context/AppStateContext';
import { AppShell } from '@/components/AppShell';
import './globals.css';

export const metadata: Metadata = {
  title: 'SETRIM — Plateforme interne',
  description:
    'Plateforme unique SETRIM : alertes, portefeuille, planning, CE, check-lists, factures, commandes, messagerie.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">
        <AppProvider>
          <AppShell>{children}</AppShell>
        </AppProvider>
      </body>
    </html>
  );
}
