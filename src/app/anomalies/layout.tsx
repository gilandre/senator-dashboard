import { Metadata } from 'next';
import ClientLayout from '@/components/layout/ClientLayout';

export const metadata: Metadata = {
  title: "Anomalies | EMERAUDE DASHI",
  description: "Détection et analyse des anomalies d'accès",
};

export default function AnomaliesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClientLayout>{children}</ClientLayout>;
} 