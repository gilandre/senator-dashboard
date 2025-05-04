'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { format, parseISO, isWeekend } from 'date-fns';
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
  Filter
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

// Interfaces
interface IEventDetail {
  badgeNumber: string;
  eventDate: string;
  eventType: string;
  readerName: string;
  _id: string;
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
  reader?: string;
  status?: string;
  isContinuousDay?: boolean;
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
  const [exporting, setExporting] = useState(false);
  const [attendanceData, setAttendanceData] = useState<IAttendanceRecord[]>([]);
  const [filteredData, setFilteredData] = useState<IAttendanceRecord[]>([]);
  const [employeeFilter, setEmployeeFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'name' | 'badge' | 'both'>('both');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });
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
  const [sortConfig, setSortConfig] = useState<{
    key: keyof IAttendanceRecord | '';
    direction: 'ascending' | 'descending';
  }>({ key: 'date', direction: 'descending' });

  // Functions for data fetching and manipulation
  const fetchAttendanceData = useCallback(async () => {
    if (!dateRange.from || !dateRange.to) return;

    setLoading(true);
    try {
      const response = await axios.get('/api/attendance', {
        params: {
          startDate: format(dateRange.from, 'yyyy-MM-dd'),
          endDate: format(dateRange.to, 'yyyy-MM-dd'),
        },
      });

      if (response.data && Array.isArray(response.data)) {
        setAttendanceData(response.data);
      } else {
        console.error('Invalid data format received', response.data);
        setAttendanceData([]);
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      setAttendanceData([]);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  // Handle refresh
  const handleRefresh = () => {
    fetchAttendanceData();
  };

  // Effect to fetch data on mount and when date range changes
  useEffect(() => {
    fetchAttendanceData();
  }, [fetchAttendanceData]);

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

    const totalHours = filteredData.reduce((acc, record) => acc + record.totalHours, 0);
    
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
      const exportData = filteredData.map(record => ({
        Date: format(new Date(record.date), 'dd/MM/yyyy'),
        Jour: format(new Date(record.date), 'EEEE', { locale: fr }),
        Badge: record.badgeNumber,
        Nom: record.lastName,
        Prénom: record.firstName,
        Arrivée: record.arrivalTime || 'N/A',
        Départ: record.departureTime || 'N/A',
        'Heures Totales': record.formattedTotalHours,
        Lecteur: record.reader || 'N/A',
        Statut: record.status || 'N/A',
        'Type de jour': record.isHoliday ? 'Férié' : (record.isWeekend ? 'Weekend' : (record.isContinuousDay ? 'Continue' : 'Normal'))
      }));

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
      const exportData = filteredData.map(record => ({
        date: format(new Date(record.date), 'dd/MM/yyyy'),
        weekday: format(new Date(record.date), 'EEEE', { locale: fr }),
        badgeNumber: record.badgeNumber,
        lastName: record.lastName,
        firstName: record.firstName,
        arrivalTime: record.arrivalTime || 'N/A',
        departureTime: record.departureTime || 'N/A',
        totalHours: record.formattedTotalHours,
        reader: record.reader || 'N/A',
        status: record.status || 'N/A',
        dayType: record.isHoliday ? 'Férié' : (record.isWeekend ? 'Weekend' : (record.isContinuousDay ? 'Continue' : 'Normal'))
      }));

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

  // Render JSX
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Suivi des heures de présence</CardTitle>
          <CardDescription>
            Visualisez et exportez les données de présence des employés
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            {/* Search and filter bar */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom ou numéro de badge..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <Select 
                value={filterType} 
                onValueChange={(value) => setFilterType(value as 'name' | 'badge' | 'both')}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Type de recherche" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Nom ou badge</SelectItem>
                  <SelectItem value="name">Nom uniquement</SelectItem>
                  <SelectItem value="badge">Badge uniquement</SelectItem>
                </SelectContent>
              </Select>
              
              <DateRangePicker
                value={dateRange}
                onChange={(newRange) => {
                  setDateRange(newRange || { from: undefined, to: undefined });
                }}
              />
              
              <Button 
                variant="outline" 
                size="icon"
                onClick={handleRefresh}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4" />
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" disabled={exporting || filteredData.length === 0}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Exporter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Format d'export</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={exportToCSV} disabled={exporting}>
                    <Download className="mr-2 h-4 w-4" />
                    Exporter en CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportToExcel} disabled={exporting}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Exporter en Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {/* Advanced filters */}
            {showFilters && (
              <Card className="p-4 border border-muted">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="show-weekends">Jours de weekend</Label>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="show-weekends"
                        checked={filterOptions.showWeekends}
                        onCheckedChange={(checked) =>
                          setFilterOptions({
                            ...filterOptions,
                            showWeekends: checked,
                          })
                        }
                      />
                      <Label htmlFor="show-weekends">Afficher</Label>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="show-holidays">Jours fériés</Label>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="show-holidays"
                        checked={filterOptions.showHolidays}
                        onCheckedChange={(checked) =>
                          setFilterOptions({
                            ...filterOptions,
                            showHolidays: checked,
                          })
                        }
                      />
                      <Label htmlFor="show-holidays">Afficher</Label>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="show-continuous">Jours de travail continu</Label>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="show-continuous"
                        checked={filterOptions.showContinuousDays}
                        onCheckedChange={(checked) =>
                          setFilterOptions({
                            ...filterOptions,
                            showContinuousDays: checked,
                          })
                        }
                      />
                      <Label htmlFor="show-continuous">Afficher</Label>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="min-hours">Heures minimum</Label>
                    <Input
                      id="min-hours"
                      type="number"
                      placeholder="Min"
                      min="0"
                      step="0.5"
                      value={filterOptions.minHours || ''}
                      onChange={(e) =>
                        setFilterOptions({
                          ...filterOptions,
                          minHours: e.target.value ? parseFloat(e.target.value) : null,
                        })
                      }
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="max-hours">Heures maximum</Label>
                    <Input
                      id="max-hours"
                      type="number"
                      placeholder="Max"
                      min="0"
                      step="0.5"
                      value={filterOptions.maxHours || ''}
                      onChange={(e) =>
                        setFilterOptions({
                          ...filterOptions,
                          maxHours: e.target.value ? parseFloat(e.target.value) : null,
                        })
                      }
                    />
                  </div>
                </div>
              </Card>
            )}
            
            {/* Loading state */}
            {loading && (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            )}
            
            {/* Statistics */}
            {!loading && filteredData.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="p-4 pb-2">
                    <CardDescription>Total des heures</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-2xl font-bold">{calculateStats().totalHours} h</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="p-4 pb-2">
                    <CardDescription>Moyenne quotidienne</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-2xl font-bold">{calculateStats().avgHours} h</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="p-4 pb-2">
                    <CardDescription>Nombre d'enregistrements</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-2xl font-bold">{calculateStats().recordCount}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="p-4 pb-2">
                    <CardDescription>Jours concernés</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-2xl font-bold">{calculateStats().daysCount}</div>
                  </CardContent>
                </Card>
              </div>
            )}
            
            {/* No results message */}
            {!loading && filteredData.length === 0 && (
              <div className="py-8 text-center">
                <p className="text-muted-foreground">Aucun résultat trouvé pour les critères sélectionnés.</p>
              </div>
            )}
            
            {/* Data table */}
            {!loading && filteredData.length > 0 && (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer" onClick={() => requestSort('date')}>
                        Date {sortConfig.key === 'date' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => requestSort('lastName')}>
                        Employé {sortConfig.key === 'lastName' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead className="text-right cursor-pointer" onClick={() => requestSort('arrivalTime')}>
                        Arrivée {sortConfig.key === 'arrivalTime' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead className="text-right cursor-pointer" onClick={() => requestSort('departureTime')}>
                        Départ {sortConfig.key === 'departureTime' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead className="text-right cursor-pointer" onClick={() => requestSort('totalHours')}>
                        Total {sortConfig.key === 'totalHours' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead>Lecteur</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Détails</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((record) => (
                      <TableRow 
                        key={record._id}
                        className={
                          record.isHoliday 
                            ? 'bg-red-50' 
                            : record.isWeekend 
                              ? 'bg-gray-50' 
                              : record.isContinuousDay 
                                ? 'bg-blue-50' 
                                : ''
                        }
                      >
                        <TableCell>
                          <div className="font-medium">
                            {format(new Date(record.date), 'dd/MM/yyyy')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(record.date), 'EEEE', { locale: fr })}
                            {record.isHoliday && (
                              <Badge variant="outline" className="ml-2 bg-red-100">
                                Férié
                              </Badge>
                            )}
                            {record.isWeekend && (
                              <Badge variant="outline" className="ml-2 bg-gray-100">
                                Weekend
                              </Badge>
                            )}
                            {record.isContinuousDay && (
                              <Badge variant="outline" className="ml-2 bg-blue-100">
                                Continue
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {record.firstName} {record.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {record.badgeNumber}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {record.arrivalTime || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {record.departureTime || '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {record.formattedTotalHours}
                        </TableCell>
                        <TableCell>
                          {record.reader || '-'}
                        </TableCell>
                        <TableCell>
                          {record.status && (
                            <Badge variant={record.status.includes('Incomplete') ? 'destructive' : 'default'}>
                              {record.status}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Dialog open={isDialogOpen && selectedRecord?._id === record._id} onOpenChange={(open: boolean) => {
                            setIsDialogOpen(open);
                            if (!open) setSelectedRecord(null);
                          }}>
                            <DialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  setSelectedRecord(record);
                                  setIsDialogOpen(true);
                                }}
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[525px]">
                              <DialogHeader>
                                <DialogTitle>Détails de présence</DialogTitle>
                                <DialogDescription>
                                  {selectedRecord && (
                                    <>
                                      <span className="font-medium">
                                        {selectedRecord.firstName} {selectedRecord.lastName}
                                      </span> - {format(new Date(selectedRecord.date), 'EEEE dd MMMM yyyy', { locale: fr })}
                                    </>
                                  )}
                                </DialogDescription>
                              </DialogHeader>
                              {selectedRecord && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-sm font-medium">Badge</p>
                                      <p className="text-sm">{selectedRecord.badgeNumber}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium">Total des heures</p>
                                      <p className="text-sm">{selectedRecord.formattedTotalHours}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium">Arrivée</p>
                                      <p className="text-sm">{selectedRecord.arrivalTime || '-'}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium">Départ</p>
                                      <p className="text-sm">{selectedRecord.departureTime || '-'}</p>
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <p className="text-sm font-medium mb-2">Événements</p>
                                    <div className="rounded-md border">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>Heure</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Lecteur</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {selectedRecord.events.map((event) => (
                                            <TableRow key={event._id}>
                                              <TableCell>
                                                {format(
                                                  new Date(event.eventDate),
                                                  'HH:mm:ss'
                                                )}
                                              </TableCell>
                                              <TableCell>
                                                {event.eventType === 'IN' ? 'Entrée' : 'Sortie'}
                                              </TableCell>
                                              <TableCell>{event.readerName}</TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-muted-foreground">
            {filteredData.length} enregistrements trouvés
          </div>
        </CardFooter>
      </Card>
    </div>
  );
} 