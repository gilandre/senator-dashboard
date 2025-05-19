'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, FileSpreadsheet, Radio, Activity } from 'lucide-react';

interface ReaderStat {
  reader: string;
  count: number;
}

interface EventTypeStat {
  type: string;
  rawType: string | null;
  count: number;
}

interface GroupStat {
  group: string;
  count: number;
}

interface HourlyStat {
  hour: number;
  count: number;
}

interface CentralReaderStat {
  central: string;
  readers: {
    reader: string;
    count: number;
  }[];
  total: number;
}

interface CsvAnalysisData {
  readerStats: ReaderStat[];
  eventTypeStats: EventTypeStat[];
  groupStats: GroupStat[];
  hourlyStats: HourlyStat[];
  centralReaderStats: CentralReaderStat[];
  totalEvents: number;
}

// Couleurs pour les graphiques
const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', 
  '#82CA9D', '#FFC658', '#8DD1E1', '#A4DE6C', '#D0ED57'
];

export function CsvDataChart() {
  const [data, setData] = useState<CsvAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeChart, setActiveChart] = useState<'hourly' | 'devices' | 'type'>('hourly');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await axios.get<CsvAnalysisData>('/api/csv-analysis');
        setData(response.data);
        setError(null);
      } catch (err) {
        console.error('Erreur lors de la récupération des données CSV:', err);
        setError('Impossible de charger les données d\'analyse CSV');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Formater les heures pour l'affichage
  const formatHour = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  // Calculer la proportion pour le graphique camembert (limité aux 5 premiers)
  const getPieChartData = (data: GroupStat[] | undefined, maxItems = 5) => {
    if (!data) return [];
    
    // Prendre les 5 premiers groupes
    const topGroups = data.slice(0, maxItems);
    
    // Calculer le total des autres groupes
    const otherCount = data.slice(maxItems).reduce((sum, item) => sum + item.count, 0);
    
    // Ajouter la catégorie "Autres" si nécessaire
    const result = [...topGroups];
    if (otherCount > 0) {
      result.push({ group: 'Autres', count: otherCount });
    }
    
    return result;
  };

  return (
    <Card className="col-span-4">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium">
          <div className="flex items-center">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Analyse des données d'accès
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-[300px] w-full" />
          </div>
        ) : error ? (
          <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
            {error}
          </div>
        ) : !data ? (
          <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
            Aucune donnée disponible
          </div>
        ) : (
          <Tabs defaultValue="hourly">
            <TabsList className="w-full justify-start mb-4">
              <TabsTrigger value="hourly" className="flex items-center">
                <Clock className="h-4 w-4 mr-1" /> Répartition horaire
              </TabsTrigger>
              <TabsTrigger value="devices" className="flex items-center">
                <Radio className="h-4 w-4 mr-1" /> Centrales/Lecteurs
              </TabsTrigger>
              <TabsTrigger value="events" className="flex items-center">
                <Activity className="h-4 w-4 mr-1" /> Types d'événements
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="hourly" className="min-h-[300px]">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={data.hourlyStats}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis 
                    dataKey="hour" 
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatHour}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    formatter={(value) => [`${value} événements`, 'Nombre']}
                    labelFormatter={(hour) => `Heure: ${formatHour(hour as number)}`}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="Événements"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-4 text-xs text-muted-foreground text-center">
                Distribution des événements d'accès par heure de la journée
              </div>
            </TabsContent>
            
            <TabsContent value="devices" className="min-h-[300px]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium mb-2">Top Centrales</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart
                      data={data.centralReaderStats.slice(0, 5)}
                      margin={{ top: 10, right: 0, left: 0, bottom: 25 }}
                      barSize={20}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis 
                        dataKey="central" 
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
                      />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="total"
                        name="Événements"
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-2">Groupes (Départements)</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={getPieChartData(data.groupStats)}
                        dataKey="count"
                        nameKey="group"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={(entry) => entry.group}
                        labelLine={true}
                      >
                        {getPieChartData(data.groupStats).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name, props) => [
                          `${value} événements (${Math.round((value as number / data.totalEvents) * 100)}%)`, 
                          props.payload.group
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="mt-4 text-xs text-muted-foreground text-center">
                Basé sur {data.totalEvents.toLocaleString()} événements enregistrés dans le fichier d'exportation
              </div>
            </TabsContent>
            
            <TabsContent value="events" className="min-h-[300px]">
              <div>
                <h3 className="text-sm font-medium mb-2">Types d'événements enregistrés</h3>
                <div className="overflow-auto max-h-[300px]">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="px-4 py-2 text-left text-sm font-medium">Type</th>
                        <th className="px-4 py-2 text-left text-sm font-medium">Détail (raw_event_type)</th>
                        <th className="px-4 py-2 text-right text-sm font-medium">Nombre</th>
                        <th className="px-4 py-2 text-right text-sm font-medium">Pourcentage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.eventTypeStats.map((stat, index) => (
                        <tr key={index} className="border-b hover:bg-muted/30">
                          <td className="px-4 py-2 text-sm">{stat.type || 'Non défini'}</td>
                          <td className="px-4 py-2 text-sm">
                            {stat.rawType || '-'}
                          </td>
                          <td className="px-4 py-2 text-sm text-right">{stat.count}</td>
                          <td className="px-4 py-2 text-sm text-right">
                            {((stat.count / data.totalEvents) * 100).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="mt-4 text-xs text-muted-foreground text-center">
                Tous les types d'événements sont inclus, avec leurs détails bruts
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
} 