'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { format, parseISO, isWeekend, subWeeks, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  RefreshCw, 
  Calendar, 
  Clock, 
  User, 
  Search, 
  ChevronRight, 
  Download, 
  FileDown,
  FileSpreadsheet,
  Filter,
  Info
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";

// Interfaces
interface IEventDetail {
  badgeNumber: string;
  eventDate: string;
  eventType: string;
  readerName: string;
  _id: string;
  time?: string;
}

interface IAttendanceRecord {
  _id: string;
  badgeNumber: string;
  lastName: string;
  firstName: string;
  date: string;
  isHoliday: boolean;
  holidayName?: string;
  isWeekend: boolean;
  events: IEventDetail[];
  totalHours: number;
  formattedTotalHours: string;
  arrivalTime?: string;
  departureTime?: string;
  arrivalReader?: string;
  departureReader?: string;
  reader?: string;
  status?: string;
  isContinuousDay?: boolean;
  isHalfDay?: boolean;
  halfDayType?: 'morning' | 'afternoon';
  pauseMinutes?: number;
  lunchMinutes?: number;
}

interface FilterOptions {
  showWeekends: boolean;
  showHolidays: boolean;
  showContinuousDays: boolean;
  minHours: number | null;
  maxHours: number | null;
  searchType: 'name' | 'badge' | 'both';
}

