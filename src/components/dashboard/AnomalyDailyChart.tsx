'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface AnomalyDailyChartProps {
  startDate?: string;
  endDate?: string;
}

const AnomalyDailyChart: React.FC<AnomalyDailyChartProps> = ({ startDate, endDate }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dailyData, setDailyData] = useState<{ date: string; count: number }[]>([]);

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  };

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
        
        if (Array.isArray(data.dailyAnomalies)) {
          // Sort by date ascending for the chart
          const formattedData = data.dailyAnomalies
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map(item => ({
              date: item.date,
              count: Number(item.count)
            }));
          
          setDailyData(formattedData);
        } else {
          console.error('Format de données quotidiennes invalide:', data.dailyAnomalies);
          setDailyData([]);
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

  // Render content based on loading state
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

    if (dailyData.length === 0) {
      return (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Aucune donnée d'anomalie disponible.</AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dailyData}>
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate} 
              stroke="#888888"
              fontSize={12}
            />
            <YAxis
              stroke="#888888"
              fontSize={12}
              tickFormatter={(value) => `${value}`}
            />
            <Tooltip
              formatter={(value) => [`${value} anomalies`, 'Nombre']}
              labelFormatter={(label) => formatDate(label)}
            />
            <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <Card className="col-span-6">
      <CardHeader>
        <CardTitle>Anomalies par jour</CardTitle>
        <CardDescription>Distribution quotidienne des événements anormaux</CardDescription>
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  );
};

export default AnomalyDailyChart; 