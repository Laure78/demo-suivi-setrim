import type { Metadata } from 'next';
import { SessionProvider } from '@/components/SessionProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'SETRIM — Suivi d\'affaires',
  description: 'Aujourd\'hui, affaires, planning, contrats d\'entretien, facturation.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
