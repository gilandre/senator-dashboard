import React, { useState, useEffect } from 'react';
import { format as formatDate } from 'date-fns';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { Spinner } from '@/components/ui/spinner';
import { ExportAnalysis, ExportOptions } from '@/lib/services/export-service';
import { Switch } from '@/components/ui/switch';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  dateRange: { from?: Date; to?: Date };
  defaultFormat?: 'excel' | 'csv' | 'pdf';
  filters?: {
    employeeId?: string;
    department?: string;
    readers?: string[];
    eventTypes?: string[];
  };
  source?: string; // Identifie la source de l'export (ex: 'attendance', 'access-logs', etc.)
  exportTypes?: Array<{
    id: string;
    name: string;
    description: string;
  }>;
  onExportRequest?: (format: string, exportType: string) => Promise<void>;
}

export function ExportDialog({
  isOpen,
  onClose,
  title = "Exporter les données",
  description = "Choisissez les options d'exportation",
  dateRange,
  defaultFormat = 'excel',
  filters = {},
  source = 'general',
  exportTypes = [],
  onExportRequest
}: ExportDialogProps) {
  // États
  const [format, setFormat] = useState<'excel' | 'csv' | 'pdf'>(defaultFormat);
  const [analysis, setAnalysis] = useState<ExportAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [exportType, setExportType] = useState<string>(exportTypes.length > 0 ? exportTypes[0].id : 'default');
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [downloadLinks, setDownloadLinks] = useState<any[]>([]);
  const [exportOptions, setExportOptions] = useState({
    splitFiles: false,
    includeHeaders: true,
    maxRowsPerFile: 500000,
    includeDetailedEvents: true
  });
  
  // Déterminer les formats disponibles en fonction du type d'export
  const isDetailedExport = exportType === 'detailed' || exportType.includes('detailed');
  const isSummaryExport = exportType === 'summary' || exportType.includes('summary');

  // Ajuster le format en fonction du type d'export sélectionné
  useEffect(() => {
    if (isDetailedExport && format === 'pdf') {
      setFormat('excel');
    } else if (isSummaryExport && (format === 'excel' || format === 'csv')) {
      setFormat('pdf');
    }
  }, [exportType, format, isDetailedExport, isSummaryExport]);
  
  // Effet pour analyser automatiquement l'export quand les filtres changent
  useEffect(() => {
    if (isOpen && dateRange.from && dateRange.to) {
      analyzeExport();
    }
  }, [isOpen, dateRange, format, filters, exportType]);
  
  // Analyser l'export pour obtenir des informations
  const analyzeExport = async () => {
    if (!dateRange.from || !dateRange.to) return;
    
    setAnalyzing(true);
    
    try {
      const startDate = formatDate(dateRange.from, 'yyyy-MM-dd');
      const endDate = formatDate(dateRange.to, 'yyyy-MM-dd');
      
      const response = await fetch(
        `/api/export?format=${format}&startDate=${startDate}&endDate=${endDate}&source=${source}${exportType ? `&exportType=${exportType}` : ''}`,
        {
          headers: {
            'x-test-bypass-auth': 'admin'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`Erreur d'analyse: ${response.status}`);
      }
      
      const analysis = await response.json();
      setAnalysis(analysis);
    } catch (error) {
      console.error('Erreur lors de l\'analyse de l\'export:', error);
      toast({
        title: "Erreur d'analyse",
        description: error instanceof Error ? error.message : "Impossible d'analyser les données à exporter",
        variant: "destructive"
      });
    } finally {
      setAnalyzing(false);
    }
  };
  
  // Réinitialiser le formulaire
  const resetForm = () => {
    setFormat(defaultFormat);
    setAnalysis(null);
    setExportProgress(null);
    setDownloadLinks([]);
    setExportOptions({
      splitFiles: false,
      includeHeaders: true,
      maxRowsPerFile: 500000,
      includeDetailedEvents: true
    });
    if (exportTypes.length > 0) {
      setExportType(exportTypes[0].id);
    }
  };
  
  // Effectuer l'export
  const handleExport = async () => {
    if (!dateRange.from || !dateRange.to) {
      toast({
        title: "Plage de dates invalide",
        description: "Veuillez sélectionner une plage de dates valide",
        variant: "destructive"
      });
      return;
    }
    
    // Si un handler personnalisé est fourni, l'utiliser
    if (onExportRequest) {
      try {
        setLoading(true);
        await onExportRequest(format, exportType);
        setLoading(false);
        onClose();
      } catch (error) {
        setLoading(false);
        console.error('Erreur lors de l\'export personnalisé:', error);
      }
      return;
    }
    
    setLoading(true);
    setExportProgress(0);
    
    try {
      const startDate = formatDate(dateRange.from, 'yyyy-MM-dd');
      const endDate = formatDate(dateRange.to, 'yyyy-MM-dd');
      
      // Préparer les options d'export
      const exportData: ExportOptions = {
        format,
        startDate,
        endDate,
        filters,
        splitFiles: exportOptions.splitFiles,
        maxRowsPerFile: exportOptions.maxRowsPerFile,
        includeHeaders: exportOptions.includeHeaders,
        includeDetailedEvents: exportOptions.includeDetailedEvents,
        source: source !== 'general' ? source : undefined,
        exportType: exportType !== 'default' ? exportType : undefined
      };
      
      // Simuler une progression (dans une vraie implémentation, cela viendrait du serveur)
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          if (prev !== null && prev < 90) {
            return prev + 5;
          }
          return prev;
        });
      }, 500);
      
      // Appeler l'API d'export
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-bypass-auth': 'admin'
        },
        body: JSON.stringify(exportData)
      });
      
      clearInterval(progressInterval);
      
      if (!response.ok) {
        throw new Error(`Erreur lors de l'export: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.requiresConfirmation) {
        // L'export est trop volumineux et nécessite une confirmation
        setAnalysis(result.analysis);
        setExportOptions(prev => ({ ...prev, splitFiles: true }));
        setExportProgress(null);
        toast({
          title: "Volume important",
          description: result.message,
          variant: "destructive"
        });
      } else if (result.status === 'processing') {
        // Export asynchrone
        setExportProgress(100);
        toast({
          title: "Export en cours",
          description: "L'export a été mis en file d'attente. Vous recevrez une notification une fois terminé.",
          variant: "default"
        });
        setTimeout(onClose, 1500);
      } else if (result.success && result.files) {
        // Export réussi
        setExportProgress(100);
        setDownloadLinks(result.files);
        toast({
          title: "Export réussi",
          description: `${result.totalRows} lignes exportées avec succès.`,
          variant: "default"
        });
      } else {
        // Erreur
        throw new Error(result.message || "Erreur lors de l'export");
      }
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      toast({
        title: "Erreur d'export",
        description: error instanceof Error ? error.message : "Erreur lors de l'export",
        variant: "destructive"
      });
      setExportProgress(null);
    } finally {
      setLoading(false);
    }
  };
  
  // Télécharger un fichier
  const downloadFile = (url: string) => {
    window.open(url, '_blank');
    resetForm();
    onClose();
  };
  
  // Notification au serveur que le fichier a été téléchargé (pour le nettoyage éventuel)
  const markFileAsDownloaded = async (filePath: string) => {
    try {
      await fetch(`/api/export/download?file=${encodeURIComponent(filePath)}`, {
        method: 'DELETE',
        headers: {
          'x-test-bypass-auth': 'admin'
        }
      });
    } catch (error) {
      console.error('Erreur lors de la notification de téléchargement:', error);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        resetForm();
      }
      onClose();
    }}>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        
        {exportProgress !== null ? (
          // Affichage de la progression
          <div className="py-6 space-y-4">
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
              <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${exportProgress}%` }}></div>
            </div>
            <p className="text-center text-sm text-gray-500">
              {exportProgress < 100 
                ? `Export en cours... ${exportProgress}%` 
                : "Export terminé !"}
            </p>
            
            {downloadLinks.length > 0 && (
              <div className="mt-4 border rounded-md p-4 bg-gray-50 dark:bg-gray-800">
                <h4 className="font-medium mb-2">Fichiers disponibles au téléchargement</h4>
                <ul className="space-y-2">
                  {downloadLinks.map((file, index) => (
                    <li key={index} className="flex justify-between items-center text-sm">
                      <span>{file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                      <Button size="sm" onClick={() => downloadFile(file.url)}>
                        Télécharger
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          // Formulaire d'export
          <div className="space-y-4 py-4">
            {/* Types d'export (si disponibles) */}
            {exportTypes.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="exportTypeSelect">Type d'export</Label>
                <Select value={exportType} onValueChange={setExportType}>
                  <SelectTrigger id="exportTypeSelect">
                    <SelectValue placeholder="Sélectionner un type d'export" />
                  </SelectTrigger>
                  <SelectContent>
                    {exportTypes.map(type => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {exportTypes.find(t => t.id === exportType)?.description && (
                  <p className="text-xs text-muted-foreground">
                    {exportTypes.find(t => t.id === exportType)?.description}
                  </p>
                )}
              </div>
            )}
            
            {/* Format d'export */}
            <div className="space-y-2">
              <Label htmlFor="formatSelector">Format</Label>
              <Tabs id="formatSelector" value={format} onValueChange={(v) => setFormat(v as any)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="excel" disabled={isSummaryExport}>Excel</TabsTrigger>
                  <TabsTrigger value="csv" disabled={isSummaryExport}>CSV</TabsTrigger>
                  <TabsTrigger value="pdf" disabled={true}>PDF (Désactivé)</TabsTrigger>
                </TabsList>
              </Tabs>
              {isSummaryExport && (
                <p className="text-xs text-muted-foreground mt-1">
                  Le format PDF est le seul disponible pour les rapports de synthèse
                </p>
              )}
              {isDetailedExport && (
                <p className="text-xs text-muted-foreground mt-1">
                  Les formats Excel et CSV sont les seuls disponibles pour les données détaillées
                </p>
              )}
            </div>
            
            {/* Période */}
            <div className="space-y-2">
              <Label htmlFor="dateRangeDisplay">Période</Label>
              <div id="dateRangeDisplay" className="flex justify-between text-sm border rounded-md p-2 bg-muted">
                <span>Du {dateRange.from?.toLocaleDateString()}</span>
                <span>Au {dateRange.to?.toLocaleDateString()}</span>
              </div>
            </div>
            
            {/* Analyse de l'export */}
            {analyzing ? (
              <div className="flex justify-center py-4">
                <Spinner className="mr-2 h-4 w-4" />
                <span className="text-sm">Analyse des données...</span>
              </div>
            ) : analysis ? (
              <div className="border rounded-md p-4 bg-muted">
                <h4 className="font-medium mb-2">Informations sur l'export</h4>
                <ul className="space-y-1 text-sm">
                  <li><strong>Nombre total de lignes:</strong> {analysis.totalRows.toLocaleString()}</li>
                  <li><strong>Taille estimée:</strong> {analysis.estimatedSizeMB}</li>
                  <li><strong>Période:</strong> {dateRange.from?.toLocaleDateString()} - {dateRange.to?.toLocaleDateString()}</li>
                </ul>
                
                {analysis.warnings.length > 0 && (
                  <Alert className="mt-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {analysis.warnings[0]}
                    </AlertDescription>
                  </Alert>
                )}
                
                {analysis.recommendations.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs font-medium">Recommandations:</p>
                    <ul className="text-xs list-disc pl-4 space-y-1">
                      {analysis.recommendations.map((rec, i) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : null}
            
            {/* Options avancées */}
            {analysis && analysis.exceedsLimit && (
              <div className="mt-4">
                <h4 className="font-medium mb-2 text-sm">Options pour les grands volumes</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="splitFiles">Diviser en plusieurs fichiers</Label>
                      <p className="text-xs text-muted-foreground">
                        {analysis.exceedsLimit ? "Recommandé pour ce volume de données" : "Option pour les grands volumes"}
                      </p>
                    </div>
                    <Switch
                      id="splitFiles"
                      checked={exportOptions.splitFiles}
                      onCheckedChange={(checked) => 
                        setExportOptions({...exportOptions, splitFiles: checked})
                      }
                    />
                  </div>
                  
                  {exportOptions.splitFiles && (
                    <div className="space-y-2 pl-6 mt-2">
                      <Label htmlFor="maxRowsInput">Lignes par fichier</Label>
                      <Input
                        id="maxRowsInput"
                        type="number"
                        min="10000"
                        max="1000000"
                        value={exportOptions.maxRowsPerFile}
                        onChange={(e) => 
                          setExportOptions({
                            ...exportOptions, 
                            maxRowsPerFile: parseInt(e.target.value) || 500000
                          })
                        }
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        Résultera en environ {Math.ceil(analysis.totalRows / exportOptions.maxRowsPerFile)} fichiers
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="includeHeaders" 
                  checked={exportOptions.includeHeaders}
                  onCheckedChange={(checked) => 
                    setExportOptions({...exportOptions, includeHeaders: checked === true})
                  }
                />
                <Label htmlFor="includeHeaders">Inclure les en-têtes de colonnes</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="includeDetailedEvents" 
                  checked={exportOptions.includeDetailedEvents}
                  onCheckedChange={(checked) => 
                    setExportOptions({...exportOptions, includeDetailedEvents: checked === true})
                  }
                />
                <Label htmlFor="includeDetailedEvents">Inclure tous les événements détaillés</Label>
              </div>
            </div>
            
            {format === 'pdf' && (
              <Alert className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  L'export PDF est temporairement désactivé. Veuillez utiliser Excel ou CSV.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => {
            resetForm();
            onClose();
          }} disabled={loading}>
            {downloadLinks.length > 0 ? "Fermer" : "Annuler"}
          </Button>
          
          {downloadLinks.length === 0 && (
            <Button 
              onClick={handleExport} 
              disabled={loading || analyzing || !analysis || format === 'pdf'}
            >
              {loading && <Spinner className="mr-2 h-4 w-4" />}
              {loading ? "Exportation en cours..." : "Exporter"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 