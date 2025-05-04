import React from 'react';
import { Metadata } from "next";
import Link from "next/link";
import { DashboardMetrics } from "@/components/dashboard/dashboard-metrics";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { PresenceTimeChart } from "@/components/dashboard/presence-time-chart";
import { StatisticsSection } from '@/components/dashboard/StatisticsSection';
import { RecentActivityList } from '@/components/dashboard/RecentActivityList';
import { AttendanceTimeChart } from '@/components/dashboard/AttendanceTimeChart';
import { DepartmentReaderChart } from '@/components/dashboard/DepartmentReaderChart';
import { CsvDataChart } from '@/components/dashboard/CsvDataChart';

export const metadata: Metadata = {
  title: "Dashboard | EMERAUDE DASHI",
  description: "Tableau de bord pour les données d'accès des employés",
};

async function getAccessData() {
  try {
    // Construire correctement l'URL complète
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';
    const response = await fetch(`${baseUrl}/api/access-data`, { 
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`Erreur API: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('Error fetching access data:', error);
    // Renvoyer un objet avec des données par défaut au lieu de null
    return {
      presenceStats: {
        daily: [],
        weekly: [],
        monthly: [],
        yearly: []
      }
    };
  }
}

export default async function DashboardPage() {
  const data = await getAccessData();
  
  // Si les données ne sont pas disponibles, afficher un message de chargement
  if (!data) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-medium mb-2">Chargement des données...</h2>
          <p className="text-gray-500 dark:text-gray-400">Veuillez patienter pendant que nous récupérons les informations.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
      </div>
      
      <div className="mt-2">
        <StatisticsSection />
      </div>
      
      <div className="mt-4">
        <AttendanceTimeChart />
      </div>
      
      <div className="mt-4">
        <DepartmentReaderChart />
      </div>
      
      <div className="mt-4">
        <CsvDataChart />
      </div>
      
      <div className="mt-4 space-y-4">
        <h2 className="text-lg font-medium">Activités récentes</h2>
        <RecentActivityList />
      </div>
    </div>
  );
} 