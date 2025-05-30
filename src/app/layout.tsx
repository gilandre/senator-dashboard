import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Providers from './providers';
import { APP_CONFIG } from '@/config/app';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: APP_CONFIG.name,
  description: 'Plateforme de gestion ' + APP_CONFIG.name,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}