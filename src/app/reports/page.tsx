'use client';

import React, { useEffect, useState } from 'react';
import { FileText, Download, Calendar, Filter, ChevronRight, Loader2, X, Check, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ChartCard from '@/components/dashboard/chart-card';
import Link from 'next/link';
import { getReports, getReportStats, getScheduledReports, getReportHistory, generateReport } from '@/lib/services/reports-service';
import { Toaster, toast } from 'sonner';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { format, subDays } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface ReportListItem {
  id: string;
  title: string;
  description: string;
  category: string;
  lastGenerated: string;
  icon: string;
  link?: string;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [filteredReports, setFilteredReports] = useState<ReportListItem[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [scheduledReports, setScheduledReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(),
    to: new Date(),
  });
  
  // États pour la création de rapport
  const [showNewReportDialog, setShowNewReportDialog] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [newReportData, setNewReportData] = useState({
    title: '',
    reportType: '',
    format: 'pdf',
    dateRange: {
      from: new Date(),
      to: new Date(),
    },
    includeCharts: true,
    includeTables: true,
    groupBy: 'day',
    recipients: '',
    schedule: 'once',
    scheduleFrequency: 'daily',
    departments: [] as string[],
    notes: ''
  });

  // Fonction utilitaire pour dédupliquer les rapports par ID
  const deduplicateReports = (reportsList: ReportListItem[]): ReportListItem[] => {
    const uniqueReportsMap = new Map<string, ReportListItem>();
    
    if (Array.isArray(reportsList)) {
      reportsList.forEach(report => {
        if (!uniqueReportsMap.has(report.id)) {
          uniqueReportsMap.set(report.id, report);
        }
      });
    }
    
    return Array.from(uniqueReportsMap.values());
  };

  // Récupérer la date maximale des données au chargement
  useEffect(() => {
    async function initDateRange() {
      try {
        // Requête pour obtenir la date maximale
        const response = await fetch('/api/access-data?getMaxDate=true');
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération de la date maximale');
        }
        
        const data = await response.json();
        const maxDate = data.maxDate ? new Date(data.maxDate) : new Date();
        const startDate = subDays(maxDate, 14); // 2 semaines avant la date max
        
        // Mettre à jour dateRange principal
        setDateRange({
          from: startDate,
          to: maxDate
        });
        
        // Mettre à jour également newReportData.dateRange
        setNewReportData(prev => ({
          ...prev,
          dateRange: {
            from: startDate,
            to: maxDate
          }
        }));
        
        console.log('Dates de période initialisées:', { 
          start: format(startDate, 'yyyy-MM-dd'), 
          end: format(maxDate, 'yyyy-MM-dd') 
        });
      } catch (error) {
        console.error('Erreur lors de l\'initialisation des dates:', error);
      }
    }
    
    initDateRange();
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        console.log('🚀 Chargement des données des rapports...');
        
        // Charger les données en parallèle
        const [reportsData, statsData, scheduledData] = await Promise.all([
          getReports().then(data => {
            console.log(`📊 Données brutes des rapports: ${data.length} rapports`);
            console.log('Rapports reçus:', data.map(r => ({ id: r.id, title: r.title, category: r.category })));
            return data;
          }),
          getReportStats().catch(err => {
            console.error('Erreur lors du chargement des statistiques:', err);
            return null;
          }),
          getScheduledReports().catch(err => {
            console.error('Erreur lors du chargement des rapports programmés:', err);
            return [];
          })
        ]);
        
        // Dédupliquer strictement les rapports par ID
        const uniqueReportsMap = new Map();
        
        if (Array.isArray(reportsData)) {
          reportsData.forEach(report => {
            // Ne conserver que le premier rapport avec cet ID
            if (!uniqueReportsMap.has(report.id)) {
              uniqueReportsMap.set(report.id, report);
            } else {
              console.warn(`⚠️ Rapport en double détecté et ignoré: ${report.id} - ${report.title}`);
            }
          });
        }
        
        const uniqueReports = Array.from(uniqueReportsMap.values());
        console.log(`📊 Après déduplication: ${uniqueReports.length} rapports uniques`);
        console.log('Rapports uniques:', uniqueReports.map(r => ({ id: r.id, title: r.title, category: r.category })));
        
        setReports(uniqueReports);
        setFilteredReports(uniqueReports);
        setStats(statsData);
        setScheduledReports(Array.isArray(scheduledData) ? scheduledData : []);
      } catch (err) {
        console.error('❌ Erreur lors du chargement des données:', err);
        setError('Impossible de charger les rapports. Veuillez réessayer plus tard.');
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, []);

  // Charger les rapports en fonction de la période sélectionnée
  const loadReportsByDateRange = async (range: DateRange) => {
    if (!range.from || !range.to) return;
    
    try {
      setLoading(true);
      
      const startDate = format(range.from, 'yyyy-MM-dd');
      const endDate = format(range.to, 'yyyy-MM-dd');
      
      console.log(`Chargement des rapports pour la période du ${startDate} au ${endDate}`);
      
      // Récupérer l'historique des rapports pour la période spécifiée
      const result = await getReportHistory(1, 50, {
        startDate,
        endDate
      });
      
      if (result && result.data) {
        // Convertir les données du rapport d'historique au format ReportListItem
        const formattedReports: ReportListItem[] = result.data.map(report => ({
          id: report.id,
          title: report.title,
          description: `Rapport généré le ${new Date(report.generatedAt).toLocaleDateString()}`,
          category: report.reportType,
          lastGenerated: new Date(report.generatedAt).toLocaleDateString(),
          icon: 'chart-bar',
          downloadUrl: report.downloadUrl
        }));
        
        // Dédupliquer et appliquer le filtre de catégorie si nécessaire
        const deduplicatedReports = deduplicateReports(formattedReports.length > 0 ? formattedReports : reports);
        
        if (selectedCategory) {
          setFilteredReports(deduplicatedReports.filter(report => report.category === selectedCategory));
        } else {
          setFilteredReports(deduplicatedReports);
        }
      } else {
        // Appliquer uniquement le filtre de catégorie aux rapports existants (après déduplication)
        const deduplicatedReports = deduplicateReports(reports);
        
        if (selectedCategory) {
          setFilteredReports(deduplicatedReports.filter(report => report.category === selectedCategory));
        } else {
          setFilteredReports(deduplicatedReports);
        }
      }
    } catch (err) {
      console.error('Erreur lors du chargement des rapports filtrés:', err);
      
      // En cas d'erreur, appliquer uniquement le filtre de catégorie aux rapports dédupliqués
      const deduplicatedReports = deduplicateReports(reports);
      
      if (selectedCategory) {
        setFilteredReports(deduplicatedReports.filter(report => report.category === selectedCategory));
      } else {
        setFilteredReports(deduplicatedReports);
      }
    } finally {
      setLoading(false);
      setShowDatePicker(false);
    }
  };

  // Gérer le changement de date
  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      setDateRange(range);
      loadReportsByDateRange(range);
    }
  };

  // Gérer la sélection d'une catégorie
  const handleCategoryChange = (category: string | null) => {
    setSelectedCategory(category);
    
    // Dédupliquer les rapports en utilisant la fonction utilitaire
    const uniqueReports = deduplicateReports(reports);
    
    if (category) {
      setFilteredReports(uniqueReports.filter(report => report.category === category));
    } else {
      setFilteredReports(uniqueReports);
    }
    
    setShowFilterMenu(false);
  };

  // Réinitialiser tous les filtres
  const resetAllFilters = async () => {
    setSelectedCategory(null);
    
    try {
      // Requête pour obtenir la date maximale
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
      
      // Dédupliquer les rapports en utilisant la fonction utilitaire
      const uniqueReports = deduplicateReports(reports);
      
      // Recharger les rapports avec les filtres réinitialisés
      setFilteredReports(uniqueReports);
      setShowFilterMenu(false);
      
      toast.success("Filtres réinitialisés");
    } catch (error) {
      console.error('Erreur lors de la réinitialisation des dates:', error);
      
      // Fallback en cas d'erreur
      setDateRange({
        from: subDays(new Date(), 14),
        to: new Date(),
      });
      
      // Dédupliquer les rapports même en cas d'erreur
      setFilteredReports(deduplicateReports(reports));
      setShowFilterMenu(false);
    }
  };

  // Fallback data si les données ne sont pas encore chargées
  const fallbackReports: ReportListItem[] = [];

  // Déduplication des rapports en utilisant notre fonction utilitaire
  const uniqueReports = loading ? fallbackReports : deduplicateReports(filteredReports.length > 0 ? filteredReports : reports);
  
  // On utilise les rapports dédupliqués pour l'affichage
  const displayReports = uniqueReports;
  
  // Extraire les catégories uniques
  const categories = Array.from(new Set(displayReports.map(report => report.category)));
  
  // Pour le menu de filtrage, nous voulons toutes les catégories disponibles, également dédupliquées
  const allCategories = Array.from(new Set(deduplicateReports(reports).map(report => report.category)));

  // Gestion de la création d'un nouveau rapport
  const handleReportSubmit = async () => {
    if (!newReportData.reportType) {
      toast.error('Veuillez sélectionner un type de rapport');
      return;
    }
    
    if (!newReportData.title) {
      toast.error('Veuillez donner un titre à votre rapport');
      return;
    }
    
    try {
      setIsGeneratingReport(true);
      
      const parameters = {
        dateRange: {
          startDate: format(newReportData.dateRange.from || new Date(), 'yyyy-MM-dd'),
          endDate: format(newReportData.dateRange.to || new Date(), 'yyyy-MM-dd')
        },
        includeCharts: newReportData.includeCharts,
        includeTables: newReportData.includeTables,
        groupBy: newReportData.groupBy,
        departments: newReportData.departments,
        notes: newReportData.notes,
        schedule: newReportData.schedule !== 'once' ? {
          frequency: newReportData.scheduleFrequency,
          recipients: newReportData.recipients.split(',').map(email => email.trim())
        } : null
      };
      
      const result = await generateReport(
        newReportData.reportType,
        parameters,
        newReportData.format,
        newReportData.title
      );
      
      toast.success('Rapport généré avec succès!');
      setShowNewReportDialog(false);
      
      // Recharger les données pour montrer le nouveau rapport
      const [reportsData, statsData] = await Promise.all([
        getReports(),
        getReportStats().catch(err => {
          console.error('Erreur lors du rechargement des statistiques:', err);
          return null;
        })
      ]);
      
      // Utiliser la fonction de déduplication
      const uniqueReports = deduplicateReports(reportsData);
      console.log(`📊 Après génération et déduplication: ${uniqueReports.length} rapports uniques`);
      
      setReports(uniqueReports);
      setFilteredReports(uniqueReports);
      
      // Mettre à jour les statistiques pour afficher le nouveau rapport dans la liste des rapports récents
      if (statsData) {
        setStats(statsData);
        console.log('📊 Statistiques rechargées avec succès:', statsData);
      }
      
    } catch (err) {
      console.error('Erreur lors de la génération du rapport:', err);
      toast.error('Erreur lors de la génération du rapport');
    } finally {
      setIsGeneratingReport(false);
    }
  };
  
  // Réinitialiser le formulaire de nouveau rapport
  const resetNewReportForm = async () => {
    try {
      // Récupérer la date maximale pour initialiser correctement le formulaire
      const response = await fetch('/api/access-data?getMaxDate=true');
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération de la date maximale');
      }
      
      const data = await response.json();
      const maxDate = data.maxDate ? new Date(data.maxDate) : new Date();
      const startDate = subDays(maxDate, 14); // 2 semaines avant la date max
      
      setNewReportData({
        title: '',
        reportType: '',
        format: 'pdf',
        dateRange: {
          from: startDate,
          to: maxDate,
        },
        includeCharts: true,
        includeTables: true,
        groupBy: 'day',
        recipients: '',
        schedule: 'once',
        scheduleFrequency: 'daily',
        departments: [],
        notes: ''
      });
    } catch (error) {
      console.error('Erreur lors de la réinitialisation du formulaire:', error);
      
      // Fallback en cas d'erreur
      setNewReportData({
        title: '',
        reportType: '',
        format: 'pdf',
        dateRange: {
          from: subDays(new Date(), 14),
          to: new Date(),
        },
        includeCharts: true,
        includeTables: true,
        groupBy: 'day',
        recipients: '',
        schedule: 'once',
        scheduleFrequency: 'daily',
        departments: [],
        notes: ''
      });
    }
  };
  
  // Ouvrir le formulaire de création de rapport
  const openNewReportDialog = () => {
    resetNewReportForm();
    setShowNewReportDialog(true);
  };
  
  // Mettre à jour les données du nouveau rapport
  const updateReportData = (field: string, value: any) => {
    setNewReportData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p>Chargement des rapports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Réessayer</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Rapports</h1>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 items-end">
          <div className="relative">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowDatePicker(!showDatePicker)}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Période
              {dateRange.from && dateRange.to && (
                <span className="ml-2 text-xs">
                  {format(dateRange.from, 'dd/MM/yyyy')} - {format(dateRange.to, 'dd/MM/yyyy')}
                </span>
              )}
            </Button>
            
            {showDatePicker && (
              <div className="absolute right-0 top-full mt-2 z-50 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-md shadow-lg p-4">
                <DateRangePicker
                  value={dateRange}
                  onChange={handleDateRangeChange}
                />
              </div>
            )}
          </div>
          <div className="relative">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowFilterMenu(!showFilterMenu)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtrer
              {selectedCategory && (
                <span className="ml-2 text-xs truncate max-w-[100px]">
                  {selectedCategory}
                </span>
              )}
            </Button>
            
            {showFilterMenu && (
              <div className="absolute right-0 top-full mt-2 z-50 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-md shadow-lg p-4 w-64">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium text-sm">Type de rapport</h3>
                    {selectedCategory && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={resetAllFilters}
                        className="h-6 px-2"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Réinitialiser
                      </Button>
                    )}
                  </div>
                  
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    <div 
                      className={`flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${!selectedCategory ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                      onClick={() => handleCategoryChange(null)}
                    >
                      <span className="text-sm">Tous les types</span>
                      {!selectedCategory && <Check className="h-4 w-4 text-blue-600" />}
                    </div>
                    
                    {allCategories.map((category, index) => (
                      <div 
                        key={index}
                        className={`flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${selectedCategory === category ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                        onClick={() => handleCategoryChange(category)}
                      >
                        <span className="text-sm">{category}</span>
                        {selectedCategory === category && <Check className="h-4 w-4 text-blue-600" />}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <Card className="col-span-4">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Rapports disponibles</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2">Chargement des rapports...</span>
            </div>
          ) : categories.length > 0 ? (
            <div className="space-y-6">
              {categories.map((category, i) => {
                // Filtrer les rapports de cette catégorie et dédupliquer par ID
                const reportsInCategory = displayReports
                  .filter(report => report.category === category)
                  .reduce((unique: any[], report: any) => {
                    // Si le rapport n'existe pas déjà dans notre tableau, l'ajouter
                    if (!unique.some((r: any) => r.id === report.id)) {
                      unique.push(report);
                    }
                    return unique;
                  }, []);
                
                return (
                  <div key={`cat-${i}`} className="space-y-2">
                    <h3 className="font-medium text-lg">{category}</h3>
                    <div className="grid grid-cols-1 gap-4">
                      {reportsInCategory.map((report: any) => (
                        <div 
                          key={`report-${report.id}`} 
                          className="flex justify-between items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                        >
                          <div>
                            <h4 className="font-medium text-base">{report.title}</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{report.description}</p>
                          </div>
                          {report.link ? (
                            <Button asChild>
                              <Link href={report.link} className="flex items-center">
                                Accéder
                                <ChevronRight className="h-4 w-4 ml-1" />
                              </Link>
                            </Button>
                          ) : (
                            <Button variant="outline" disabled>
                              Non disponible
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-3 mb-4">
                <FileText className="h-6 w-6 text-gray-500 dark:text-gray-400" />
              </div>
              <h3 className="font-medium mb-1">Aucun rapport disponible</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Veuillez contacter l'administrateur pour plus d'informations.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 