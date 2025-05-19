'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Calendar, Filter, Download, ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fr } from 'date-fns/locale';
import { format } from 'date-fns';
import DailyPresenceReport from '@/components/reports/DailyPresenceReport';

export default function DailyPresenceReportPage() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  
  // Liste des départements
  const departments = [
    "IT",
    "Finance",
    "RH",
    "Marketing",
    "Direction",
    "Juridique",
    "R&D"
  ];

  // Gérer l'exportation du rapport
  const handleExport = () => {
    // Logique d'exportation (PDF ou autre format)
    window.print();
  };

  return (
    <div className="space-y-6 print:p-0 print:m-0">
      {/* Entête avec filtres et actions - masqué lors de l'impression */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={() => router.push('/reports')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <h1 className="text-2xl font-bold">Rapport de Présence Journalier</h1>
        </div>
        <div className="flex space-x-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Calendar className="h-4 w-4 mr-2" />
                {format(selectedDate, 'dd MMMM yyyy', { locale: fr })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                locale={fr}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          
          <Select 
            value={selectedDepartment || undefined} 
            onValueChange={setSelectedDepartment}
          >
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Tous les départements" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tous les départements</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Rapport de présence */}
      <DailyPresenceReport
        date={selectedDate}
        department={selectedDepartment || undefined}
      />
    </div>
  );
} 