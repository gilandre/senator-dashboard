'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowLeft, Calendar, Clock, User, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

interface IEventDetail {
  time: string;
  type: string;
  reader: string | null;
}

interface IEmployeeDetail {
  badgeNumber: string;
  firstName: string;
  lastName: string;
  date: string;
  events: IEventDetail[];
  isHoliday: boolean;
  isContinuousDay: boolean;
  isWeekend: boolean;
  holidayName?: string;
  totalHours: number | null;
}

export default function EmployeeDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const badgeNumber = params.badgeNumber as string;
  const date = searchParams.get('date');
  
  const [loading, setLoading] = useState(true);
  const [employeeDetail, setEmployeeDetail] = useState<IEmployeeDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmployeeDetail = async () => {
      if (!badgeNumber || !date) {
        setError('Paramètres manquants');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(`/api/attendance/detail?badgeNumber=${badgeNumber}&date=${date}`);
        
        if (!response.ok) {
          throw new Error('Impossible de récupérer les détails');
        }
        
        const data = await response.json();
        setEmployeeDetail(data);
      } catch (error) {
        console.error('Erreur lors de la récupération des détails:', error);
        setError('Une erreur s\'est produite lors de la récupération des détails');
      } finally {
        setLoading(false);
      }
    };

    fetchEmployeeDetail();
  }, [badgeNumber, date]);

  // Formater la date à afficher
  const formatDisplayDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'EEEE dd MMMM yyyy', { locale: fr });
    } catch (e) {
      return dateStr;
    }
  };

  // Déterminer le type d'événement (entrée ou sortie)
  const getEventTypeDisplay = (type: string) => {
    if (type.toLowerCase().includes('entré') || type.toLowerCase().includes('entre')) {
      return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Entrée</Badge>;
    } else if (type.toLowerCase().includes('sorti') || type.toLowerCase().includes('sortie')) {
      return <Badge variant="default" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">Sortie</Badge>;
    }
    return <Badge variant="outline">{type}</Badge>;
  };

  // Calcul des statistiques
  const calculateStats = () => {
    if (!employeeDetail || !employeeDetail.events.length) return null;

    const eventsCount = employeeDetail.events.length;
    const firstEvent = employeeDetail.events[0];
    const lastEvent = employeeDetail.events[employeeDetail.events.length - 1];
    
    return {
      count: eventsCount,
      firstTime: firstEvent.time,
      lastTime: lastEvent.time,
      firstReader: firstEvent.reader,
      lastReader: lastEvent.reader
    };
  };

  const stats = employeeDetail ? calculateStats() : null;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center mb-6">
        <Link href="/attendance" className="mr-4">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Détails des présences</h1>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-1/3" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
          <p>{error}</p>
          <Link href="/attendance">
            <Button variant="outline" className="mt-2">Revenir à la liste</Button>
          </Link>
        </div>
      ) : employeeDetail ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                {employeeDetail.firstName} {employeeDetail.lastName}
                <Badge className="ml-2" variant="outline">Badge: {employeeDetail.badgeNumber}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center">
                  <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground mr-2">Date:</span>
                  <span className="font-medium capitalize">{formatDisplayDate(employeeDetail.date)}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground mr-2">Heures totales:</span>
                  <span className="font-medium">{employeeDetail.totalHours ? `${employeeDetail.totalHours.toFixed(1)}h` : 'N/A'}</span>
                </div>
                <div>
                  {employeeDetail.isHoliday && (
                    <Badge variant="destructive">{employeeDetail.holidayName || 'Jour férié'}</Badge>
                  )}
                  {employeeDetail.isContinuousDay && (
                    <Badge variant="secondary" className="ml-1">Journée continue</Badge>
                  )}
                  {employeeDetail.isWeekend && (
                    <Badge variant="outline" className="ml-1">Weekend</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Première entrée</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.firstTime}</div>
                  {stats.firstReader && (
                    <div className="text-sm text-muted-foreground flex items-center mt-1">
                      <MapPin className="h-3 w-3 mr-1" />
                      {stats.firstReader}
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Dernière sortie</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.lastTime}</div>
                  {stats.lastReader && (
                    <div className="text-sm text-muted-foreground flex items-center mt-1">
                      <MapPin className="h-3 w-3 mr-1" />
                      {stats.lastReader}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Journal des pointages</span>
                <Badge>{employeeDetail.events.length} pointages</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {employeeDetail.events.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun pointage enregistré pour cette date
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Heure</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Lecteur</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employeeDetail.events.map((event, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{event.time}</TableCell>
                          <TableCell>{getEventTypeDisplay(event.type || '')}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <MapPin className="h-3 w-3 mr-2 text-muted-foreground" />
                              {event.reader || 'Non spécifié'}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-yellow-700 dark:text-yellow-400">
          <p>Aucune donnée trouvée pour cet employé à cette date.</p>
          <Link href="/attendance">
            <Button variant="outline" className="mt-2">Revenir à la liste</Button>
          </Link>
        </div>
      )}
    </div>
  );
} 