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
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type PresenceRecord = {
  date: string;
  firstBadge: {
    time: string;
    reader: string;
    type: 'ENTREE' | 'SORTIE';
  };
  lastBadge: {
    time: string;
    reader: string;
    type: 'ENTREE' | 'SORTIE';
  };
  totalHours: number;
  status: 'PRESENT' | 'ABSENT' | 'EN_RETARD' | 'PARTI_TOT';
};

export default function EmployeePresencePage() {
  const params = useParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [employee, setEmployee] = useState<any>(null);
  const [presenceData, setPresenceData] = useState<PresenceRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');

  useEffect(() => {
    async function fetchData() {
      try {
        // Récupérer les données de l'employé
        const employeeResponse = await fetch(`/api/employees/${params.id}`);
        if (!employeeResponse.ok) throw new Error('Failed to fetch employee data');
        const employeeData = await employeeResponse.json();
        setEmployee(employeeData);

        // Récupérer les données de présence
        const presenceResponse = await fetch(`/api/employees/${params.id}/presence`);
        if (!presenceResponse.ok) throw new Error('Failed to fetch presence data');
        const presenceData = await presenceResponse.json();
        setPresenceData(presenceData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [params.id]);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/employees/${params.id}/presence`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to fetch presence data');
      const data = await response.json();
      setPresenceData(data);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'ABSENT':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'EN_RETARD':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'PARTI_TOT':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return 'Présent';
      case 'ABSENT':
        return 'Absent';
      case 'EN_RETARD':
        return 'En retard';
      case 'PARTI_TOT':
        return 'Parti tôt';
      default:
        return status;
    }
  };

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
      ) : (
        <div className="space-y-6">
          {/* Résumé statistique */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Temps moyen journalier</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">
                  {presenceData.length > 0
                    ? (presenceData.reduce((sum, record) => sum + record.totalHours, 0) / presenceData.length).toFixed(1)
                    : '0'} h
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Moyenne calculée sur {presenceData.length} jours
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Jours de présence</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">
                  {presenceData.filter(record => record.status === 'PRESENT').length}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Sur {presenceData.length} jours
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Retards</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">
                  {presenceData.filter(record => record.status === 'EN_RETARD').length}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Sur {presenceData.length} jours
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Départs anticipés</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">
                  {presenceData.filter(record => record.status === 'PARTI_TOT').length}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Sur {presenceData.length} jours
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tableau détaillé */}
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
                    <TableHead className="text-right">Heures totales</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {presenceData.map((record, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {format(new Date(record.date), 'dd MMMM yyyy', { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{record.firstBadge.time}</span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {record.firstBadge.reader}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{record.lastBadge.time}</span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {record.lastBadge.reader}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{record.totalHours.toFixed(1)} h</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                          {getStatusLabel(record.status)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 