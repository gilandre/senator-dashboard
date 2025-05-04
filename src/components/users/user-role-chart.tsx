'use client';

import React, { useMemo } from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Card } from '@/components/ui/card';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

interface UserRoleChartProps {
  users: User[];
}

export default function UserRoleChart({ users }: UserRoleChartProps) {
  // Calculate role distribution
  const chartData = useMemo(() => {
    const roleCounts: Record<string, number> = {};
    
    // Count users by role
    users.forEach(user => {
      if (!roleCounts[user.role]) {
        roleCounts[user.role] = 0;
      }
      roleCounts[user.role]++;
    });
    
    // Format data for the chart
    return Object.entries(roleCounts).map(([role, count]) => {
      const roleLabel = 
        role === 'admin' ? 'Administrateur' :
        role === 'manager' ? 'Gestionnaire' :
        role === 'operator' ? 'Opérateur' :
        role === 'consultant' ? 'Consultant' : role;
      
      return {
        role: roleLabel,
        count: count,
        // Color based on role
        fill: 
          role === 'admin' ? '#ef4444' :
          role === 'manager' ? '#3b82f6' :
          role === 'operator' ? '#22c55e' :
          role === 'consultant' ? '#a855f7' : '#6b7280'
      };
    });
  }, [users]);

  if (users.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        Aucune donnée disponible
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="role" />
          <YAxis />
          <Tooltip
            formatter={(value) => [`${value} utilisateur(s)`, 'Nombre']}
            labelFormatter={(label) => `Rôle: ${label}`}
          />
          <Bar 
            dataKey="count" 
            fill="#8884d8" 
            radius={[4, 4, 0, 0]}
            barSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
} 