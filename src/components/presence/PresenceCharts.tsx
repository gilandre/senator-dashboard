import React from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PresenceStats } from '@/types/presence';

interface PresenceChartsProps {
  stats: PresenceStats;
}

export function PresenceCharts({ stats }: PresenceChartsProps) {
  // Préparer les données pour le graphique des heures quotidiennes
  const dailyData = stats.daily.map(record => ({
    date: record.date,
    heures: record.totalHours,
    statut: record.status
  }));

  // Préparer les données pour le graphique des moyennes hebdomadaires
  const weeklyData = stats.weekly.map(week => ({
    semaine: week.day,
    moyenne: week.avgDuration,
    jours: week.count
  }));

  // Préparer les données pour le graphique des moyennes mensuelles
  const monthlyData = stats.monthly.map(month => ({
    mois: month.week,
    moyenne: month.avgDuration,
    jours: month.count
  }));

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Heures quotidiennes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="heures"
                  stroke="#2563eb"
                  name="Heures"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Moyennes hebdomadaires</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="semaine" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="moyenne"
                  fill="#2563eb"
                  name="Moyenne d'heures"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Moyennes mensuelles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mois" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="moyenne"
                  fill="#2563eb"
                  name="Moyenne d'heures"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 