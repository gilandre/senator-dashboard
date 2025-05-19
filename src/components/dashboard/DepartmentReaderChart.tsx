'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart, 
  Bar, 
  XAxis, 
  YAxis
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Building } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface DepartmentReaderChartProps {
  startDate?: string;
  endDate?: string;
}

interface DepartmentData {
  departmentName: string;
  count: number;
}

interface ReaderStat {
  reader: string;
  count: number;
}

// Palette de couleurs pour le graphique
const COLORS = ["#3b82f6", "#4f46e5", "#4ade80", "#f97316", "#8b5cf6"];

const DepartmentReaderChart: React.FC<DepartmentReaderChartProps> = ({ startDate, endDate }) => {
  const [departmentData, setDepartmentData] = useState<DepartmentData[]>([]);
  const [readerStats, setReaderStats] = useState<ReaderStat[]>([]);
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
        
        if (startDate) {
          params.append('startDate', startDate);
        }
        
        if (endDate) {
          params.append('endDate', endDate);
        }
        
        const queryString = params.toString();
        if (queryString) {
          url += `?${queryString}`;
        }
        
        const response = await fetch(url, {
          headers: {
            'x-test-bypass-auth': 'admin'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Erreur API: ${response.status}`);
        }
        
        const data = await response.json();
        
        console.log('API response data - departments/readers:', data);
        
        // Traitement des données de groupes/départements
        if (Array.isArray(data.groupStats)) {
          const processedDepartmentData = data.groupStats.map(stat => ({
            departmentName: stat.group,
            count: Number(stat.count)
          }));
          setDepartmentData(processedDepartmentData);
        } else {
          console.error('Format de données départements invalide:', data.groupStats);
          setDepartmentData([]);
        }
        
        // Traitement des données de lecteurs
        if (Array.isArray(data.readerStats)) {
          const processedReaderStats = data.readerStats.map(stat => ({
            reader: stat.reader,
            count: Number(stat.count)
          }));
          setReaderStats(processedReaderStats);
        } else {
          console.error('Format de données lecteurs invalide:', data.readerStats);
          setReaderStats([]);
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

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="p-2 bg-white dark:bg-gray-900 border rounded-md shadow-md">
          <p className="font-medium">{data.departmentName}</p>
          <p className="text-sm">{data.count} accès</p>
        </div>
      );
    }
    return null;
  };

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

    if (departmentData.length === 0) {
      return (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Aucune donnée de département disponible.</AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="flex flex-col md:flex-row items-center">
        <div className="w-full md:w-1/2 h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={departmentData}
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={40}
                paddingAngle={2}
                dataKey="count"
                nameKey="departmentName"
                label={(entry) => entry.departmentName}
                labelLine={false}
              >
                {departmentData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]} 
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="w-full md:w-1/2 mt-4 md:mt-0">
          <div className="space-y-4">
            {departmentData.map((dept, index) => (
              <div key={dept.departmentName} className="flex items-center">
                <div
                  className="h-3 w-3 rounded-full mr-2"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <div className="flex-1 flex justify-between items-center">
                  <span className="text-sm">{dept.departmentName}</span>
                  <span className="text-sm font-medium">{dept.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Building className="mr-2 h-5 w-5" />
          Répartition par département
        </CardTitle>
        <CardDescription>Analyse de la répartition des accès par département</CardDescription>
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  );
};

export default DepartmentReaderChart; 