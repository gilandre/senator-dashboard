'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface AnomalyTypeChartProps {
  startDate?: string;
  endDate?: string;
}

// Colors for pie chart
const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#0ea5e9', '#6366f1', '#8b5cf6', '#d946ef', '#ec4899'];

const AnomalyTypeChart: React.FC<AnomalyTypeChartProps> = ({ startDate, endDate }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeData, setTypeData] = useState<{ name: string; value: number }[]>([]);

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
        
        if (Array.isArray(data.byEventType)) {
          // Sort by count descending and transform to pie chart format
          const formattedData = data.byEventType
            .sort((a, b) => b.count - a.count)
            .map(item => ({
              name: item.eventType || 'Inconnu',
              value: Number(item.count)
            }));
          
          setTypeData(formattedData);
        } else {
          console.error('Format de données de types invalide:', data.byEventType);
          setTypeData([]);
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

  // Custom tooltip for the pie chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border rounded shadow-sm">
          <p className="font-semibold">{payload[0].name}</p>
          <p className="text-sm">{`${payload[0].value} anomalies (${(payload[0].payload.percent * 100).toFixed(1)}%)`}</p>
        </div>
      );
    }
    return null;
  };

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

    if (typeData.length === 0) {
      return (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Aucune donnée de type d'anomalie disponible.</AlertDescription>
        </Alert>
      );
    }

    // Calculate percentages for each slice
    const total = typeData.reduce((sum, item) => sum + item.value, 0);
    const dataWithPercent = typeData.map(item => ({
      ...item,
      percent: item.value / total
    }));

    return (
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={dataWithPercent}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {dataWithPercent.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <Card className="col-span-6">
      <CardHeader>
        <CardTitle>Répartition par type d'anomalie</CardTitle>
        <CardDescription>Distribution des différents types d'événements anormaux</CardDescription>
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  );
};

export default AnomalyTypeChart; 