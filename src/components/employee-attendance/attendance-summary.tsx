'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight, Users, Clock, Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface SummaryData {
  totalEmployees: number;
  totalRecords: number;
  averageHours: number;
  daysWithData: number;
  mostActiveDay: {
    date: string;
    count: number;
  };
  earliestArrival: {
    time: string;
    employee: string;
  };
  latestDeparture: {
    time: string;
    employee: string;
  };
}

export function AttendanceSummary() {
  const [isLoading, setIsLoading] = useState(true);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);

  useEffect(() => {
    const fetchSummaryData = async () => {
      try {
        const response = await fetch('/api/attendance/summary');
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des données');
        }
        const data = await response.json();
        setSummaryData(data);
      } catch (error) {
        console.error('Erreur:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSummaryData();
  }, []);

  // Formatter la date au format français
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Tableau de bord des présences</h2>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-7 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-6 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : summaryData ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Collaborateurs</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className="text-2xl font-bold">{summaryData.totalEmployees}</div>
                <div className="text-sm text-muted-foreground">
                  sur {summaryData.daysWithData} jours
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pointages</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className="text-2xl font-bold">{summaryData.totalRecords}</div>
                <div className="text-xs text-muted-foreground">
                  {summaryData.mostActiveDay && (
                    <span>Jour le plus actif: {formatDate(summaryData.mostActiveDay.date)}</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Arrivée moyenne</CardTitle>
                <ArrowDownRight className="h-4 w-4 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className="text-2xl font-bold">
                  {summaryData.earliestArrival?.time || 'N/A'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {summaryData.earliestArrival?.employee}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Départ moyen</CardTitle>
                <ArrowUpRight className="h-4 w-4 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className="text-2xl font-bold">
                  {summaryData.latestDeparture?.time || 'N/A'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {summaryData.latestDeparture?.employee}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="text-center py-8 border rounded-lg">
          <div className="mb-4">
            <Calendar className="h-12 w-12 mx-auto text-gray-400" />
          </div>
          <h3 className="text-lg font-medium mb-2">Aucune donnée disponible</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-md mx-auto">
            Aucune donnée de présence n&apos;est disponible pour le moment.
          </p>
        </div>
      )}
    </div>
  );
} 