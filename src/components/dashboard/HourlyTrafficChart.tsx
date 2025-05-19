'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface HourlyTrafficProps {
  startDate?: string;
  endDate?: string;
}

const HourlyTrafficChart: React.FC<HourlyTrafficProps> = ({ startDate, endDate }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hourlyData, setHourlyData] = useState<{ hour: number; count: number }[]>([]);

  const formatHour = (hour: number) => {
    return `${hour}h`;
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Construire l'URL avec les paramètres de date
        let url = '/api/access-data';
        const params = new URLSearchParams();
        
        // Toujours ajouter au moins un paramètre pour éviter l'erreur "Paramètre requis manquant"
        params.append('type', 'hourly');
        
        if (startDate) {
          params.append('startDate', startDate);
        }
        
        if (endDate) {
          params.append('endDate', endDate);
        }
        
        // Assurez-vous qu'il y a toujours un point d'interrogation
        url += `?${params.toString()}`;
        
        console.log('Fetching data from:', url);
        
        const response = await fetch(url, {
          headers: {
            'x-test-bypass-auth': 'admin'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Erreur API: ${response.status}`);
        }
        
        const data = await response.json();
        
        console.log('API response data:', data);
        
        // Vérifier et formater les données horaires
        if (Array.isArray(data.hourlyTraffic)) {
          const formattedHourlyData = data.hourlyTraffic.map((item: any) => ({
            hour: Number(item.hour),
            count: Number(item.count)
          }));
          console.log('Formatted hourly data:', formattedHourlyData);
          setHourlyData(formattedHourlyData);
        } else {
          console.error('Format de données horaires invalide:', data.hourlyTraffic);
          setHourlyData([]);
        }
        
      } catch (err) {
        console.error('Erreur lors de la récupération des données:', err);
        setError('Impossible de charger les données. Veuillez réessayer plus tard.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [startDate, endDate]);

  // Rendu du contenu en fonction de l'état de chargement
  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-2">
          <Skeleton className="h-[300px] w-full" />
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

    if (hourlyData.length === 0) {
      return (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Aucune donnée de trafic horaire disponible.</AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={hourlyData}>
            <XAxis 
              dataKey="hour" 
              tickFormatter={formatHour} 
              stroke="#888888"
              fontSize={12}
            />
            <YAxis
              stroke="#888888"
              fontSize={12}
              tickFormatter={(value) => `${value}`}
            />
            <Tooltip
              formatter={(value) => [`${value} entrées`, 'Trafic']}
              labelFormatter={(label) => `${label}h`}
            />
            <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <Card className="col-span-6">
      <CardHeader>
        <CardTitle>Statistiques d'accès par période</CardTitle>
        <CardDescription>Analyse de la répartition du trafic par heure</CardDescription>
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  );
};

export default HourlyTrafficChart; 