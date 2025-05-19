"use client";

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, FileText, Upload, CheckCircle2 } from 'lucide-react';

type CSVImportFormProps = {
  onImportSuccess: (data: any) => void;
  onImportError: (error: Error) => void;
};

export function CSVImportForm({ onImportSuccess, onImportError }: CSVImportFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        setError('Le fichier doit être au format CSV');
        setFile(null);
        return;
      }
      
      setFile(selectedFile);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    maxFiles: 1,
    multiple: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError('Veuillez sélectionner un fichier CSV');
      return;
    }

    setUploading(true);
    setProgress(0);
    setError(null);
    setSuccess(false);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Simulation d'une progression d'upload
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return 95;
          }
          return prev + 5;
        });
      }, 100);

      const response = await fetch('/api/import/csv', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de l\'importation');
      }

      const data = await response.json();
      setSuccess(true);
      onImportSuccess(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      onImportError(err instanceof Error ? err : new Error('Une erreur est survenue'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-primary bg-primary/10' : 'border-gray-300 hover:border-primary'
        } ${error ? 'border-red-500 bg-red-50' : ''} ${success ? 'border-green-500 bg-green-50' : ''}`}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center justify-center space-y-4">
          {success ? (
            <CheckCircle2 className="h-12 w-12 text-green-500" />
          ) : (
            <Upload className="h-12 w-12 text-gray-400" />
          )}
          
          <div className="space-y-1">
            <p className="text-lg font-medium">
              {file ? `Fichier sélectionné: ${file.name}` : 'Glissez-déposez un fichier CSV ici'}
            </p>
            <p className="text-sm text-gray-500">
              Format attendu: Export SENATOR FX (CSV avec séparateur point-virgule)
            </p>
          </div>

          {file && (
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <FileText className="h-4 w-4" />
              <span>{(file.size / 1024).toFixed(2)} KB</span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {uploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Importation en cours...</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      <div className="flex justify-end">
        <Button 
          type="submit" 
          disabled={!file || uploading || success}
          className="min-w-[120px]"
        >
          {uploading ? 'Importation...' : success ? 'Importé' : 'Importer'}
        </Button>
      </div>
    </form>
  );
} 