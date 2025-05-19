'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, AlertTriangle, Building, FileX } from "lucide-react";

interface AnomalyStatisticsProps {
  startDate?: string;
  endDate?: string;
}

interface Statistics {
  totalAnomalies: number;
  anomalyTypes: number;
  topReader: string;
  topReaderCount: number;
}

const AnomalyStatistics: React.FC<AnomalyStatisticsProps> = ({ startDate, endDate }) => {
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        let url = '/api/anomalies';
        const params = new URLSearchParams();
        
        if (startDate) {
          params.append('startDate', startDate);
        }
        
        if (endDate) {
          params.append('endDate', endDate);
        }
        
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
        
        // Get top reader
        let topReader = { reader: 'N/A', count: 0 };
        if (Array.isArray(data.byReader) && data.byReader.length > 0) {
          topReader = data.byReader[0];
        }
        
        // Calculate statistics
        const stats: Statistics = {
          totalAnomalies: data.totalAnomalies || 0,
          anomalyTypes: Array.isArray(data.byEventType) ? data.byEventType.length : 0,
          topReader: topReader.reader || 'N/A',
          topReaderCount: topReader.count || 0
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
      title: "Total des anomalies",
      value: statistics.totalAnomalies.toLocaleString(),
      icon: AlertTriangle,
      color: "text-red-500",
      description: "Nombre total d'événements anormaux"
    },
    {
      title: "Types d'anomalies",
      value: statistics.anomalyTypes.toLocaleString(),
      icon: FileX,
      color: "text-orange-500",
      description: "Nombre de types d'anomalies distincts"
    },
    {
      title: "Lecteur principal",
      value: statistics.topReader,
      icon: Building,
      color: "text-amber-500",
      description: `Avec ${statistics.topReaderCount} anomalies`
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
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

export default AnomalyStatistics; 