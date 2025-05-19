'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calendar, Filter, Download, ArrowLeft, RefreshCw, FileText, FileSpreadsheet, FileArchive
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PresenceTimeChart } from '@/components/dashboard/presence-time-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, subDays, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DateRange } from "react-day-picker";
import { DateRangePicker } from '@/components/ui/date-range-picker';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { calculatePresenceStats, formatHours, formatPercentage } from '@/lib/utils/presence-calculations';

export default function PresenceReportPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [period, setPeriod] = useState('daily');
  
  // États pour les filtres
  const [dateRange, setDateRange] = useState<DateRange>({
    from: undefined,
    to: undefined,
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  
  // Filtres
  const [filters, setFilters] = useState({
    groupe: 'all',
    personType: 'all',
    minHours: 0,
    maxHours: 24,
    includeAnomalies: true
  });
  
  // Liste des groupes disponibles
  const [availableGroups, setAvailableGroups] = useState<{id: number, name: string}[]>([]);
  
  // Export
  const [exportFormat, setExportFormat] = useState('pdf');

  // Récupérer les groupes disponibles
  useEffect(() => {
    async function fetchGroups() {
      try {
        const response = await fetch('/api/group-names');
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des groupes');
        }
        
        const groups = await response.json();
        setAvailableGroups(groups);
      } catch (error) {
        console.error('Error fetching groups:', error);
      }
    }
    
    fetchGroups();
  }, []);

  // Récupérer la date maximale des données et initialiser la plage de dates
  useEffect(() => {
    async function initDateRange() {
      try {
        setIsLoading(true);
        
        // Récupérer la date maximale des logs d'accès
        const response = await fetch('/api/access-data?getMaxDate=true');
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération de la date maximale');
        }
        
        const data = await response.json();
        const maxDate = data.maxDate ? new Date(data.maxDate) : new Date();
        const startDate = subDays(maxDate, 14); // 2 semaines avant la date max
        
        setDateRange({
          from: startDate,
          to: maxDate
        });
        
        console.log('Initialisation avec dates:', { 
          start: format(startDate, 'yyyy-MM-dd'), 
          end: format(maxDate, 'yyyy-MM-dd') 
        });
        
        // Une fois les dates initialisées, chargement des données
        await fetchData(startDate, maxDate);
      } catch (error) {
        console.error('Error initializing date range:', error);
        toast.error("Erreur lors de l'initialisation des dates");
        
        // En cas d'erreur, utiliser les dates par défaut et charger les données
        const endDate = new Date();
        const startDate = subDays(endDate, 14);
        fetchData(startDate, endDate);
      } finally {
        setIsLoading(false);
      }
    }
    
    initDateRange();
  }, []);

  // Fonction pour charger les données avec les filtres actuels
  async function fetchData(start = dateRange.from, end = dateRange.to) {
    try {
      setIsLoading(true);
      
      // Construire l'URL avec les filtres
      const params = new URLSearchParams();
      if (start) params.append('startDate', format(start, 'yyyy-MM-dd'));
      if (end) params.append('endDate', format(end, 'yyyy-MM-dd'));
      
      // Ajouter les filtres spécifiques pour l'API de présence
      if (filters.personType !== 'all') params.append('personType', filters.personType);
      if (filters.groupe !== 'all') params.append('department', filters.groupe);
      
      // Filtre pour inclure ou exclure les anomalies (basé sur event_type)
      if (!filters.includeAnomalies) {
        params.append('eventType', 'user_accepted');
      }
      
      // Utiliser l'API /api/presence
      const url = `/api/presence?${params.toString()}`;
      console.log('Fetching data from:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch presence data');
      }
      
      const jsonData = await response.json();
      console.log('Fetched presence data:', jsonData);
      
      // Vérifier si les données sont vides
      const hasData = 
        jsonData && 
        ((jsonData.daily && jsonData.daily.length > 0) || 
         (jsonData.weekly && jsonData.weekly.length > 0) || 
         (jsonData.monthly && jsonData.monthly.length > 0) || 
         (jsonData.yearly && jsonData.yearly.length > 0));
         
      if (!hasData) {
        toast.warning("Aucune donnée trouvée pour les critères sélectionnés");
        // Initialiser à un objet avec des tableaux vides mais une structure valide
        setData({
          daily: [],
          weekly: [],
          monthly: [],
          yearly: [],
          employeeStats: [],
          detailedLogs: [],
          summary: {
            totalEmployees: 0,
            totalDays: 0,
            avgDailyHours: 0,
            totalHours: 0,
            avgEmployeePerDay: 0
          }
        });
      } else {
        setData(jsonData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error("Erreur lors du chargement des données");
      // En cas d'erreur, initialiser data à un objet vide avec des tableaux vides
      setData({
        daily: [],
        weekly: [],
        monthly: [],
        yearly: [],
        employeeStats: [],
        detailedLogs: [],
        summary: {
          totalEmployees: 0,
          totalDays: 0,
          avgDailyHours: 0,
          totalHours: 0,
          avgEmployeePerDay: 0
        }
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Appliquer les filtres et recharger les données
  const applyFilters = () => {
    setShowFilterDialog(false);
    fetchData();
    toast.success("Filtres appliqués avec succès");
  };
  
  // Gérer l'exportation du rapport
  const handleExport = async () => {
    setIsLoading(true);
    setShowExportDialog(false);
    
    try {
      if (exportFormat === 'pdf') {
        // Utiliser la nouvelle API spécifique pour le PDF basé sur HTML
        const response = await fetch('/api/export/pdf', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-test-bypass-auth': 'admin' // Pour le développement uniquement
          },
          body: JSON.stringify({
            data,
            dateRange
          })
        });
        
        if (!response.ok) {
          throw new Error(`Erreur lors de l'exportation: ${response.status}`);
        }
        
        // Récupérer le blob du rapport exporté
        const blob = await response.blob();
        
        // Créer un URL pour le téléchargement
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rapport_presence_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        
        // Nettoyer
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast.success(`Rapport exporté en format PDF`);
      } else {
        // Pour les autres formats, utiliser l'API existante
        const response = await fetch('/api/export/report', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-test-bypass-auth': 'admin' // Pour le développement uniquement
          },
          body: JSON.stringify({
            format: exportFormat,
            data,
            dateRange,
            filters,
            options: {
              includeCharts: true,
              includeDetails: true,
              includeRecommendations: true,
              netStatistics: true
            }
          })
        });
        
        if (!response.ok) {
          throw new Error(`Erreur lors de l'exportation: ${response.status}`);
        }
        
        // Récupérer le blob du rapport exporté
        const blob = await response.blob();
        
        // Créer un URL pour le téléchargement
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Nommer le fichier en fonction du format
        const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
        let extension = exportFormat;
        
        a.download = `rapport_presence_${dateStr}.${extension}`;
        document.body.appendChild(a);
        a.click();
        
        // Nettoyer
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast.success(`Rapport exporté en format ${exportFormat.toUpperCase()}`);
      }
    } catch (error) {
      console.error('Erreur lors de l\'exportation:', error);
      toast.error(`Erreur lors de l'exportation: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Formatage des dates selon la locale française
  function formatDate(dateStr: string) {
    return format(new Date(dateStr), 'dd MMMM yyyy', { locale: fr });
  }

  function formatWeekRange(start: string, end: string) {
    return `${format(new Date(start), 'dd MMM', { locale: fr })} - ${format(new Date(end), 'dd MMM yyyy', { locale: fr })}`;
  }

  function formatMonth(monthStr: string) {
    const [year, month] = monthStr.split('-');
    return format(new Date(parseInt(year), parseInt(month) - 1, 1), 'MMMM yyyy', { locale: fr });
  }

  // Préparation des données pour l'affichage avec vérification de nullité
  const tableData = data && data[period] ? data[period] : [];

  // Appliquer les filtres lorsque la période de date change
  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      setDateRange(range);
      setShowDatePicker(false);
      
      // Recharger les données avec la nouvelle plage de dates
      fetchData(range.from, range.to);
    }
  };

  // Fonctions utilitaires pour les KPIs améliorés
  function calculateTrend(dailyData) {
    if (!dailyData || dailyData.length < 2) return "Données insuffisantes pour analyser la tendance";
    
    // Diviser les données en deux moitiés et comparer les moyennes
    const midpoint = Math.floor(dailyData.length / 2);
    const firstHalf = dailyData.slice(0, midpoint);
    const secondHalf = dailyData.slice(midpoint);
    
    const firstHalfAvg = firstHalf.reduce((sum, day) => sum + (day?.duration || 0), 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, day) => sum + (day?.duration || 0), 0) / secondHalf.length;
    
    const percentChange = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
    
    if (Math.abs(percentChange) < 5) {
      return "Tendance stable sur la période";
    } else if (percentChange > 0) {
      return `Tendance à la hausse (+${percentChange.toFixed(1)}%)`;
    } else {
      return `Tendance à la baisse (${percentChange.toFixed(1)}%)`;
    }
  }
  
  function calculateAverageHoursPerEmployee(dailyData) {
    if (!dailyData || dailyData.length === 0) return "0 h";
    
    let totalEmployeeHours = 0;
    let totalEmployeeCount = 0;
    
    dailyData.forEach(day => {
      if (day?.count && day?.duration) {
        totalEmployeeHours += day.duration;
        totalEmployeeCount += day.count;
      }
    });
    
    if (totalEmployeeCount === 0) return "0 h";
    return ((totalEmployeeHours / 60) / totalEmployeeCount).toFixed(1) + " h";
  }
  
  function calculateMaxHoursPerDay(dailyData) {
    if (!dailyData || dailyData.length === 0) return "0 h";
    
    const maxHoursDay = dailyData.reduce((max, day) => {
      const hours = (day?.duration || 0) / 60;
      return hours > max ? hours : max;
    }, 0);
    
    return maxHoursDay.toFixed(1) + " h";
  }
  
  function calculateMostActiveDay(dailyData) {
    if (!dailyData || dailyData.length === 0) return "Aucune donnée";
    
    const mostActiveDay = dailyData.reduce((max, day) => {
      if (!max || (day?.count || 0) > (max.count || 0)) {
        return day;
      }
      return max;
    }, null);
    
    if (!mostActiveDay || !mostActiveDay.date) return "Aucune donnée";
    
    return format(new Date(mostActiveDay.date), 'dd MMM yyyy', { locale: fr });
  }

  // Remplacer les fonctions de calcul par l'utilisation de calculatePresenceStats
  const stats = data ? calculatePresenceStats(data, null, filters.includeAnomalies) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={() => router.push('/reports')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <h1 className="text-2xl font-bold">Rapport de temps de présence</h1>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={() => fetchData()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          
          {/* Sélecteur de période */}
          <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Calendar className="h-4 w-4 mr-2" />
                Période
                {dateRange.from && dateRange.to && (
                  <span className="ml-2 text-xs">
                    {format(dateRange.from, 'dd/MM/yyyy')} - {format(dateRange.to, 'dd/MM/yyyy')}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <DateRangePicker
                value={dateRange}
                onChange={handleDateRangeChange}
              />
            </PopoverContent>
          </Popover>
          
          {/* Dialog de filtre */}
          <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filtrer
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Filtrer les données</DialogTitle>
                <DialogDescription>
                  Définissez les critères de filtrage pour le rapport.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="personType" className="text-right">
                    Type
                  </Label>
                  <Select 
                    value={filters.personType} 
                    onValueChange={(value) => setFilters({...filters, personType: value})}
                  >
                    <SelectTrigger id="personType" className="col-span-3">
                      <SelectValue placeholder="Type de personnel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="employee">Employés</SelectItem>
                      <SelectItem value="visitor">Visiteurs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="groupe" className="text-right">
                    Groupe
                  </Label>
                  <Select 
                    value={filters.groupe} 
                    onValueChange={(value) => setFilters({...filters, groupe: value})}
                  >
                    <SelectTrigger id="groupe" className="col-span-3">
                      <SelectValue placeholder="Tous les groupes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les groupes</SelectItem>
                      {availableGroups.map(group => (
                        <SelectItem key={group.id} value={group.name}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="hours" className="text-right">
                    Heures
                  </Label>
                  <div className="col-span-3 flex items-center space-x-2">
                    <input 
                      type="number" 
                      min="0" 
                      max="24" 
                      value={filters.minHours} 
                      onChange={(e) => setFilters({...filters, minHours: parseFloat(e.target.value)})}
                      className="w-16 rounded-md border border-input px-3 py-1"
                      aria-label="Heures minimum"
                    />
                    <span>-</span>
                    <input 
                      type="number" 
                      min="0" 
                      max="24" 
                      value={filters.maxHours} 
                      onChange={(e) => setFilters({...filters, maxHours: parseFloat(e.target.value)})}
                      className="w-16 rounded-md border border-input px-3 py-1"
                      aria-label="Heures maximum"
                    />
                    <span>heures</span>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <div className="col-span-4 flex items-center space-x-2">
                    <Checkbox 
                      id="include-anomalies" 
                      checked={filters.includeAnomalies}
                      onCheckedChange={(checked) => 
                        setFilters({...filters, includeAnomalies: checked === true})}
                    />
                    <Label htmlFor="include-anomalies">Inclure les anomalies</Label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" onClick={applyFilters}>Appliquer les filtres</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {/* Dialog d'export */}
          <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exporter
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Exporter le rapport</DialogTitle>
                <DialogDescription>
                  Choisissez le format d'exportation.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="format" className="text-right">
                    Format
                  </Label>
                  <Select 
                    value={exportFormat} 
                    onValueChange={setExportFormat}
                  >
                    <SelectTrigger id="format" className="col-span-3">
                      <SelectValue placeholder="Choisir un format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                      <SelectItem value="csv">CSV (données brutes)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" onClick={handleExport}>Exporter</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="mt-4 text-gray-500 dark:text-gray-400">Chargement des données...</p>
          </div>
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Graphique des heures de présence avec adaptation des données */}
          <PresenceTimeChart data={{
            dailyData: data?.daily ? data.daily.map(day => ({
              date: day.date || '',
              totalHours: (day.duration || 0) / 60,
              employeeCount: day.count || 1,
              averageHours: (day.duration || 0) / 60 / (day.count || 1)
            })) : [],
            weeklyData: data?.weekly ? data.weekly.map(week => {
              // Extraire uniquement le numéro de semaine si au format "Semaine XX"
              const weekNum = week.day?.includes('Semaine') 
                ? week.day.replace('Semaine ', '')
                : week.day;

              return {
                // Stocker uniquement l'identifiant de semaine, le graphique le formatera correctement
                weekId: weekNum || '',
                // La période sera affichée comme "Semaine XX" ou la valeur directe
                weekLabel: week.day || `Semaine ${weekNum}`,
                totalHours: (week.avgDuration || 0) / 60,
                employeeCount: week.count || 1,
                averageHours: (week.avgDuration || 0) / 60
              };
            }) : [],
            monthlyData: data?.monthly ? data.monthly.map(month => {
              return {
                // Stocker la valeur du mois directement
                monthId: month.week || '',
                // Utiliser directement le nom du mois tel qu'il vient de l'API
                monthLabel: month.week || '',
                totalHours: (month.avgDuration || 0) / 60,
                employeeCount: month.count || 1,
                averageHours: (month.avgDuration || 0) / 60
              };
            }) : [],
            yearlyData: data?.yearly ? data.yearly.map(year => ({
              year: year.month || '',
              totalHours: (year.avgDuration || 0) / 60,
              employeeCount: year.count || 1,
              averageHours: (year.avgDuration || 0) / 60
            })) : []
          }} />
          
          {/* Tableau détaillé */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Données détaillées</span>
                <Tabs value={period} onValueChange={setPeriod} className="w-auto">
                  <TabsList>
                    <TabsTrigger value="daily">Jour</TabsTrigger>
                    <TabsTrigger value="weekly">Semaine</TabsTrigger>
                    <TabsTrigger value="monthly">Mois</TabsTrigger>
                    <TabsTrigger value="yearly">Année</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Période</TableHead>
                    <TableHead className="text-right">Heures totales</TableHead>
                    <TableHead className="text-right">Employés</TableHead>
                    <TableHead className="text-right">Heures moyennes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableData && tableData.length > 0 ? (
                    tableData.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {period === 'daily' && (item?.date ? formatDate(item.date) : '-')}
                          {period === 'weekly' && (item?.day || '-')}
                          {period === 'monthly' && (item?.week || '-')}
                          {period === 'yearly' && (item?.month || '-')}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatHours(period === 'daily' 
                            ? (item?.duration || 0) / 60
                            : (item?.avgDuration || 0) / 60)}
                        </TableCell>
                        <TableCell className="text-right">
                          {item?.count || 0}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatHours(period === 'daily' 
                            ? (item?.duration && item?.count ? (item.duration / 60) / item.count : 0)
                            : (item?.avgDuration || 0) / 60)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4">
                        Aucune donnée disponible pour cette période
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Résumé statistique avec les nouvelles fonctions de calcul */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Résumé</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Jours analysés</dt>
                    <dd className="font-medium">{stats?.totalDays || 0}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Employés maximum</dt>
                    <dd className="font-medium">{stats?.maxEmployees || 0}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Taux de présence</dt>
                    <dd className="font-medium">{formatPercentage(stats?.presenceRate || 0)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Durée totale</dt>
                    <dd className="font-medium">{formatHours(stats?.totalHours || 0)}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Temps moyen journalier</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">
                  {formatHours(stats?.avgHoursPerDay || 0)}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Moyenne quotidienne calculée sur {stats?.totalDays || 0} jours
                </p>
                {data?.daily && data.daily.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {calculateTrend(data.daily)}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Statistiques par employé</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500 dark:text-gray-400">Heures moyennes par employé</dt>
                    <dd className="font-medium">
                      {formatHours(stats?.avgHoursPerEmployee || 0)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500 dark:text-gray-400">Heures maximales sur une journée</dt>
                    <dd className="font-medium">
                      {formatHours(stats && stats.maxEmployees && stats.maxEmployees > 0 
                        ? stats.totalHours / stats.maxEmployees 
                        : 0)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500 dark:text-gray-400">Jour le plus actif</dt>
                    <dd className="font-medium">
                      {calculateMostActiveDay(data?.daily || [])}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="border rounded-lg p-8 text-center">
          <h2 className="text-xl font-medium mb-2">Aucune donnée trouvée</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Impossible de récupérer les informations de présence. Veuillez essayer avec d'autres critères.
          </p>
          <Button onClick={() => fetchData()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Réessayer
          </Button>
        </div>
      )}
    </div>
  );
} 