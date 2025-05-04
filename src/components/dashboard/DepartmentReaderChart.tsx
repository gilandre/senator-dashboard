'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { Building, DoorOpen } from 'lucide-react';

interface Reader {
  deviceId: string;
  location: string;
  count: number;
}

interface DepartmentReaderData {
  department: string;
  readers: Reader[];
  total: number;
}

export function DepartmentReaderChart() {
  const [data, setData] = useState<DepartmentReaderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await axios.get<DepartmentReaderData[]>('/api/readers/usage');
        
        // Limiter aux 8 premiers départements pour une meilleure lisibilité
        const topDepartments = response.data.slice(0, 8);
        
        // Préparer les données pour le graphique
        setData(topDepartments);
        setError(null);
      } catch (err) {
        console.error('Erreur lors de la récupération des données de lecteurs:', err);
        setError('Impossible de charger les données de lecteurs');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Transformer les données pour le graphique
  const chartData = data.map(item => {
    // Pour chaque département, récupérer le lecteur le plus utilisé
    const topReader = item.readers[0] || { deviceId: '', location: '', count: 0 };
    
    return {
      department: item.department,
      count: item.total,
      topReader: topReader.location,
      topReaderCount: topReader.count,
      topReaderPercentage: Math.round((topReader.count / item.total) * 100)
    };
  });

  return (
    <Card className="col-span-4">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium">
          <div className="flex items-center">
            <Building className="mr-2 h-4 w-4" />
            Utilisation des lecteurs par département
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-[250px] w-full" />
          </div>
        ) : error ? (
          <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
            {error}
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
            Aucune donnée disponible
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 20, bottom: 60 }}
              barSize={24}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis 
                dataKey="department"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                angle={-45}
                textAnchor="end"
                height={50}
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip
                formatter={(value, name) => [`${value} accès`, 'Total']}
                labelFormatter={(label) => `Département: ${label}`}
                cursor={{ fill: 'rgba(200, 200, 200, 0.1)' }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg shadow-md bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700">
                        <p className="font-medium">{label}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Total: {data.count} accès</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Lecteur principal: {data.topReader}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {data.topReaderCount} accès ({data.topReaderPercentage}%)
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Bar
                dataKey="count"
                name="Nombre d'accès"
                fill="#0e7490"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
        <div className="mt-2 text-xs text-muted-foreground text-center flex items-center justify-center">
          <DoorOpen className="h-3 w-3 mr-1" />
          Les départements avec la plus forte activité d'accès
        </div>
      </CardContent>
    </Card>
  );
} 