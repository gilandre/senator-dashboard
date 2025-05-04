"use client";

import React from 'react';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend 
} from 'recharts';
import ChartCard from './chart-card';

export function DashboardCharts() {
  const hourlyData = [
    { hour: '00', count: 12 },
    { hour: '01', count: 8 },
    { hour: '02', count: 5 },
    { hour: '03', count: 2 },
    { hour: '04', count: 3 },
    { hour: '05', count: 7 },
    { hour: '06', count: 15 },
    { hour: '07', count: 25 },
    { hour: '08', count: 120 },
    { hour: '09', count: 85 },
    { hour: '10', count: 45 },
    { hour: '11', count: 30 },
    { hour: '12', count: 65 },
    { hour: '13', count: 70 },
    { hour: '14', count: 40 },
    { hour: '15', count: 35 },
    { hour: '16', count: 45 },
    { hour: '17', count: 100 },
    { hour: '18', count: 45 },
    { hour: '19', count: 25 },
    { hour: '20', count: 15 },
    { hour: '21', count: 10 },
    { hour: '22', count: 8 },
    { hour: '23', count: 5 },
  ];

  const dailyData = [
    { date: '01/06', count: 240 },
    { date: '02/06', count: 210 },
    { date: '03/06', count: 290 },
    { date: '04/06', count: 300 },
    { date: '05/06', count: 280 },
    { date: '06/06', count: 120 },
    { date: '07/06', count: 110 },
  ];

  const groupData = [
    { group: 'ADMINISTRATION', count: 125 },
    { group: 'FINANCE', count: 80 },
    { group: 'IT', count: 75 },
    { group: 'MARKETING', count: 60 },
    { group: 'RH', count: 40 },
  ];

  const readerData = [
    { reader: 'ENTREE PRINCIPALE', count: 180 },
    { reader: 'SORTIE PRINCIPALE', count: 160 },
    { reader: 'ENTREE PARKING', count: 120 },
    { reader: 'SORTIE PARKING', count: 110 },
    { reader: 'ASCENSEUR', count: 90 },
    { reader: 'SALLE DE REUNION', count: 75 },
    { reader: 'BUREAU DIRECTION', count: 40 },
    { reader: 'CAFETERIA', count: 100 },
    { reader: 'ARCHIVE', count: 25 },
    { reader: 'SERVEUR', count: 15 },
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ChartCard 
        title="Trafic par heure" 
        description="Nombre d'événements d'accès par heure de la journée"
      >
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
      
      <ChartCard 
        title="Activité quotidienne" 
        description="Nombre d'événements d'accès par jour"
      >
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="#93c5fd" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard 
        title="Top 5 des départements" 
        description="Départements avec le plus d'événements d'accès"
      >
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={groupData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
                nameKey="group"
                label={({ group, percent }) => `${group}: ${(percent * 100).toFixed(0)}%`}
              >
                {groupData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
      
      <ChartCard 
        title="Top 10 des points d'accès" 
        description="Points d'accès les plus utilisés"
      >
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={readerData}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="reader" width={150} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  );
} 