import { Metadata } from "next";
import ClientLayout from '@/components/layout/ClientLayout';

export const metadata: Metadata = {
  title: "Dashboard | EMERAUDE DASHI",
  description: "Tableau de bord pour les données d'accès des employés",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClientLayout>{children}</ClientLayout>;
} 