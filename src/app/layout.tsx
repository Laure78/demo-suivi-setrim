import type { Metadata } from 'next';
import { AppProvider } from '@/context/AppStateContext';
import { AppShell } from '@/components/AppShell';
import './globals.css';

export const metadata: Metadata = {
  title: 'SETRIM — Suivi chantier',
  description:
    'Outil interne SETRIM étanchéité : check-lists chantier, alertes, planning et contrats d’entretien.',
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