// Component
export function EmployeeTimeTracker() {
  // State
  const [loading, setLoading] = useState(true);
  const [loadingDates, setLoadingDates] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [attendanceData, setAttendanceData] = useState<IAttendanceRecord[]>([]);
  const [filteredData, setFilteredData] = useState<IAttendanceRecord[]>([]);
  const [employeeFilter, setEmployeeFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'name' | 'badge' | 'both'>('both');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: undefined,
    to: undefined,
  });
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    showWeekends: true,
    showHolidays: true,
    showContinuousDays: true,
    minHours: null,
    maxHours: null,
    searchType: 'both'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<IAttendanceRecord | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [tempPauseMinutes, setTempPauseMinutes] = useState<{[key: string]: number}>({});
  const [tempLunchMinutes, setTempLunchMinutes] = useState<{[key: string]: number}>({});
  const [sortConfig, setSortConfig] = useState<{
    key: keyof IAttendanceRecord | '';
    direction: 'ascending' | 'descending';
  }>({ key: 'date', direction: 'descending' });
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState<IAttendanceRecord | null>(null);

  // Récupérer les paramètres de l'URL
  useEffect(() => {
    // Récupérer les paramètres de l'URL dans le navigateur (côté client)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const badgeParam = params.get('badge');
      
      if (badgeParam) {
        console.log("Badge trouvé dans l'URL:", badgeParam);
        setEmployeeFilter(badgeParam);
        // Mettre à jour également la requête de recherche pour l'afficher dans le champ
        setSearchQuery(badgeParam);
        setFilterType('badge');
      }
    }
  }, []);

  // Function to fetch max date from access logs
  const fetchDateLimits = useCallback(async () => {
    setLoadingDates(true);
    try {
      const response = await axios.get('/api/access-logs/max-date');
      
      if (response.data && response.data.maxDate) {
        const maxDate = new Date(response.data.maxDate);
        
        // Calculate start date (2 weeks before end date)
        const startDate = new Date(maxDate);
        startDate.setDate(startDate.getDate() - 14); // 2 weeks before
        
        console.log('Dates limites récupérées:', {
          maxDate: response.data.maxDate,
          calculatedStartDate: startDate.toISOString().split('T')[0]
        });
        
        // Update date range
        setDateRange({
          from: startDate,
          to: maxDate
        });
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des dates limites:', error);
      
      // Fallback to default dates
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 14); // 2 weeks ago
      
      setDateRange({
        from: startDate,
        to: endDate
      });
    } finally {
      setLoadingDates(false);
    }
  }, []);

  // Functions for data fetching and manipulation
  const fetchAttendanceData = useCallback(async () => {
    if (!dateRange.from || !dateRange.to) return;

    setLoading(true);
    try {
      // Formater les dates en YYYY-MM-DD
      const formattedStartDate = format(dateRange.from, 'yyyy-MM-dd');
      const formattedEndDate = format(dateRange.to, 'yyyy-MM-dd');

      console.log('Envoi des dates à l\'API:', { 
        formattedStartDate, 
        formattedEndDate,
        dateRange
      });

      const response = await axios.get('/api/attendance', {
        params: {
          startDate: formattedStartDate,
          endDate: formattedEndDate,
        },
      });

      // Afficher plus de détails sur la réponse pour le debugging
      console.log('Réponse de l\'API:', {
        status: response.status,
        dataLength: response.data?.length || 0,
        firstRecord: response.data?.length > 0 ? response.data[0] : null
      });

      // Gestion améliorée des réponses de l'API
      if (response.data && Array.isArray(response.data)) {
        setAttendanceData(response.data);
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        // Si l'API renvoie { data: [] }
        setAttendanceData(response.data.data);
      } else {
        console.error('Format de données invalide reçu:', response.data);
        setAttendanceData([]);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des données de présence:', error);
      setAttendanceData([]);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  // Handle refresh
  const handleRefresh = () => {
    fetchAttendanceData();
  };

  // Effect to fetch date limits on mount
  useEffect(() => {
    fetchDateLimits();
  }, [fetchDateLimits]);

  // Effect to fetch data when date range changes
  useEffect(() => {
    if (dateRange.from && dateRange.to) {
      fetchAttendanceData();
      setInitialDataLoaded(true);
    }
  }, [fetchAttendanceData, dateRange]);

  // Effect to filter data when employeeFilter or searchQuery changes
  useEffect(() => {
    if (!attendanceData) return;

    let filtered = [...attendanceData];

    // Apply date filters
    if (dateRange.from && dateRange.to) {
      filtered = filtered.filter((record) => {
        const recordDate = new Date(record.date);
        return recordDate >= dateRange.from! && recordDate <= dateRange.to!;
      });
    }

    // Apply weekend filter
    if (!filterOptions.showWeekends) {
      filtered = filtered.filter((record) => !record.isWeekend);
    }

    // Apply holiday filter
    if (!filterOptions.showHolidays) {
      filtered = filtered.filter((record) => !record.isHoliday);
    }

    // Apply continuous day filter
    if (!filterOptions.showContinuousDays) {
      filtered = filtered.filter((record) => !record.isContinuousDay);
    }

    // Apply hours filters
    if (filterOptions.minHours !== null) {
      filtered = filtered.filter((record) => record.totalHours >= filterOptions.minHours!);
    }
    if (filterOptions.maxHours !== null) {
      filtered = filtered.filter((record) => record.totalHours <= filterOptions.maxHours!);
    }

    // Apply employee filter
    if (employeeFilter) {
      filtered = filtered.filter((record) => record.badgeNumber === employeeFilter);
    }

    // Apply search query
    if (searchQuery.trim()) {
      filtered = filtered.filter((record) => {
        const searchLower = searchQuery.toLowerCase();
        
        if (filterType === 'name' || filterType === 'both') {
          const fullName = `${record.firstName} ${record.lastName}`.toLowerCase();
          if (fullName.includes(searchLower)) return true;
        }
        
        if (filterType === 'badge' || filterType === 'both') {
          if (record.badgeNumber.toLowerCase().includes(searchLower)) return true;
        }
        
        return false;
      });
    }

    // Apply sorting
    if (sortConfig.key !== '') {
      filtered.sort((a, b) => {
        const key = sortConfig.key as keyof IAttendanceRecord;
        const aValue = a[key];
        const bValue = b[key];
        
        if (aValue && bValue) {
          if (aValue < bValue) {
            return sortConfig.direction === 'ascending' ? -1 : 1;
          }
          if (aValue > bValue) {
            return sortConfig.direction === 'ascending' ? 1 : -1;
          }
        }
        return 0;
      });
    }

    setFilteredData(filtered);
  }, [attendanceData, employeeFilter, searchQuery, filterType, dateRange, filterOptions, sortConfig]);

  // Calculate statistics
  const calculateStats = () => {
    if (!filteredData.length) return { totalHours: 0, avgHours: 0, recordCount: 0, daysCount: 0 };

    const totalHours = filteredData.reduce((acc, record) => {
      // Calculer le total des heures en prenant en compte les pauses
      let recordHours = record.totalHours;
      
      // Si nous avons les données arrivalTime et departureTime, recalculer avec les pauses
      if (record.arrivalTime && record.departureTime) {
        try {
          // Convertir les heures en minutes
          const [arrivalHours, arrivalMinutes] = record.arrivalTime.split(':').map(Number);
          const [departureHours, departureMinutes] = record.departureTime.split(':').map(Number);
          
          const arrivalTotalMinutes = arrivalHours * 60 + arrivalMinutes;
          const departureTotalMinutes = departureHours * 60 + departureMinutes;
          
          // Calculer la différence en minutes en déduisant les pauses
          const totalMinutes = departureTotalMinutes - arrivalTotalMinutes;
          const pauseMinutes = record.pauseMinutes || 0;
          const lunchMinutes = record.lunchMinutes || 0;
          
          // Calculer les heures nettes
          const netMinutes = totalMinutes - pauseMinutes - lunchMinutes;
          
          // Convertir en heures décimales
          recordHours = netMinutes / 60;
        } catch (error) {
          console.error('Erreur de calcul des heures pour les statistiques:', error);
        }
      }
      
      return acc + recordHours;
    }, 0);
    
    // Count unique days
    const uniqueDays = new Set(filteredData.map(record => record.date)).size;
    
    // Count unique badges (employees)
    const uniqueBadges = new Set(filteredData.map(record => record.badgeNumber)).size;
    
    return {
      totalHours: parseFloat(totalHours.toFixed(2)),
      avgHours: parseFloat((totalHours / uniqueDays).toFixed(2)),
      recordCount: filteredData.length,
      daysCount: uniqueDays,
      employeeCount: uniqueBadges
    };
  };

  // Export functions
  const exportToCSV = () => {
    if (!filteredData.length || !dateRange.from || !dateRange.to) return;

    setExporting(true);
    try {
      const exportData = filteredData.map(record => {
        // Calculer le temps net (avec déduction des pauses)
        let netHours = record.totalHours;
        let formattedNetHours = record.formattedTotalHours;
        
        if (record.arrivalTime && record.departureTime) {
          try {
            // Convertir les heures en minutes
            const [arrivalHours, arrivalMinutes] = record.arrivalTime.split(':').map(Number);
            const [departureHours, departureMinutes] = record.departureTime.split(':').map(Number);
            
            const arrivalTotalMinutes = arrivalHours * 60 + arrivalMinutes;
            const departureTotalMinutes = departureHours * 60 + departureMinutes;
            
            // Calculer la différence en minutes en déduisant uniquement la pause déjeuner
            const totalMinutes = departureTotalMinutes - arrivalTotalMinutes;
            const lunchMinutes = record.lunchMinutes || 0;
            
            // Calculer les heures nettes
            const netMinutes = totalMinutes - lunchMinutes;
            
            // Convertir en heures et minutes formatées
            const hours = Math.floor(netMinutes / 60);
            const minutes = Math.floor(netMinutes % 60);
            formattedNetHours = `${hours}h${minutes.toString().padStart(2, '0')}`;
            
            // Heures décimales pour le calcul
            netHours = parseFloat((netMinutes / 60).toFixed(2));
          } catch (error) {
            console.error('Erreur de calcul des heures nettes pour l\'export:', error);
          }
        }
        
        return {
          Date: format(new Date(record.date), 'dd/MM/yyyy'),
          Jour: format(new Date(record.date), 'EEEE', { locale: fr }),
          Badge: record.badgeNumber,
          Nom: record.lastName,
          Prénom: record.firstName,
          Arrivée: record.arrivalTime || 'N/A',
          Départ: record.departureTime || 'N/A',
          'Pause Déjeuner (min)': record.lunchMinutes || 0,
          'Heures Brutes': record.formattedTotalHours,
          'Heures Nettes': formattedNetHours,
          'Lecteur Entrée': record.arrivalReader || 'N/A',
          'Lecteur Sortie': record.departureReader || 'N/A',
          Statut: record.status || 'N/A',
          'Type de jour': record.isHoliday 
            ? `Férié ${record.holidayName ? `(${record.holidayName})` : ''}` 
            : record.isWeekend 
              ? 'Weekend' 
              : record.isHalfDay 
                ? `Demi-journée ${record.halfDayType === 'morning' ? '(Matin)' : '(Après-midi)'}` 
                : record.isContinuousDay 
                  ? 'Continue' 
                  : 'Normal'
        };
      });

      const headers = Object.keys(exportData[0]).join(',');
      const csvData = exportData.map(row => 
        Object.values(row).map(value => 
          typeof value === 'string' && value.includes(',') ? `"${value}"` : value
        ).join(',')
      );

      const csvContent = [headers, ...csvData].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      const dateStr = `${format(dateRange.from, 'yyyyMMdd')}_${format(dateRange.to, 'yyyyMMdd')}`;
      const fileName = `export_presence_${dateStr}.csv`;
      
      // Avoid using navigator.msSaveBlob - not standard anymore
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting to CSV:', error);
    } finally {
      setExporting(false);
    }
  };

  const exportToExcel = async () => {
    if (!filteredData.length || !dateRange.from || !dateRange.to) return;

    setExporting(true);
    try {
      const exportData = filteredData.map(record => {
        // Calculer les heures brutes (sans déduction des pauses)
        let grossHours = record.totalHours;
        let formattedGrossHours = record.formattedTotalHours;
        
        // Calculer le temps net (avec déduction des pauses)
        let netHours = record.totalHours;
        let formattedNetHours = record.formattedTotalHours;
        
        if (record.arrivalTime && record.departureTime) {
          try {
            // Convertir les heures en minutes
            const [arrivalHours, arrivalMinutes] = record.arrivalTime.split(':').map(Number);
            const [departureHours, departureMinutes] = record.departureTime.split(':').map(Number);
            
            const arrivalTotalMinutes = arrivalHours * 60 + arrivalMinutes;
            const departureTotalMinutes = departureHours * 60 + departureMinutes;
            
            // Calculer la différence en minutes pour les heures brutes
            let totalMinutes = departureTotalMinutes - arrivalTotalMinutes;
            
            // Gérer le cas des journées continues (passage minuit)
            if (totalMinutes < 0 && record.isContinuousDay) {
              totalMinutes = (24 * 60 - arrivalTotalMinutes) + departureTotalMinutes;
            }
            
            // Calculer les heures brutes (sans déduction des pauses)
            const grossHoursValue = Math.floor(totalMinutes / 60);
            const grossMinutesValue = Math.floor(totalMinutes % 60);
            formattedGrossHours = `${grossHoursValue}h${grossMinutesValue.toString().padStart(2, '0')}`;
            
            // Heures brutes décimales
            grossHours = parseFloat((totalMinutes / 60).toFixed(2));
            
            // Pour les heures nettes, déduire la pause déjeuner
            const lunchMinutes = record.lunchMinutes || 0;
            const netMinutes = totalMinutes - lunchMinutes;
            
            // Convertir en heures et minutes formatées pour le net
            const netHoursValue = Math.floor(netMinutes / 60);
            const netMinutesValue = Math.floor(netMinutes % 60);
            formattedNetHours = `${netHoursValue}h${netMinutesValue.toString().padStart(2, '0')}`;
            
            // Heures nettes décimales
            netHours = parseFloat((netMinutes / 60).toFixed(2));
          } catch (error) {
            console.error('Erreur de calcul des heures pour l\'export:', error);
          }
        }
        
        // Déterminer le statut correct en fonction des informations disponibles
        let status = 'N/A';
        
        if (record.status) {
          // Utiliser le statut existant s'il est disponible
          status = record.status;
        } else if (record.isHoliday) {
          status = 'Férié';
        } else if (record.isWeekend) {
          status = 'Weekend';
        } else if (record.isHalfDay) {
          status = record.halfDayType === 'morning' ? 'Demi-journée (Matin)' : 'Demi-journée (Après-midi)';
        } else if (record.isContinuousDay) {
          status = 'Journée continue';
        } else if (record.arrivalTime && record.departureTime) {
          status = 'Présent';
        } else if (record.arrivalTime && !record.departureTime) {
          status = 'Entrée sans sortie';
        } else if (!record.arrivalTime && record.departureTime) {
          status = 'Sortie sans entrée';
        }
        
        return {
          date: format(new Date(record.date), 'dd/MM/yyyy'),
          weekday: format(new Date(record.date), 'EEEE', { locale: fr }),
          badgeNumber: record.badgeNumber,
          lastName: record.lastName,
          firstName: record.firstName,
          arrivalTime: record.arrivalTime || 'N/A',
          departureTime: record.departureTime || 'N/A',
          lunchBreakMinutes: record.lunchMinutes || 0,
          totalHoursGross: formattedGrossHours !== 'N/A' ? formattedGrossHours : 'N/A',
          totalHoursNet: formattedNetHours !== 'N/A' ? formattedNetHours : 'N/A',
          arrivalReader: record.arrivalReader || 'N/A',
          departureReader: record.departureReader || 'N/A',
          reader: record.reader || 'N/A',
          status: status,
          dayType: record.isHoliday 
            ? `Férié ${record.holidayName ? `(${record.holidayName})` : ''}` 
            : record.isWeekend 
              ? 'Weekend' 
              : record.isHalfDay 
                ? `Demi-journée ${record.halfDayType === 'morning' ? '(Matin)' : '(Après-midi)'}` 
                : record.isContinuousDay 
                  ? 'Continue' 
                  : 'Normal'
        };
      });

      const dateStr = `${format(dateRange.from, 'yyyyMMdd')}_${format(dateRange.to, 'yyyyMMdd')}`;
      const fileName = `export_presence_${dateStr}`;
      
      const response = await axios.post('/api/export/excel', {
        data: exportData,
        filename: fileName,
        sheetName: 'Données de présence',
        title: `Rapport de présence du ${format(dateRange.from, 'dd/MM/yyyy')} au ${format(dateRange.to, 'dd/MM/yyyy')}`
      }, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${fileName}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('Error exporting to Excel:', error);
    } finally {
      setExporting(false);
    }
  };

  // Handle sort
  const requestSort = (key: keyof IAttendanceRecord) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    
    setSortConfig({ key, direction });
  };

  // Render date picker with loading state
  const renderDatePicker = () => (
    <div className="flex items-center space-x-2">
      {loadingDates ? (
        <div className="flex items-center space-x-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      ) : (
        <>
          <DateRangePicker
            value={dateRange}
            onChange={(newDateRange) => {
              setDateRange(newDateRange || { from: undefined, to: undefined });
            }}
            className="w-auto"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </>
      )}
    </div>
  );

  // Ajouter une fonction pour gérer le clic sur une ligne
  const handleRowClick = (record: IAttendanceRecord) => {
    setDetailRecord(record);
    setIsDetailDialogOpen(true);
  };

  // Modifions la fonction de formatage des événements pour corriger l'affichage du type d'événement
  const formatEventsForDisplay = (events: IEventDetail[]) => {
    // Trier les événements par heure
    return events.sort((a, b) => {
      if (a.time && b.time) {
        return a.time.localeCompare(b.time);
      }
      return 0;
    }).map(event => {
      // Détecter si c'est une entrée ou sortie en fonction du lecteur
      let eventType = event.eventType;
      let isEntry = false;
      
      // Vérifier si le type est explicitement défini
      if (event.eventType.toLowerCase() === 'in' || event.eventType.toLowerCase() === 'entry') {
        isEntry = true;
      } else if (event.eventType.toLowerCase() === 'out' || event.eventType.toLowerCase() === 'exit') {
        isEntry = false;
      } else {
        // Analyser le nom du lecteur pour déterminer le type
        const readerName = event.readerName || '';
        if (readerName.toLowerCase().includes('entrée') || 
            readerName.toLowerCase().includes('entree') || 
            readerName.toLowerCase().includes('entrant') || 
            readerName.toLowerCase().includes('in') || 
            readerName.toLowerCase().includes('entry')) {
          isEntry = true;
        } else if (readerName.toLowerCase().includes('sortie') || 
                  readerName.toLowerCase().includes('sortant') || 
                  readerName.toLowerCase().includes('out') || 
                  readerName.toLowerCase().includes('exit')) {
          isEntry = false;
        } else {
          // Type inconnu
          eventType = 'UNKNOWN';
        }
      }
      
      // Retourner l'événement avec le type ajusté
      return {
        ...event,
        displayType: isEntry ? 'IN' : (eventType === 'UNKNOWN' ? 'UNKNOWN' : 'OUT')
      };
    });
  };

  // Pour le calcul du temps total, assurons-nous d'utiliser la même méthode que dans le tableau
  const calculateNetHours = (record: IAttendanceRecord) => {
    if (!record.arrivalTime || !record.departureTime) {
      return 'N/A';
    }

    try {
      // Convertir les heures en minutes
      const [arrivalHours, arrivalMinutes] = record.arrivalTime.split(':').map(Number);
      const [departureHours, departureMinutes] = record.departureTime.split(':').map(Number);
      
      const arrivalTotalMinutes = arrivalHours * 60 + arrivalMinutes;
      const departureTotalMinutes = departureHours * 60 + departureMinutes;
      
      // Calculer la différence en minutes
      let totalMinutes = departureTotalMinutes - arrivalTotalMinutes;
      
      // Gérer le cas des journées continues (passage minuit)
      if (totalMinutes < 0 && record.isContinuousDay) {
        totalMinutes = (24 * 60 - arrivalTotalMinutes) + departureTotalMinutes;
      } else if (totalMinutes < 0) {
        // Si négatif mais pas marqué comme journée continue, considérer comme une erreur
        return 'Erreur';
      }
      
      // Déduire uniquement la pause déjeuner
      const lunchMinutes = record.lunchMinutes || 0;
      const netMinutes = totalMinutes - lunchMinutes;
      
      if (netMinutes < 0) {
        return 'Erreur';
      }
      
      // Convertir en heures et minutes formatées
      const hours = Math.floor(netMinutes / 60);
      const minutes = Math.floor(netMinutes % 60);
      return `${hours}h${minutes.toString().padStart(2, '0')}`;
    } catch (error) {
      console.error('Erreur de calcul des heures nettes:', error);
      return 'Erreur';
    }
  };

  // Return the component
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Suivi des présences</h1>
          <p className="text-muted-foreground">
            Suivez les heures d'arrivée et de départ des employés
          </p>
        </div>
        
        {renderDatePicker()}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <CardTitle>Liste des présences</CardTitle>
              <CardDescription>
                {!initialDataLoaded || loading 
                  ? "Chargement des données..."
                  : `${filteredData.length} enregistrements trouvés pour la période sélectionnée`
                }
              </CardDescription>
            </div>
            
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Rechercher..."
                  className="pl-8 w-auto sm:w-[200px] lg:w-[300px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <Select
                value={filterType}
                onValueChange={(value) => setFilterType(value as 'name' | 'badge' | 'both')}
              >
                <SelectTrigger className="w-auto">
                  <SelectValue placeholder="Type de recherche" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Nom et badge</SelectItem>
                  <SelectItem value="name">Nom uniquement</SelectItem>
                  <SelectItem value="badge">Badge uniquement</SelectItem>
                </SelectContent>
              </Select>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <FileDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Exporter</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={exportToCSV} disabled={exporting}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    <span>Exporter en CSV</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportToExcel} disabled={exporting}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    <span>Exporter en Excel</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {/* Filtres avancés */}
        {showFilters && (
          <div className="px-6 py-2 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 my-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="showWeekends"
                  checked={filterOptions.showWeekends}
                  onCheckedChange={(checked) => setFilterOptions(prev => ({ ...prev, showWeekends: checked }))}
                />
                <Label htmlFor="showWeekends">Afficher les weekends</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="showHolidays"
                  checked={filterOptions.showHolidays}
                  onCheckedChange={(checked) => setFilterOptions(prev => ({ ...prev, showHolidays: checked }))}
                />
                <Label htmlFor="showHolidays">Afficher les jours fériés</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="showContinuousDays"
                  checked={filterOptions.showContinuousDays}
                  onCheckedChange={(checked) => setFilterOptions(prev => ({ ...prev, showContinuousDays: checked }))}
                />
                <Label htmlFor="showContinuousDays">Afficher les jours continus</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Label className="min-w-20">Heures min:</Label>
                <Input
                  type="number"
                  value={filterOptions.minHours !== null ? filterOptions.minHours : ''}
                  onChange={(e) => setFilterOptions(prev => ({ 
                    ...prev, 
                    minHours: e.target.value === '' ? null : parseFloat(e.target.value) 
                  }))}
                  className="max-w-20"
                  placeholder="Min"
                />
                <Label className="min-w-20 ml-2">Heures max:</Label>
                <Input
                  type="number"
                  value={filterOptions.maxHours !== null ? filterOptions.maxHours : ''}
                  onChange={(e) => setFilterOptions(prev => ({ 
                    ...prev, 
                    maxHours: e.target.value === '' ? null : parseFloat(e.target.value) 
                  }))}
                  className="max-w-20"
                  placeholder="Max"
                />
              </div>
            </div>
          </div>
        )}
        
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : filteredData.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">Aucune donnée trouvée pour la période sélectionnée</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="hover:bg-slate-100">
                    <TableHead onClick={() => requestSort('date')} className="cursor-pointer whitespace-nowrap font-semibold">
                      Date
                      {sortConfig.key === 'date' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'ascending' ? '↑' : '↓'}
                        </span>
                      )}
                    </TableHead>
                    <TableHead onClick={() => requestSort('badgeNumber')} className="cursor-pointer font-semibold">
                      Badge
                      {sortConfig.key === 'badgeNumber' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'ascending' ? '↑' : '↓'}
                        </span>
                      )}
                    </TableHead>
                    <TableHead onClick={() => requestSort('lastName')} className="cursor-pointer font-semibold">
                      Nom
                      {sortConfig.key === 'lastName' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'ascending' ? '↑' : '↓'}
                        </span>
                      )}
                    </TableHead>
                    <TableHead onClick={() => requestSort('firstName')} className="cursor-pointer font-semibold">
                      Prénom
                      {sortConfig.key === 'firstName' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'ascending' ? '↑' : '↓'}
                        </span>
                      )}
                    </TableHead>
                    <TableHead className="whitespace-nowrap font-semibold">Arrivée</TableHead>
                    <TableHead className="whitespace-nowrap font-semibold">Départ</TableHead>
                    <TableHead className="whitespace-nowrap font-semibold">Lecteur Entrée</TableHead>
                    <TableHead className="whitespace-nowrap font-semibold">Lecteur Sortie</TableHead>
                    <TableHead className="whitespace-nowrap font-semibold">
                      <div className="flex items-center gap-1">
                        Total
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-blue-500 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs p-4 bg-white shadow-lg rounded-lg border border-gray-200">
                              <div className="space-y-2">
                                <h4 className="font-medium text-blue-700">Calcul du temps de présence</h4>
                                <div className="p-2 bg-blue-50 rounded border border-blue-100">
                                  <p className="font-medium">Formule appliquée :</p>
                                  <p>Heure de départ - Heure d'arrivée - Pause déjeuner</p>
                                </div>
                                <p className="text-xs text-gray-500">Les durées des pauses et les types de journées (normale, demi-journée, férié, etc.) sont définis dans le module de configuration.</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableHead>
                    <TableHead className="whitespace-nowrap font-semibold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((record) => {
                    const isWeekend = record.isWeekend;
                    const isHoliday = record.isHoliday;
                    const isContinuousDay = record.isContinuousDay;
                    const isHalfDay = record.isHalfDay;
                    
                    return (
                      <TableRow 
                        key={record._id} 
                        className={cn(
                          "cursor-pointer transition-colors duration-200",
                          "hover:bg-blue-50",
                          isWeekend && "bg-gray-50/80",
                          isHoliday && "bg-orange-50/80",
                          isContinuousDay && "bg-blue-50/80",
                          isHalfDay && "bg-purple-50/80"
                        )}
                        onClick={() => handleRowClick(record)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span>{format(new Date(record.date), 'dd/MM/yyyy')}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(record.date), 'EEEE', { locale: fr })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{record.badgeNumber}</TableCell>
                        <TableCell>{record.lastName}</TableCell>
                        <TableCell>{record.firstName}</TableCell>
                        <TableCell className="text-green-700 font-medium">
                          {record.arrivalTime || 'N/A'}
                        </TableCell>
                        <TableCell className="text-red-700 font-medium">
                          {record.departureTime || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {record.arrivalReader || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {record.departureReader || 'N/A'}
                        </TableCell>
                        <TableCell className="font-semibold">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help">{calculateNetHours(record)}</span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Pause déjeuner: {record.lunchMinutes || 0} min</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Configuré dans les paramètres
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          {isHoliday ? (
                            <Badge variant="outline" className="bg-orange-100 text-orange-800 hover:bg-orange-100">
                              Férié {record.holidayName ? `(${record.holidayName})` : ''}
                            </Badge>
                          ) : isWeekend ? (
                            <Badge variant="outline" className="bg-gray-100 text-gray-800 hover:bg-gray-100">
                              Weekend
                            </Badge>
                          ) : isHalfDay ? (
                            <Badge variant="outline" className="bg-purple-100 text-purple-800 hover:bg-purple-100">
                              Demi-journée {record.halfDayType === 'morning' ? '(Matin)' : '(Après-midi)'}
                            </Badge>
                          ) : isContinuousDay ? (
                            <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                              Continue
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">
                              Normal
                            </Badge>
                          )}
                          <div className="text-xs text-muted-foreground mt-1 hidden md:block">
                            Config
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between border-t p-4">
          <div className="text-sm text-muted-foreground">
            {filteredData.length > 0 && (
              <>
                <div className="font-medium">Statistiques:</div>
                <div>Total heures: {calculateStats().totalHours}h</div>
                <div>Moyenne: {calculateStats().avgHours}h / jour</div>
                <div>Nombre de personnes: {calculateStats().employeeCount}</div>
              </>
            )}
          </div>
          
          {employeeFilter && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setEmployeeFilter(null)}
            >
              Réinitialiser le filtre employé
            </Button>
          )}
        </CardFooter>
      </Card>
      
      {/* Nouveau Modal de détails des entrées/sorties */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détails des entrées et sorties</DialogTitle>
            <DialogDescription>
              {detailRecord && (
                <div className="flex flex-col mt-2">
                  <div className="flex flex-wrap gap-2 justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Badge>{detailRecord.badgeNumber}</Badge>
                      <span className="font-semibold">{detailRecord.firstName} {detailRecord.lastName}</span>
                    </div>
                    <div>
                      <span className="font-medium">
                        {format(new Date(detailRecord.date), 'EEEE dd MMMM yyyy', { locale: fr })}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="bg-muted/30 p-3 rounded-md">
                      <h4 className="font-medium mb-2">Résumé de la journée</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>Arrivée:</div>
                        <div className="font-medium text-green-700">{detailRecord.arrivalTime || 'N/A'}</div>
                        
                        <div>Départ:</div>
                        <div className="font-medium text-red-700">{detailRecord.departureTime || 'N/A'}</div>
                        
                        <div>Lecteur entrée:</div>
                        <div className="font-medium">{detailRecord.arrivalReader || 'N/A'}</div>
                        
                        <div>Lecteur sortie:</div>
                        <div className="font-medium">{detailRecord.departureReader || 'N/A'}</div>
                        
                        <div>Temps total:</div>
                        <div className="font-medium">{calculateNetHours(detailRecord)}</div>
                        
                        <div>Pause déjeuner:</div>
                        <div className="font-medium">{detailRecord.lunchMinutes || 0} min</div>
                        
                        <div>Autres pauses:</div>
                        <div className="font-medium">{detailRecord.pauseMinutes || 0} min</div>
                        
                        <div>Type de jour:</div>
                        <div className="font-medium">
                          {detailRecord.isHoliday 
                            ? `Férié ${detailRecord.holidayName ? `(${detailRecord.holidayName})` : ''}` 
                            : detailRecord.isWeekend 
                              ? 'Weekend' 
                              : detailRecord.isHalfDay 
                                ? `Demi-journée ${detailRecord.halfDayType === 'morning' ? '(Matin)' : '(Après-midi)'}` 
                                : detailRecord.isContinuousDay 
                                  ? 'Continue' 
                                  : 'Normal'}
                          <div className="text-xs text-muted-foreground mt-1">
                            (Basé sur les paramètres du module de configuration)
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <Button 
                          size="sm"
                          onClick={() => setIsDetailDialogOpen(false)}
                        >
                          Fermer
                        </Button>
                      </div>
                    </div>
                    
                    <div className="bg-muted/30 p-3 rounded-md">
                      <h4 className="font-medium mb-2">Détail des pointages</h4>
                      {detailRecord.events && detailRecord.events.length > 0 ? (
                        <div className="overflow-auto max-h-[300px]">
                          <Table>
                            <TableHeader className="bg-slate-100">
                              <TableRow>
                                <TableHead>Heure</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Lecteur</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {formatEventsForDisplay(detailRecord.events).map((event, index) => (
                                <TableRow key={event._id || index} className="hover:bg-blue-50/50">
                                  <TableCell className={cn(
                                    event.displayType === 'IN' ? "text-green-700 font-medium" : 
                                    event.displayType === 'OUT' ? "text-red-700 font-medium" : "text-gray-700 font-medium"
                                  )}>
                                    {event.time}
                                  </TableCell>
                                  <TableCell>
                                    <Badge 
                                      variant={
                                        event.displayType === 'IN' ? 'default' : 
                                        event.displayType === 'OUT' ? 'destructive' : 'outline'
                                      }
                                      className={
                                        event.displayType === 'IN' ? 'bg-green-100 text-green-800' : 
                                        event.displayType === 'OUT' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                                      }
                                    >
                                      {event.displayType === 'IN' ? 'Entrée' : 
                                       event.displayType === 'OUT' ? 'Sortie' : 'Inconnu'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>{event.readerName || 'N/A'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="text-center py-4 text-muted-foreground">
                          Aucun détail d'entrée/sortie disponible
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
      
      <Toaster />
    </div>
  );
} 