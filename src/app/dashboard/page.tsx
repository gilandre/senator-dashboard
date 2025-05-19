'use client';

import React, { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';

import { DateRangePicker } from '@/components/ui/date-range-picker';
import StatisticsSection from '@/components/dashboard/StatisticsSection';
// Import temporairement désactivé
// import DepartmentReaderChart from '@/components/dashboard/DepartmentReaderChart';
import HourlyTrafficChart from '@/components/dashboard/HourlyTrafficChart';
// Import temporairement désactivé
// import RecentActivityList from '@/components/dashboard/RecentActivityList';

export default function DashboardPage() {
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  // Charger la date maximale au chargement
  useEffect(() => {
    const fetchMaxDate = async () => {
      try {
        // Récupérer la date maximale depuis l'API
        const response = await fetch('/api/access-data?getMaxDate=true');
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération de la date');
        }
        
        const data = await response.json();
        const maxDate = data.maxDate ? new Date(data.maxDate) : new Date();
        const startDate = subDays(maxDate, 14); // Soustraire 14 jours (2 semaines)
        
        setDate({
          from: startDate,
          to: maxDate
        });
      } catch (error) {
        console.error('Erreur lors de la récupération de la date maximale:', error);
        // Fallback sur les 14 derniers jours si erreur
        const endDate = new Date();
        const startDate = subDays(endDate, 14);
        setDate({
          from: startDate,
          to: endDate
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchMaxDate();
  }, []);

  // Convertir les dates en format string pour les passer aux APIs
  const startDate = date?.from ? format(date.from, 'yyyy-MM-dd') : undefined;
  const endDate = date?.to ? format(date.to, 'yyyy-MM-dd') : undefined;

  // Afficher un état de chargement pendant la récupération des dates
  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Tableau de bord</h2>
          <div className="flex items-center gap-2">
            {/* Placeholder pour le chargement */}
            <div className="h-10 w-48 bg-gray-200 animate-pulse rounded-md"></div>
          </div>
        </div>
        
        {/* Placeholder pour le chargement des statistiques */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 animate-pulse rounded-md"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Tableau de bord</h2>
        <div className="flex items-center gap-2">
          <DateRangePicker
            value={date}
            onChange={setDate}
            align="end"
          />
        </div>
      </div>
      
      {/* Statistiques globales */}
      <StatisticsSection startDate={startDate} endDate={endDate} />
      
      {/* Graphiques et tableaux */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-6">
        {/* Statistiques par département et lecteur - temporairement désactivé
        <DepartmentReaderChart startDate={startDate} endDate={endDate} /> */}
        
        {/* Répartition horaire et centrales/lecteurs */}
        <HourlyTrafficChart startDate={startDate} endDate={endDate} />
        
        {/* Activités récentes - temporairement désactivé
        <RecentActivityList startDate={startDate} endDate={endDate} limit={15} /> */}
        
        {/* Autres widgets peuvent être ajoutés ici */}
      </div>
    </div>
  );
} 