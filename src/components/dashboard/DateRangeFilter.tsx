'use client';

import React, { useCallback, useState, useEffect } from 'react';
import { DateFilter } from '@/services/dashboard-service';
import { format, subDays, isBefore, isAfter, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Button } from '@/components/ui/button';

interface DateFilterProps {
  onChange: (filter: DateFilter) => void;
}

export function DateRangeFilter({ onChange }: DateFilterProps) {
  // Initialiser le filtre avec les 7 derniers jours par défaut
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });

  // Obtenir la date minimum (2 mois avant aujourd'hui)
  const minDate = subMonths(new Date(), 2);

  // Mettre à jour le filtre quand la sélection change
  const handleDateChange = useCallback((range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      setDateRange(range);
      
      const newFilter = {
        startDate: format(range.from, 'yyyy-MM-dd'),
        endDate: format(range.to, 'yyyy-MM-dd')
      };
      
      console.log('Date range changed:', newFilter);
      
      // Propager le changement au composant parent
      onChange(newFilter);
    }
  }, [onChange]);

  // Initialiser le filtre au chargement du composant
  useEffect(() => {
    if (dateRange.from && dateRange.to) {
      const initialFilter = {
        startDate: format(dateRange.from, 'yyyy-MM-dd'),
        endDate: format(dateRange.to, 'yyyy-MM-dd')
      };
      
      console.log('Initial date range:', initialFilter);
      onChange(initialFilter);
    }
  }, []);

  // Fonction pour appliquer des dates modifiées
  const applyDateChange = (from: Date, to: Date) => {
    const newRange: DateRange = { from, to };
    setDateRange(newRange);
    
    const newFilter = {
      startDate: format(from, 'yyyy-MM-dd'),
      endDate: format(to, 'yyyy-MM-dd')
    };
    
    console.log('Applying date change:', newFilter);
    onChange(newFilter);
  };

  // Définir les préréglages de dates
  const setLast7Days = () => {
    const to = new Date();
    const from = subDays(to, 7);
    applyDateChange(from, to);
  };

  const setLast30Days = () => {
    const to = new Date();
    const from = subDays(to, 30);
    applyDateChange(from, to);
  };

  const setLast2Months = () => {
    const to = new Date();
    const from = subMonths(to, 2);
    applyDateChange(from, to);
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
      <DateRangePicker
        value={dateRange}
        onChange={handleDateChange}
      />
      
      <div className="flex flex-wrap gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={setLast7Days}
        >
          7 derniers jours
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={setLast30Days}
        >
          30 derniers jours
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={setLast2Months}
        >
          2 mois
        </Button>
      </div>
    </div>
  );
} 