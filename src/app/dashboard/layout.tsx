import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | EMERAUDE DASHI",
  description: "Tableau de bord pour les données d'accès des employés",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 