'use client';

import { useState } from 'react';
import { FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExportDialog } from '@/components/ui/export-dialog';
import { DateRange } from 'react-day-picker';
import { toast } from '@/components/ui/use-toast';

interface AnomalyExportMenuProps {
  startDate?: string;
  endDate?: string;
}

export default function AnomalyExportMenu({ startDate, endDate }: AnomalyExportMenuProps) {
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Convertir les dates string en objets Date pour DateRange
  const dateRange: DateRange = {
    from: startDate ? new Date(startDate) : undefined,
    to: endDate ? new Date(endDate) : undefined
  };

  // Fonction pour effectuer une tentative d'export avec retry
  const executeExportWithRetry = async (url: string, maxRetries = 2, delay = 1500) => {
    let retries = 0;
    let lastError: Error | null = null;
    
    while (retries <= maxRetries) {
      try {
        // Faire la requête pour obtenir le fichier
        const response = await fetch(url, {
          headers: { 'x-test-bypass-auth': 'admin' },
          method: 'GET'
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(
            errorData?.error || 
            errorData?.details || 
            `Erreur serveur: ${response.status} ${response.statusText}`
          );
        }
        
        return response;
      } catch (error) {
        console.error(`Tentative d'export échouée (${retries + 1}/${maxRetries + 1}):`, error);
        lastError = error instanceof Error ? error : new Error('Erreur inconnue');
        
        if (retries < maxRetries) {
          // Attendre avant de réessayer
          await new Promise(resolve => setTimeout(resolve, delay));
          retries++;
        } else {
          // Toutes les tentatives ont échoué
          throw lastError;
        }
      }
    }
    
    // Cette ligne ne devrait jamais être atteinte, mais TypeScript l'exige
    throw new Error("Impossible de terminer l'opération d'export");
  };

  // Handler spécifique pour les anomalies
  const handleAnomalyExport = async (format: string, exportType: string) => {
    if (!dateRange.from || !dateRange.to) {
      toast({
        title: "Erreur d'export",
        description: "Veuillez sélectionner une plage de dates valide",
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);
    
    try {
      toast({
        title: "Export en cours",
        description: "Préparation de votre fichier, veuillez patienter...",
      });
      
      // Construire l'URL d'API spécifique pour les anomalies
      const startDateStr = dateRange.from.toISOString().split('T')[0];
      const endDateStr = dateRange.to.toISOString().split('T')[0];
      const url = `/api/export/anomalies?format=${format}&startDate=${startDateStr}&endDate=${endDateStr}&exportType=${exportType}`;
      
      // Faire la requête avec retry en cas d'échec
      const response = await executeExportWithRetry(url);
      
      // Vérifier le type de contenu pour déterminer le format du fichier
      const contentType = response.headers.get('Content-Type');
      const contentDisposition = response.headers.get('Content-Disposition');
      
      // Si la réponse est un JSON au lieu d'un fichier, c'est probablement une erreur
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.details || 'Erreur inconnue lors de l\'export');
      }
      
      // Récupérer le fichier et le télécharger
      const blob = await response.blob();
      
      // Déterminer l'extension à partir du Content-Type
      let fileExt = 'pdf';
      if (contentType) {
        if (contentType.includes('spreadsheetml')) fileExt = 'xlsx';
        else if (contentType.includes('csv')) fileExt = 'csv';
      }
      
      // Obtenir le nom de fichier depuis l'en-tête Content-Disposition si disponible
      let fileName = `anomalies_${startDateStr}_${endDateStr}.${fileExt}`;
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="(.+?)"/);
        if (fileNameMatch && fileNameMatch[1]) {
          fileName = fileNameMatch[1];
        }
      }
      
      // Créer un lien de téléchargement
      const url2 = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url2;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      
      // Nettoyer
      window.URL.revokeObjectURL(url2);
      document.body.removeChild(a);
      
      toast({
        title: "Export réussi",
        description: `Les données ont été exportées en format ${format.toUpperCase()}`,
        variant: "default"
      });
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      toast({
        title: "Erreur d'export",
        description: error instanceof Error ? error.message : "Une erreur s'est produite lors de l'export",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <Button size="sm" onClick={() => setExportDialogOpen(true)} disabled={isExporting}>
        <FileDown className="mr-2 h-4 w-4" />
        {isExporting ? 'Export en cours...' : 'Exporter'}
      </Button>
      
      <ExportDialog
        isOpen={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        title="Exporter les anomalies"
        description="Exportez les données d'anomalies pour la période sélectionnée"
        dateRange={dateRange}
        filters={{}}
        source="anomalies" // Identifiant pour le traitement spécifique
        exportTypes={[
          {
            id: 'detailed',
            name: 'Données détaillées',
            description: 'Exporte toutes les anomalies avec leurs détails'
          },
          {
            id: 'summary',
            name: 'Rapport de synthèse',
            description: 'Exporte un résumé des anomalies avec statistiques'
          }
        ]}
        onExportRequest={handleAnomalyExport}
      />
    </>
  );
} 