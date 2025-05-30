'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Calendar, BarChart2, Shield, AlertTriangle, UserCheck } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { addDays, format, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

interface StatisticsData {
  timeSeries: {
    incidents: Array<{
      date: string;
      count: number;
      details: {
        types?: Record<string, number>;
        severities?: Record<string, number>;
        statuses?: Record<string, number>;
      };
    }>;
    access: Array<{
      date: string;
      count: number;
      details: {
        statuses?: Record<string, number>;
        directions?: Record<string, number>;
        personTypes?: Record<string, number>;
      };
    }>;
    auth: Array<{
      date: string;
      count: number;
      details: {
        statuses?: Record<string, number>;
        actions?: Record<string, number>;
      };
    }>;
  };
  summary: {
    totalIncidents: number;
    totalAccess: number;
    totalAuth: number;
    incidentsBySeverity: Record<string, number>;
    accessByStatus: Record<string, number>;
    authByStatus: Record<string, number>;
  };
  filters: {
    startDate: string;
    endDate: string;
    groupBy: string;
    type: string;
  };
}

export default function SecurityStatistics() {
  const { toast } = useToast();
  const [data, setData] = useState<StatisticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [groupBy, setGroupBy] = useState('day');
  const [type, setType] = useState('all');

  useEffect(() => {
    fetchStatistics();
  }, [dateRange, groupBy, type]);

  const fetchStatistics = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
        groupBy,
        type
      });

      const response = await fetch(`/api/settings/security/statistics?${params}`);
      if (!response.ok) throw new Error('Erreur lors de la récupération des statistiques');
      
      const statisticsData = await response.json();
      setData(statisticsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les statistiques de sécurité"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!data) return null;

  const formatDate = (date: string) => {
    switch (groupBy) {
      case 'hour':
        return format(new Date(date), 'HH:mm', { locale: fr });
      case 'day':
        return format(new Date(date), 'dd MMM', { locale: fr });
      case 'week':
        return `S${date.split('-W')[1]}`;
      case 'month':
        return format(new Date(date), 'MMM yyyy', { locale: fr });
      default:
        return date;
    }
  };

  return (
    <div className="space-y-6">
      {/* Filtres */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[300px]">
          <DatePickerWithRange
            date={dateRange}
            onDateChange={setDateRange}
          />
        </div>
        
        <Select value={groupBy} onValueChange={setGroupBy}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Grouper par" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hour">Heure</SelectItem>
            <SelectItem value="day">Jour</SelectItem>
            <SelectItem value="week">Semaine</SelectItem>
            <SelectItem value="month">Mois</SelectItem>
          </SelectContent>
        </Select>

        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Type de données" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tout</SelectItem>
            <SelectItem value="incidents">Incidents</SelectItem>
            <SelectItem value="access">Accès</SelectItem>
            <SelectItem value="auth">Authentification</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Résumé */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Incidents</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalIncidents}</div>
            <div className="text-xs text-muted-foreground">
              {Object.entries(data.summary.incidentsBySeverity).map(([severity, count]) => (
                <div key={severity} className="flex justify-between">
                  <span>{severity}:</span>
                  <span>{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accès</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalAccess}</div>
            <div className="text-xs text-muted-foreground">
              {Object.entries(data.summary.accessByStatus).map(([status, count]) => (
                <div key={status} className="flex justify-between">
                  <span>{status}:</span>
                  <span>{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Authentification</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalAuth}</div>
            <div className="text-xs text-muted-foreground">
              {Object.entries(data.summary.authByStatus).map(([status, count]) => (
                <div key={status} className="flex justify-between">
                  <span>{status}:</span>
                  <span>{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Incidents */}
        {(type === 'all' || type === 'incidents') && (
          <Card>
            <CardHeader>
              <CardTitle>Incidents de sécurité</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.timeSeries.incidents}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis />
                    <Tooltip
                      labelFormatter={formatDate}
                      formatter={(value: number) => [value, 'Incidents']}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#ef4444"
                      name="Incidents"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Accès */}
        {(type === 'all' || type === 'access') && (
          <Card>
            <CardHeader>
              <CardTitle>Accès</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.timeSeries.access}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis />
                    <Tooltip
                      labelFormatter={formatDate}
                      formatter={(value: number) => [value, 'Accès']}
                    />
                    <Legend />
                    <Bar
                      dataKey="count"
                      fill="#3b82f6"
                      name="Accès"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Authentification */}
        {(type === 'all' || type === 'auth') && (
          <Card>
            <CardHeader>
              <CardTitle>Authentification</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.timeSeries.auth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis />
                    <Tooltip
                      labelFormatter={formatDate}
                      formatter={(value: number) => [value, 'Authentifications']}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#10b981"
                      name="Authentifications"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 