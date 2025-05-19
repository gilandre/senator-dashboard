"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Users, Clock, Building, FileText } from "lucide-react";

interface StatisticsSectionProps {
  startDate?: string;
  endDate?: string;
}

interface Statistics {
  totalRecords: number;
  uniqueReaders: number;
  avgDailyAccess: number;
  totalGroups: number;
}

const StatisticsSection: React.FC<StatisticsSectionProps> = ({ startDate, endDate }) => {
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Construire l'URL avec les paramètres de date
        let url = '/api/csv-analysis';
        const params = new URLSearchParams();
        
        // Ajouter un paramètre par défaut pour garantir qu'il y a toujours des paramètres
        params.append('requestType', 'statistics');
        
        if (startDate) {
          params.append('startDate', startDate);
        }
        
        if (endDate) {
          params.append('endDate', endDate);
        }
        
        // Toujours ajouter les paramètres
        url += `?${params.toString()}`;
        
        const response = await fetch(url, {
          headers: {
            'x-test-bypass-auth': 'admin'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Erreur API: ${response.status}`);
        }
        
        const data = await response.json();
        
        console.log('API response data - statistics:', data);
        
        // Calculer le nombre de jours dans la période
        let numberOfDays = 30; // Valeur par défaut
        
        if (startDate && endDate) {
          const start = new Date(startDate);
          const end = new Date(endDate);
          
          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            const diffTime = Math.abs(end.getTime() - start.getTime());
            numberOfDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1; // Minimum 1 jour
          }
        }
        
        console.log(`Période sélectionnée: ${numberOfDays} jours`);
        
        // Calculer les statistiques
        const stats: Statistics = {
          totalRecords: data.totalEvents || 0,
          uniqueReaders: Array.isArray(data.readerStats) ? data.readerStats.length : 0,
          avgDailyAccess: Math.round((data.totalEvents || 0) / numberOfDays) || 0,
          totalGroups: Array.isArray(data.groupStats) ? data.groupStats.length : 0
        };
        
        setStatistics(stats);
        
      } catch (err) {
        console.error('Erreur lors de la récupération des statistiques:', err);
        setError('Impossible de charger les statistiques. Veuillez réessayer plus tard.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [startDate, endDate]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Chargement...</CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!statistics) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Aucune statistique disponible.</AlertDescription>
      </Alert>
    );
  }

  const stats = [
    {
      title: "Événements totaux",
      value: statistics.totalRecords.toLocaleString(),
      icon: FileText,
      color: "text-blue-500",
      description: "Nombre total d'accès enregistrés"
    },
    {
      title: "Lecteurs uniques",
      value: statistics.uniqueReaders.toLocaleString(),
      icon: Building,
      color: "text-green-500",
      description: "Nombre de lecteurs distincts"
    },
    {
      title: "Accès quotidiens",
      value: statistics.avgDailyAccess.toLocaleString(),
      icon: Clock,
      color: "text-orange-500",
      description: "Moyenne d'accès par jour"
    },
    {
      title: "Départements",
      value: statistics.totalGroups.toLocaleString(),
      icon: Users,
      color: "text-purple-500",
      description: "Nombre total de départements"
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <Icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default StatisticsSection; 