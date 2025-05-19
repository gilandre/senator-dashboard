import React, { ReactNode } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";

interface StatsCardProps {
  title: string;
  value: number;
  icon: ReactNode;
  description: string;
  trend?: {
    value: number;
    label: string;
    direction: 'up' | 'down';
  };
}

export default function StatsCard({ title, value, icon, description, trend }: StatsCardProps) {
  // Formater le nombre avec des séparateurs de milliers
  const formattedValue = value.toLocaleString();
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formattedValue}</div>
        <CardDescription className="text-xs text-muted-foreground">
          {description}
        </CardDescription>
        
        {trend && (
          <div className="mt-2 flex items-center text-xs">
            <span 
              className={
                trend.direction === 'up' 
                  ? 'text-red-500' 
                  : 'text-green-500'
              }
            >
              {trend.direction === 'up' ? '↑' : '↓'} {trend.value}%
            </span>
            <span className="ml-1 text-muted-foreground">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 