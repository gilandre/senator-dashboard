"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import ChartCard from './chart-card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type PresenceData = {
  dailyData?: {
    date: string;
    totalHours: number;
    employeeCount: number;
    averageHours: number;
  }[];
  weeklyData?: {
    weekId: string;
    weekLabel: string;
    totalHours: number;
    employeeCount: number;
    averageHours: number;
  }[];
  monthlyData?: {
    monthId: string;
    monthLabel: string;
    totalHours: number;
    employeeCount: number;
    averageHours: number;
  }[];
  yearlyData?: {
    year: string;
    totalHours: number;
    employeeCount: number;
    averageHours: number;
  }[];
};

type PresenceChartProps = {
  data: PresenceData;
};

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

function formatWeekRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return `${startDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} - ${endDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

export function PresenceTimeChart({ data }: PresenceChartProps) {
  const router = useRouter();
  const [displayMode, setDisplayMode] = useState<'total' | 'average'>('average');
  
  // Formatter pour les tooltips
  const formatTooltip = (value: number, mode: 'total' | 'average') => {
    return `${value.toFixed(1)} heures ${mode === 'average' ? 'en moyenne' : 'au total'}`;
  };

  // Préparation des données pour l'affichage
  const formattedDailyData = data.dailyData?.map(day => ({
    ...day,
    label: formatDate(day.date),
    totalHoursFormatted: day.totalHours.toFixed(1),
    averageHoursFormatted: day.averageHours.toFixed(1),
  }));

  const formattedWeeklyData = data.weeklyData?.map(week => ({
    ...week,
    label: week.weekLabel,
    totalHoursFormatted: week.totalHours.toFixed(1),
    averageHoursFormatted: week.averageHours.toFixed(1),
  }));

  const formattedMonthlyData = data.monthlyData?.map(month => ({
    ...month,
    label: month.monthLabel,
    totalHoursFormatted: month.totalHours.toFixed(1),
    averageHoursFormatted: month.averageHours.toFixed(1),
  }));

  const formattedYearlyData = data.yearlyData?.map(year => ({
    ...year,
    label: year.year,
    totalHoursFormatted: year.totalHours.toFixed(1),
    averageHoursFormatted: year.averageHours.toFixed(1),
  }));

  // Définir les couleurs pour les graphiques
  const totalHoursColor = "#3b82f6"; // Bleu
  const averageHoursColor = "#10b981"; // Vert

  // Gérer le clic sur une barre
  const handleBarClick = (data: any) => {
    // Rediriger vers la page de détails des rapports
    router.push('/reports/presence-report');
  };

  return (
    <ChartCard
      title="Heures de présence"
      description="Analyse des heures de présence par période"
      action={
        <div className="flex space-x-2">
          <Button 
            variant={displayMode === 'average' ? "default" : "outline"} 
            size="sm"
            onClick={() => setDisplayMode('average')}
          >
            Moyenne
          </Button>
          <Button 
            variant={displayMode === 'total' ? "default" : "outline"} 
            size="sm"
            onClick={() => setDisplayMode('total')}
          >
            Total
          </Button>
        </div>
      }
    >
      <Tabs defaultValue="daily" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="daily">Jour</TabsTrigger>
          <TabsTrigger value="weekly">Semaine</TabsTrigger>
          <TabsTrigger value="monthly">Mois</TabsTrigger>
          <TabsTrigger value="yearly">Année</TabsTrigger>
        </TabsList>
        
        <TabsContent value="daily" className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={formattedDailyData}
              onClick={handleBarClick}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip 
                formatter={(value: number) => formatTooltip(value, displayMode)}
                labelFormatter={(label) => `Jour: ${label}`}
              />
              <Legend />
              {displayMode === 'total' ? (
                <Bar 
                  name="Heures totales" 
                  dataKey="totalHours" 
                  fill={totalHoursColor}
                  cursor="pointer"
                />
              ) : (
                <Bar 
                  name="Heures moyennes par employé" 
                  dataKey="averageHours" 
                  fill={averageHoursColor}
                  cursor="pointer"
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </TabsContent>
        
        <TabsContent value="weekly" className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={formattedWeeklyData}
              onClick={handleBarClick}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip 
                formatter={(value: number) => formatTooltip(value, displayMode)}
                labelFormatter={(label) => `Semaine: ${label}`}
              />
              <Legend />
              {displayMode === 'total' ? (
                <Bar 
                  name="Heures totales" 
                  dataKey="totalHours" 
                  fill={totalHoursColor}
                  cursor="pointer"
                />
              ) : (
                <Bar 
                  name="Heures moyennes par employé" 
                  dataKey="averageHours" 
                  fill={averageHoursColor}
                  cursor="pointer"
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </TabsContent>
        
        <TabsContent value="monthly" className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={formattedMonthlyData}
              onClick={handleBarClick}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip 
                formatter={(value: number) => formatTooltip(value, displayMode)}
                labelFormatter={(label) => `Mois: ${label}`}
              />
              <Legend />
              {displayMode === 'total' ? (
                <Bar 
                  name="Heures totales" 
                  dataKey="totalHours" 
                  fill={totalHoursColor}
                  cursor="pointer"
                />
              ) : (
                <Bar 
                  name="Heures moyennes par employé" 
                  dataKey="averageHours" 
                  fill={averageHoursColor}
                  cursor="pointer"
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </TabsContent>
        
        <TabsContent value="yearly" className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={formattedYearlyData}
              onClick={handleBarClick}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip 
                formatter={(value: number) => formatTooltip(value, displayMode)}
                labelFormatter={(label) => `Année: ${label}`}
              />
              <Legend />
              {displayMode === 'total' ? (
                <Bar 
                  name="Heures totales" 
                  dataKey="totalHours" 
                  fill={totalHoursColor}
                  cursor="pointer"
                />
              ) : (
                <Bar 
                  name="Heures moyennes par employé" 
                  dataKey="averageHours" 
                  fill={averageHoursColor}
                  cursor="pointer"
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </TabsContent>
      </Tabs>
    </ChartCard>
  );
} 