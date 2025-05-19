'use client';

import { useState, useEffect } from 'react';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { addDays } from 'date-fns';
import { DateRange } from 'react-day-picker';
import AnomalyStatistics from '@/components/dashboard/AnomalyStatistics';
import AnomalyDailyChart from '@/components/dashboard/AnomalyDailyChart';
import AnomalyTypeChart from '@/components/dashboard/AnomalyTypeChart';
import RecentAnomalies from '@/components/dashboard/RecentAnomalies';
import AnomalyExportMenu from '@/components/dashboard/AnomalyExportMenu';
import { Skeleton } from '@/components/ui/skeleton';

export default function AnomaliesPage() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: undefined,
    to: undefined
  });

  // Fetch the max date from access logs when component mounts
  useEffect(() => {
    const fetchMaxDate = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/access-logs/max-date');
        
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des dates');
        }
        
        const data = await response.json();
        
        // Set date range: max date from logs to (max date - 14 days)
        const maxDate = new Date(data.maxDate);
        const startDate = addDays(maxDate, -14);
        
        setDateRange({
          from: startDate,
          to: maxDate
        });
      } catch (error) {
        console.error('Erreur:', error);
        // Fallback to default dates if API fails
        const today = new Date();
        setDateRange({
          from: addDays(today, -7),
          to: today
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchMaxDate();
  }, []);

  // Function to handle date range changes
  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (range) {
      setDateRange(range);
    }
  };

  // Format dates for API calls
  const formatDateForApi = (date: Date | undefined) => {
    if (!date) return undefined;
    return date.toISOString().split('T')[0];
  };

  const startDate = formatDateForApi(dateRange.from);
  const endDate = formatDateForApi(dateRange.to);

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-semibold">Rapport d'anomalies</h1>
            <Skeleton className="h-10 w-28" />
          </div>
          <Skeleton className="h-10 w-64" />
        </div>
        <Skeleton className="h-24 w-full mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
        <Skeleton className="h-96 w-full mb-6" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold">Rapport d'anomalies</h1>
          <AnomalyExportMenu startDate={startDate} endDate={endDate} />
        </div>
        <DateRangePicker 
          value={dateRange} 
          onChange={handleDateRangeChange} 
          align="end"
        />
      </div>

      <div className="mb-6">
        <AnomalyStatistics startDate={startDate} endDate={endDate} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <AnomalyDailyChart startDate={startDate} endDate={endDate} />
        <AnomalyTypeChart startDate={startDate} endDate={endDate} />
      </div>

      <div className="mb-6">
        <RecentAnomalies startDate={startDate} endDate={endDate} />
      </div>
    </div>
  );
} 