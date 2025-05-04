'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Clock } from 'lucide-react';

interface AttendanceData {
  date: string;
  avgEntryTime: string | null;
  avgExitTime: string | null;
  entryCount: number;
  exitCount: number;
}

// Fonction utilitaire pour convertir HH:MM en valeur décimale (pour le graphique)
const timeToDecimal = (timeStr: string | null) => {
  if (!timeStr) return null;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours + minutes / 60;
};

// Fonction utilitaire pour formater les valeurs d'heures sur l'axe Y
const formatYAxis = (value: number) => {
  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

// Fonction utilitaire pour formater les valeurs d'heures dans les tooltips
const formatTooltip = (value: number) => {
  return formatYAxis(value);
};

export function AttendanceTimeChart() {
  const [data, setData] = useState<AttendanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await axios.get<AttendanceData[]>('/api/attendance/average');
        setData(response.data);
        setError(null);
      } catch (err) {
        console.error('Erreur lors de la récupération des données de présence:', err);
        setError('Impossible de charger les données de présence');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Préparer les données pour le graphique
  const chartData = data.map(item => ({
    date: item.date,
    dateFormatted: format(parseISO(item.date), 'dd MMM', { locale: fr }),
    avgEntry: timeToDecimal(item.avgEntryTime),
    avgExit: timeToDecimal(item.avgExitTime),
    entryCount: item.entryCount,
    exitCount: item.exitCount,
  }));

  // Gérer le clic sur un bâton du graphique
  const handleBarClick = (data: any) => {
    const selectedDate = data.date;
    router.push(`/attendance?startDate=${selectedDate}&endDate=${selectedDate}`);
  };

  return (
    <Card className="col-span-4">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium">
          <div className="flex items-center">
            <Clock className="mr-2 h-4 w-4" />
            Heures moyennes d'arrivée et départ
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
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              barGap={8}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis 
                dataKey="dateFormatted" 
                stroke="#888888" 
                fontSize={12} 
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatYAxis}
                domain={[7, 19]} // De 7h à 19h
                ticks={[7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]}
              />
              <Tooltip 
                formatter={formatTooltip} 
                labelFormatter={(value) => `Date: ${value}`} 
                cursor={{ fill: 'rgba(200, 200, 200, 0.1)' }}
              />
              <Legend />
              <Bar
                dataKey="avgEntry"
                name="Heure moyenne d'arrivée"
                fill="#16a34a"
                radius={[4, 4, 0, 0]}
                onClick={handleBarClick}
                isAnimationActive={false}
                cursor="pointer"
              />
              <Bar
                dataKey="avgExit"
                name="Heure moyenne de départ"
                fill="#2563eb"
                radius={[4, 4, 0, 0]}
                onClick={handleBarClick}
                isAnimationActive={false}
                cursor="pointer"
              />
            </BarChart>
          </ResponsiveContainer>
        )}
        <div className="mt-2 text-xs text-muted-foreground text-center">
          Cliquez sur une barre pour voir les détails de la journée
        </div>
      </CardContent>
    </Card>
  );
} 