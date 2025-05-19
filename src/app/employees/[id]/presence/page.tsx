'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, Calendar, Filter, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PresenceRecord, PresenceStats } from '@/types/presence';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { PresenceCharts } from '@/components/presence/PresenceCharts';
import { PresenceAnomalies } from '@/components/presence/PresenceAnomalies';
import { LunchBreakManager } from '@/components/presence/LunchBreakManager';

export default function EmployeePresencePage() {
  const params = useParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [employee, setEmployee] = useState<any>(null);
  const [presenceStats, setPresenceStats] = useState<PresenceStats | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(subMonths(new Date(), 1)),
    to: endOfMonth(new Date())
  });

  useEffect(() => {
    fetchData();
  }, [params.id, dateRange]);

  async function fetchData() {
    try {
      setIsLoading(true);
      // Récupérer les données de l'employé
      const employeeResponse = await fetch(`/api/employees/${params.id}`);
      if (!employeeResponse.ok) throw new Error('Failed to fetch employee data');
      const employeeData = await employeeResponse.json();
      setEmployee(employeeData);

      // Récupérer les données de présence avec les filtres de date
      const queryParams = new URLSearchParams({
        startDate: dateRange.from?.toISOString() || '',
        endDate: dateRange.to?.toISOString() || ''
      });

      const presenceResponse = await fetch(`/api/employees/${params.id}/presence?${queryParams}`);
      if (!presenceResponse.ok) throw new Error('Failed to fetch presence data');
      const presenceData = await presenceResponse.json();
      setPresenceStats(presenceData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleExport = async () => {
    try {
      const queryParams = new URLSearchParams({
        startDate: dateRange.from?.toISOString() || '',
        endDate: dateRange.to?.toISOString() || '',
        format: 'csv'
      });

      const response = await fetch(`/api/employees/${params.id}/presence/export?${queryParams}`);
      if (!response.ok) throw new Error('Failed to export data');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `presence_${employee?.firstName}_${employee?.lastName}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  if (!presenceStats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={() => router.push('/employees')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <h1 className="text-2xl font-bold">
            {employee ? `${employee.firstName} ${employee.lastName}` : 'Chargement...'}
          </h1>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Calendar className="h-4 w-4 mr-2" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "dd/MM/yyyy", { locale: fr })} -{" "}
                      {format(dateRange.to, "dd/MM/yyyy", { locale: fr })}
                    </>
                  ) : (
                    format(dateRange.from, "dd/MM/yyyy", { locale: fr })
                  )
                ) : (
                  "Période"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent
                initialFocus
                mode="range"
                defaultMonth={dateRange.from}
                selected={dateRange}
                onSelect={(range: DateRange | undefined) => range && setDateRange(range)}
                numberOfMonths={2}
                locale={fr}
              />
            </PopoverContent>
          </Popover>
          <Button size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Présences</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">
              {presenceStats.daily.filter(record => record.status === 'PRESENT').length}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Sur {presenceStats.daily.length} jours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Retards</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">
              {presenceStats.daily.filter(record => record.status === 'EN_RETARD').length}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Sur {presenceStats.daily.length} jours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Départs anticipés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">
              {presenceStats.daily.filter(record => record.status === 'PARTI_TOT').length}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Sur {presenceStats.daily.length} jours
            </p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : presenceStats ? (
        <>
          <PresenceCharts stats={presenceStats} />
          <PresenceAnomalies records={presenceStats.daily} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <LunchBreakManager
              employeeId={String(params.id)}
              date={format(new Date(), 'yyyy-MM-dd')}
              onUpdate={fetchData}
            />
          </div>
          
          <Tabs defaultValue="daily" className="space-y-4">
            <TabsList>
              <TabsTrigger value="daily">Journalier</TabsTrigger>
              <TabsTrigger value="weekly">Hebdomadaire</TabsTrigger>
              <TabsTrigger value="monthly">Mensuel</TabsTrigger>
            </TabsList>

            <TabsContent value="daily">
              <Card>
                <CardHeader>
                  <CardTitle>Historique des présences</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Premier badge</TableHead>
                        <TableHead>Dernier badge</TableHead>
                        <TableHead>Heures totales</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {presenceStats.daily.map((record) => (
                        <TableRow key={record.date}>
                          <TableCell>{format(parseISO(record.date), 'dd/MM/yyyy', { locale: fr })}</TableCell>
                          <TableCell>{record.firstBadge.time}</TableCell>
                          <TableCell>{record.lastBadge.time}</TableCell>
                          <TableCell>{record.totalHours.toFixed(2)}h</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              record.status === 'PRESENT' ? 'bg-green-100 text-green-800' :
                              record.status === 'ABSENT' ? 'bg-red-100 text-red-800' :
                              record.status === 'EN_RETARD' ? 'bg-yellow-100 text-yellow-800' :
                              record.status === 'PARTI_TOT' ? 'bg-orange-100 text-orange-800' :
                              record.status === 'JOUR_FERIE' ? 'bg-purple-100 text-purple-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {record.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="weekly">
              <Card>
                <CardHeader>
                  <CardTitle>Statistiques hebdomadaires</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Semaine</TableHead>
                        <TableHead>Moyenne d'heures</TableHead>
                        <TableHead>Nombre de jours</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {presenceStats.weekly.map((week) => (
                        <TableRow key={week.day}>
                          <TableCell>{week.day}</TableCell>
                          <TableCell>{week.avgDuration.toFixed(2)}h</TableCell>
                          <TableCell>{week.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="monthly">
              <Card>
                <CardHeader>
                  <CardTitle>Statistiques mensuelles</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mois</TableHead>
                        <TableHead>Moyenne d'heures</TableHead>
                        <TableHead>Nombre de jours</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {presenceStats.monthly.map((month) => (
                        <TableRow key={month.week}>
                          <TableCell>{month.week}</TableCell>
                          <TableCell>{month.avgDuration.toFixed(2)}h</TableCell>
                          <TableCell>{month.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <div className="text-center text-gray-500">
          Aucune donnée de présence disponible
        </div>
      )}
    </div>
  );
} 