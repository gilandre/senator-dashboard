'use client';

import React, { useState } from 'react';
import { 
  Calendar, Filter, Download, ArrowLeft, RefreshCw
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PresenceTimeChart } from '@/components/dashboard/presence-time-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function PresenceReportPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [period, setPeriod] = useState('daily');

  // Charger les données au chargement de la page
  React.useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/access-data');
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }
        
        const jsonData = await response.json();
        setData(jsonData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchData();
  }, []);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/access-data', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      
      const jsonData = await response.json();
      setData(jsonData);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Formatage des dates selon la locale française
  function formatDate(dateStr: string) {
    return format(new Date(dateStr), 'dd MMMM yyyy', { locale: fr });
  }

  function formatWeekRange(start: string, end: string) {
    return `${format(new Date(start), 'dd MMM', { locale: fr })} - ${format(new Date(end), 'dd MMM yyyy', { locale: fr })}`;
  }

  function formatMonth(monthStr: string) {
    const [year, month] = monthStr.split('-');
    return format(new Date(parseInt(year), parseInt(month) - 1, 1), 'MMMM yyyy', { locale: fr });
  }

  // Préparation des données pour l'affichage
  const tableData = period === 'daily' ? data?.presenceStats?.daily :
                    period === 'weekly' ? data?.presenceStats?.weekly :
                    period === 'monthly' ? data?.presenceStats?.monthly :
                    data?.presenceStats?.yearly;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={() => router.push('/reports')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <h1 className="text-2xl font-bold">Rapport de temps de présence</h1>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Période
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filtrer
          </Button>
          <Button size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="mt-4 text-gray-500 dark:text-gray-400">Chargement des données...</p>
          </div>
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Graphique des heures de présence */}
          <PresenceTimeChart data={{
            dailyData: data.presenceStats.daily,
            weeklyData: data.presenceStats.weekly,
            monthlyData: data.presenceStats.monthly,
            yearlyData: data.presenceStats.yearly
          }} />
          
          {/* Tableau détaillé */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Données détaillées</span>
                <Tabs value={period} onValueChange={setPeriod} className="w-auto">
                  <TabsList>
                    <TabsTrigger value="daily">Jour</TabsTrigger>
                    <TabsTrigger value="weekly">Semaine</TabsTrigger>
                    <TabsTrigger value="monthly">Mois</TabsTrigger>
                    <TabsTrigger value="yearly">Année</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Période</TableHead>
                    <TableHead className="text-right">Heures totales</TableHead>
                    <TableHead className="text-right">Employés</TableHead>
                    <TableHead className="text-right">Heures moyennes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableData && tableData.length > 0 ? (
                    tableData.map((item: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {period === 'daily' && formatDate(item.date)}
                          {period === 'weekly' && formatWeekRange(item.weekStart, item.weekEnd)}
                          {period === 'monthly' && formatMonth(item.month)}
                          {period === 'yearly' && item.year}
                        </TableCell>
                        <TableCell className="text-right">{item.totalHours.toFixed(1)}</TableCell>
                        <TableCell className="text-right">{item.employeeCount}</TableCell>
                        <TableCell className="text-right">{item.averageHours.toFixed(1)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4">
                        Aucune donnée disponible pour cette période
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Résumé statistique */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Résumé</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Total des enregistrements</dt>
                    <dd className="font-medium">{data.totalRecords}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Employés suivis</dt>
                    <dd className="font-medium">{data.employeesRecords}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Visiteurs</dt>
                    <dd className="font-medium">{data.visitorsRecords}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Anomalies détectées</dt>
                    <dd className="font-medium">{data.anomalies}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Temps moyen journalier</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">
                  {data.presenceStats.daily.length > 0 
                    ? (data.presenceStats.daily.reduce((sum: number, day: any) => sum + day.averageHours, 0) / data.presenceStats.daily.length).toFixed(1)
                    : '0'} h
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Moyenne quotidienne calculée sur {data.presenceStats.daily.length} jours
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Tendance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  L'analyse des données montre une tendance générale à la {' '}
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    stabilité
                  </span>{' '}
                  des heures de présence sur la période analysée.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="border rounded-lg p-8 text-center">
          <h2 className="text-xl font-medium mb-2">Erreur de chargement des données</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Impossible de récupérer les informations. Veuillez réessayer.
          </p>
          <Button onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Réessayer
          </Button>
        </div>
      )}
    </div>
  );
} 