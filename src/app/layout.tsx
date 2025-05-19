import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Providers from './providers';
import { APP_CONFIG } from '@/config/app';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: APP_CONFIG.name,
  description: 'Application de gestion des présences et accès',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    title: APP_CONFIG.name,
    description: 'Application de gestion des présences et accès',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <meta name="description" content="Application de gestion de contrôle d'accès" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>
          <main className="min-h-screen bg-background antialiased">
            {children}
          </main>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
} 