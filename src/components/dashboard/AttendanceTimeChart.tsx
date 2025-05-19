"use client";

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
import { Clock, ArrowRightLeft } from 'lucide-react';
import { DashboardService, AttendanceData, DateFilter } from '@/services/dashboard-service';
import {
  LineChart,
  Line,
  TooltipProps
} from 'recharts';

// Fonction utilitaire pour convertir HH:MM en valeur décimale
const timeToDecimal = (timeStr: string | null): number | null => {
  if (!timeStr) return null;
  
  try {
    const [hours, minutes] = timeStr.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return null;
    return hours + minutes / 60;
  } catch (e) {
    console.error("Erreur de conversion du temps:", e);
    return null;
  }
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

interface AttendanceTimeChartProps {
  dateFilter?: DateFilter;
}

interface WeeklyData {
  day: string;
  entryValue: number;
  exitValue: number;
}

interface MonthlyData {
  month: string;
  avgHours: number;
}

interface AttendanceResponse {
  daily: AttendanceData[];
  weekly: WeeklyData[];
  monthly: MonthlyData[];
}

export function AttendanceTimeChart({ dateFilter }: AttendanceTimeChartProps) {
  const [dailyData, setDailyData] = useState<AttendanceData[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("daily");
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // Configurer les headers pour inclure le bypass d'authentification en mode développement
        const headers: HeadersInit = {};
        if (process.env.NODE_ENV === 'development') {
          headers['x-test-bypass-auth'] = 'admin';
        }
        
        // Construire l'URL avec les paramètres de filtre
        let url = '/api/attendance/average';
        const params = new URLSearchParams();
        
        if (dateFilter?.startDate) params.append('startDate', dateFilter.startDate);
        if (dateFilter?.endDate) params.append('endDate', dateFilter.endDate);
        
        if (params.toString()) {
          url += `?${params.toString()}`;
        }
        
        const response = await fetch(url, { 
          cache: 'no-store',
          headers
        });
        
        if (!response.ok) {
          throw new Error(`Erreur API: ${response.status} ${response.statusText}`);
        }
        
        const data: AttendanceResponse = await response.json();
        
        setDailyData(data.daily || []);
        setWeeklyData(data.weekly || []);
        setMonthlyData(data.monthly || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching attendance data:', err);
        setError('Erreur lors de la récupération des données de présence');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [dateFilter]);

  // Fonction pour formater les heures
  const formatTime = (timeString: string | null) => {
    if (!timeString) return 'N/A';
    
    try {
      // Supposant que timeString est au format HH:MM:SS
      const [hours, minutes] = timeString.split(':');
      return `${hours}h${minutes}`;
    } catch (e) {
      return timeString;
    }
  };

  // Préparer les données pour le graphique avec valeurs numériques
  const chartData = dailyData.map(item => {
    const entryDecimal = timeToDecimal(item.avgEntryTime);
    const exitDecimal = timeToDecimal(item.avgExitTime);
    
    return {
      ...item,
      date: item.date,
      dateFormatted: format(parseISO(item.date), 'dd MMM', { locale: fr }),
      entryValue: entryDecimal !== null ? entryDecimal : undefined,
      exitValue: exitDecimal !== null ? exitDecimal : undefined,
    };
  });

  // Formatter pour les heures
  const formatHour = (value: number) => {
    if (value === undefined || value === null || isNaN(value)) return '';
    const hours = Math.floor(value);
    const minutes = Math.round((value - hours) * 60);
    return `${hours}h${minutes.toString().padStart(2, '0')}`;
  };

  // Personnaliser le tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    
    const item = payload[0].payload;
    return (
      <div className="rounded-lg border bg-background p-2 shadow-md">
        <p className="font-medium">{format(parseISO(item.date), 'EEEE d MMMM yyyy', { locale: fr })}</p>
        <div className="mt-1 space-y-1">
          <p className="text-sm">
            <span className="font-medium text-blue-600 dark:text-blue-400">Entrée:</span>{' '}
            {item.avgEntryTime ? item.avgEntryTime.substring(0, 5) : 'N/A'} ({item.entryCount} personnes)
          </p>
          <p className="text-sm">
            <span className="font-medium text-orange-600 dark:text-orange-400">Sortie:</span>{' '}
            {item.avgExitTime ? item.avgExitTime.substring(0, 5) : 'N/A'} ({item.exitCount} personnes)
          </p>
        </div>
      </div>
    );
  };

  // Gérer le clic sur un bâton du graphique
  const handleBarClick = (data: any) => {
    const selectedDate = data.date;
    router.push(`/attendance?startDate=${selectedDate}&endDate=${selectedDate}`);
  };

  // Personnaliser le tooltip pour les données hebdomadaires
  const WeeklyTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    
    const item = payload[0].payload;
    return (
      <div className="rounded-lg border bg-background p-2 shadow-md">
        <p className="font-medium">{item.day}</p>
        <div className="mt-1 space-y-1">
          <p className="text-sm">
            <span className="font-medium text-blue-600 dark:text-blue-400">Entrée moyenne:</span>{' '}
            {formatHour(item.entryValue)}
          </p>
          <p className="text-sm">
            <span className="font-medium text-orange-600 dark:text-orange-400">Sortie moyenne:</span>{' '}
            {formatHour(item.exitValue)}
          </p>
        </div>
      </div>
    );
  };

  // Personnaliser le tooltip pour les données mensuelles
  const MonthlyTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    
    const item = payload[0].payload;
    return (
      <div className="rounded-lg border bg-background p-2 shadow-md">
        <p className="font-medium">{item.month}</p>
        <div className="mt-1">
          <p className="text-sm">
            <span className="font-medium text-blue-600 dark:text-blue-400">Heures moyennes:</span>{' '}
            {item.avgHours.toFixed(1)} heures
          </p>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Horaires de présence</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Horaires de présence</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/50">
            <p className="text-red-800 dark:text-red-300">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <Clock className="mr-2 h-5 w-5" />
          Horaires de présence moyens
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="daily" onValueChange={setActiveTab}>
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="daily">Journalier</TabsTrigger>
              <TabsTrigger value="weekly">Hebdomadaire</TabsTrigger>
              <TabsTrigger value="monthly">Mensuel</TabsTrigger>
            </TabsList>
            <div className="flex items-center text-xs text-muted-foreground">
              <div className="mr-4 flex items-center">
                <div className="h-3 w-3 rounded-full bg-blue-500 mr-1"></div>
                <span>Entrée</span>
              </div>
              <div className="flex items-center">
                <div className="h-3 w-3 rounded-full bg-orange-500 mr-1"></div>
                <span>Sortie</span>
              </div>
            </div>
          </div>

          <TabsContent value="daily" className="mt-0">
            {chartData.length === 0 ? (
              <div className="flex justify-center items-center h-[300px] text-muted-foreground">
                Aucune donnée disponible
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
                  barGap={10}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis 
                    dataKey="dateFormatted" 
                    padding={{ left: 10, right: 10 }}
                  />
                  <YAxis 
                    domain={[7, 20]} // Plage fixe de 7h à 20h
                    tickCount={7}
                    tickFormatter={formatHour}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar
                    dataKey="entryValue"
                    name="Entrée moyenne"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                    minPointSize={3}
                  />
                  <Bar
                    dataKey="exitValue"
                    name="Sortie moyenne"
                    fill="#f97316"
                    radius={[4, 4, 0, 0]}
                    minPointSize={3}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </TabsContent>
          
          <TabsContent value="weekly" className="mt-0">
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : error ? (
              <div className="text-red-500">
                {error}
              </div>
            ) : weeklyData.length === 0 ? (
              <div className="flex justify-center items-center h-[300px] text-muted-foreground">
                Aucune donnée disponible
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={weeklyData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
                  barGap={10}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="day" />
                  <YAxis 
                    domain={[7, 20]} 
                    tickCount={7}
                    tickFormatter={formatHour}
                  />
                  <Tooltip content={<WeeklyTooltip />} />
                  <Legend />
                  <Bar
                    dataKey="entryValue"
                    name="Entrée moyenne"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                    minPointSize={3}
                  />
                  <Bar
                    dataKey="exitValue"
                    name="Sortie moyenne"
                    fill="#f97316"
                    radius={[4, 4, 0, 0]}
                    minPointSize={3}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </TabsContent>
          
          <TabsContent value="monthly" className="mt-0">
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : error ? (
              <div className="text-red-500">
                {error}
              </div>
            ) : monthlyData.length === 0 ? (
              <div className="flex justify-center items-center h-[300px] text-muted-foreground">
                Aucune donnée disponible
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={monthlyData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="month" />
                  <YAxis 
                    domain={[7, 9]} 
                    tickCount={5}
                    tickFormatter={(value) => `${value}h`}
                  />
                  <Tooltip content={<MonthlyTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="avgHours"
                    name="Heures moyennes"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 