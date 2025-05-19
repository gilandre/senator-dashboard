"use client";

import React, { useState, useEffect } from 'react';
import { format, subDays, isWeekend } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

type PresenceRecord = {
  date: string;
  employee: {
    id: string;
    name: string;
    department: string;
  };
  firstBadge: {
    time: string;
    reader: string;
  };
  lastBadge: {
    time: string;
    reader: string;
  };
  status: 'PRESENT' | 'ABSENT' | 'EN_RETARD' | 'PARTI_TOT' | 'JOUR_FERIE' | 'JOURNEE_CONTINUE';
  totalHours: number;
};

export function PresenceOverview() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [presenceData, setPresenceData] = useState<PresenceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Calculer la période de 2 semaines
  const endDate = currentDate;
  const startDate = subDays(endDate, 13); // 14 jours - 1 pour inclure le jour actuel

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/presence/overview?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`);
        if (!response.ok) throw new Error('Failed to fetch data');
        const data = await response.json();
        setPresenceData(data);
      } catch (error) {
        console.error('Error fetching presence data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [startDate, endDate]);

  const handlePreviousPeriod = () => {
    setCurrentDate(subDays(currentDate, 14));
  };

  const handleNextPeriod = () => {
    setCurrentDate(subDays(currentDate, -14));
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
      case 'JOUR_FERIE':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'JOURNEE_CONTINUE':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
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
      case 'JOUR_FERIE':
        return 'Jour férié';
      case 'JOURNEE_CONTINUE':
        return 'Journée continue';
      default:
        return status;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Présence du personnel</CardTitle>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handlePreviousPeriod}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>
                {format(startDate, 'dd MMM', { locale: fr })} - {format(endDate, 'dd MMM yyyy', { locale: fr })}
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={handleNextPeriod}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
              <p className="mt-4 text-gray-500 dark:text-gray-400">Chargement des données...</p>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Collaborateur</TableHead>
                <TableHead>Département</TableHead>
                <TableHead>Arrivée</TableHead>
                <TableHead>Départ</TableHead>
                <TableHead className="text-right">Heures</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {presenceData.map((record, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">
                    {format(new Date(record.date), 'dd MMM yyyy', { locale: fr })}
                  </TableCell>
                  <TableCell>{record.employee.name}</TableCell>
                  <TableCell>{record.employee.department}</TableCell>
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
                    <Badge className={getStatusColor(record.status)}>
                      {getStatusLabel(record.status)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
} 