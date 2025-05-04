'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { StatisticsCard } from './StatisticsCard';
import { Users, Briefcase, AlertTriangle, FileText } from 'lucide-react';

interface StatisticsData {
  totalRecords: number;
  employees: number;
  visitors: number;
  anomalies: number;
  recentAnomalies: number;
}

export function StatisticsSection() {
  const [data, setData] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setLoading(true);
        const response = await axios.get<StatisticsData>('/api/statistics');
        setData(response.data);
        setError(null);
      } catch (err) {
        console.error('Erreur lors de la récupération des statistiques:', err);
        setError('Impossible de charger les statistiques');
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
    
    // Rafraîchir les données toutes les 5 minutes
    const intervalId = setInterval(fetchStatistics, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Calculer le pourcentage d'anomalies récentes par rapport au total
  const recentAnomaliesPercentage = data?.anomalies 
    ? Math.round((data.recentAnomalies / data.anomalies) * 100) 
    : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatisticsCard
        title="Enregistrements totaux"
        value={data?.totalRecords.toLocaleString() || '0'}
        icon={<FileText className="h-4 w-4 text-muted-foreground" />}
        loading={loading}
        description="Nombre total d'enregistrements d'accès"
      />
      
      <StatisticsCard
        title="Employés"
        value={data?.employees.toLocaleString() || '0'}
        icon={<Briefcase className="h-4 w-4 text-muted-foreground" />}
        loading={loading}
        description="Employés actifs dans le système"
      />
      
      <StatisticsCard
        title="Visiteurs"
        value={data?.visitors.toLocaleString() || '0'}
        icon={<Users className="h-4 w-4 text-muted-foreground" />}
        loading={loading}
        description="Visiteurs enregistrés dans le système"
      />
      
      <StatisticsCard
        title="Anomalies"
        value={data?.anomalies.toLocaleString() || '0'}
        icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />}
        loading={loading}
        description="Anomalies détectées"
        trend={
          data?.anomalies ? {
            value: recentAnomaliesPercentage,
            direction: recentAnomaliesPercentage > 50 ? 'up' : 'down',
            label: "derniers 7 jours"
          } : undefined
        }
      />
      
      {error && (
        <div className="col-span-4 bg-red-50 dark:bg-red-900/20 p-3 rounded-md text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}
    </div>
  );
} 