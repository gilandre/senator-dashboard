'use client';

import { useState } from 'react';
import { FileText, FileSpreadsheet, FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import axios from 'axios';
import { toast } from 'sonner';

interface AnomalyExportMenuProps {
  startDate?: string;
  endDate?: string;
}

export default function AnomalyExportMenu({ startDate, endDate }: AnomalyExportMenuProps) {
  const [exporting, setExporting] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportFormat, setExportFormat] = useState('pdf');

  const handleExport = async () => {
    if (!startDate || !endDate) {
      toast.error("Les dates de début et de fin sont requises pour exporter");
      return;
    }

    setExporting(true);
    setShowExportDialog(false);

    try {
      // Construire les paramètres de requête
      const params = new URLSearchParams();
      params.append('startDate', startDate);
      params.append('endDate', endDate);
      params.append('format', exportFormat);

      const response = await axios.get(`/api/export/anomalies?${params.toString()}`, {
        responseType: 'blob'
      });

      // Créer un nom de fichier avec la plage de dates
      const startFormatted = startDate.replace(/-/g, '');
      const endFormatted = endDate.replace(/-/g, '');
      const fileName = `anomalies_${startFormatted}_${endFormatted}`;
      const extension = exportFormat.toLowerCase();
      
      // Créer un objet URL et le lier à un élément <a> pour télécharger
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${fileName}.${extension}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Le rapport a été exporté au format ${exportFormat.toUpperCase()}`);
    } catch (error) {
      console.error(`Erreur lors de l'exportation en ${exportFormat}:`, error);
      toast.error(`Impossible d'exporter au format ${exportFormat.toUpperCase()}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={exporting}>
          {exporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Exportation...
            </>
          ) : (
            <>
              <FileDown className="mr-2 h-4 w-4" />
              Exporter
            </>
          )}
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
            <select
              id="format"
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              className="col-span-3 rounded-md border border-input px-3 py-1"
              aria-label="Format d'exportation"
            >
              <option value="pdf">PDF</option>
              <option value="xlsx">Excel (XLSX)</option>
              <option value="csv">CSV (données brutes)</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleExport}>Exporter</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 