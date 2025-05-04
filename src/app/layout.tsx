import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import Providers from './providers'
import { Metadata } from 'next'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <title>EMERAUDE DASHI</title>
        <meta name="description" content="Application de gestion de contrôle d'accès" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}

export const metadata: Metadata = {
  title: 'EMERAUDE DASHI',
  description: 'Application de gestion de contrôle d\'accès',
}; 