'use client';

import React, { useState, useEffect } from 'react';
import { Upload, FileUp, Check, X, Loader2, ArrowRight, AlertCircle, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { useToast } from "@/components/ui/use-toast";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import axios from 'axios';
import { validateDateFormat } from '@/lib/utils/dateUtils';

type ColumnMapping = {
  csvHeader: string;
  dbField: string;
  required: boolean;
  description: string;
};

const COLUMN_MAPPINGS: ColumnMapping[] = [
  { csvHeader: 'Numéro de badge', dbField: 'badgeNumber', required: true, description: 'Identifiant unique du badge' },
  { csvHeader: 'Date évènements', dbField: 'eventDate', required: true, description: 'Date de l\'événement (format DD/MM/YYYY)' },
  { csvHeader: 'Heure évènements', dbField: 'eventTime', required: true, description: 'Heure de l\'événement' },
  { csvHeader: 'Centrale', dbField: 'controller', required: false, description: 'Identifiant de la centrale' },
  { csvHeader: 'Lecteur', dbField: 'reader', required: false, description: 'Identifiant du lecteur' },
  { csvHeader: 'Nature Evenement', dbField: 'eventType', required: false, description: 'Type d\'événement (entrée, sortie, etc.)' },
  { csvHeader: 'Nom', dbField: 'lastName', required: false, description: 'Nom de famille' },
  { csvHeader: 'Prénom', dbField: 'firstName', required: false, description: 'Prénom' },
  { csvHeader: 'Statut', dbField: 'status', required: false, description: 'Statut de la personne' },
  { csvHeader: 'Groupe', dbField: 'group', required: false, description: 'Groupe auquel appartient la personne' },
];

type ImportResult = {
  success: boolean;
  message: string;
  stats?: {
    totalRecords: number;
    successfullyProcessed: number;
    skippedRecords: number;
    errorRecords: number;
    duplicates: number;
    employees: number;
    visitors: number;
    entriesCount: number;
    exitsCount: number;
    warnings: string[];
  };
};

export default function CsvImportPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('preview');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Effet pour simuler la progression
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isUploading) {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 40) {
            clearInterval(interval);
            return 40;
          }
          return prev + 2;
        });
      }, 100);
    } else if (isProcessing) {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 1;
        });
      }, 150);
    }
    
    return () => clearInterval(interval);
  }, [isUploading, isProcessing]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setErrorMessage(null);
    setValidationErrors([]);
    setPreviewData([]);
    setHeaders([]);
    setImportResult(null);
    setProgress(0);

    // Preview the CSV file
    previewCsv(selectedFile);
  };

  const previewCsv = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        
        // Vérifier si le fichier semble être un CSV valide
        if (!text.includes(';')) {
          setValidationErrors(['Le fichier ne semble pas être un CSV valide avec séparateur point-virgule (;)']);
          return;
        }
        
        const lines = text.split('\n').filter(line => line.trim() !== '');
        
        if (lines.length < 2) {
          setValidationErrors(['Le fichier ne contient pas de données ou est mal formaté']);
          return;
        }
        
        const headers = lines[0].split(';').map(h => h.trim());
        setHeaders(headers);
        
        // Vérifier si les en-têtes obligatoires sont présents
        const missingRequiredHeaders = COLUMN_MAPPINGS
          .filter(mapping => mapping.required)
          .filter(mapping => !headers.some(h => h.toLowerCase().includes(mapping.csvHeader.toLowerCase())))
          .map(mapping => mapping.csvHeader);
        
        if (missingRequiredHeaders.length > 0) {
          setValidationErrors([
            `Colonnes obligatoires manquantes: ${missingRequiredHeaders.join(', ')}`
          ]);
        }

        // Prendre jusqu'à 10 lignes pour la prévisualisation
        const preview: Record<string, string>[] = [];
        for (let i = 1; i <= Math.min(10, lines.length - 1); i++) {
          if (lines[i] && lines[i].trim() !== '') {
            const values = lines[i].split(';');
            
            // Vérifier les champs obligatoires
            const badgeIndex = headers.findIndex(h => h.toLowerCase().includes('badge'));
            const dateIndex = headers.findIndex(h => h.toLowerCase().includes('date'));
            const dateValue = values[dateIndex];
            const readerIndex = headers.findIndex(h => h.toLowerCase().includes('lecteur'));

            if (badgeIndex === -1 || !values[badgeIndex]?.trim()) {
              setValidationErrors(['Colonne "Numéro de badge" manquante ou vide']);
              return;
            }

            // Replace manual date validation with utility function
            if (!validateDateFormat(dateValue)) {
              validationErrors.push(`Date format invalide dans la ligne ${i+1}: ${dateValue}`);
              setValidationErrors(['Format de date invalide (DD/MM/YYYY requis)']);
              return;
            }

            const timeIndex = headers.findIndex(h => h.toLowerCase().includes('heure'));
            if (timeIndex === -1) {
              setValidationErrors(['Colonne "Heure évènements" manquante']);
              return;
            }

            // Normaliser le format d'heure: accepter HH:MM et le convertir en HH:MM:SS si nécessaire
            let timeValue = values[timeIndex]?.trim();
            if (!timeValue) {
              setValidationErrors(['Heure d\'événement manquante']);
              return;
            }

            // Vérifier d'abord si c'est au format HH:MM
            if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(timeValue)) {
              // Ajouter automatiquement les secondes (:00)
              values[timeIndex] = `${timeValue}:00`;
              console.log(`Format d'heure normalisé: ${timeValue} → ${values[timeIndex]}`);
            } 
            // Vérifier si c'est déjà au format HH:MM:SS
            else if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/.test(timeValue)) {
              setValidationErrors(['Format horaire invalide (HH:MM requis)']);
              return;
            }

            if (readerIndex === -1 || !values[readerIndex]?.trim()) {
              setValidationErrors(['Colonne "Lecteur" manquante ou vide']);
              return;
            }

            // Vérification des valeurs vides dans les colonnes obligatoires
            if (!values[badgeIndex]?.trim() || !values[dateIndex]?.trim() || !values[timeIndex]?.trim()) {
              setValidationErrors(['Des valeurs obligatoires sont manquantes dans certaines lignes']);
              return;
            }
            const row: Record<string, string> = {};
            headers.forEach((header, index) => {
              row[header] = values[index] || '';
            });
            preview.push(row);
          }
        }
        setPreviewData(preview);
        
        // Si la prévisualisation est réussie, basculer vers l'onglet de prévisualisation
        setActiveTab('preview');
      } catch (error) {
        console.error('Error previewing CSV:', error);
        setValidationErrors(['Une erreur est survenue lors de la lecture du fichier CSV']);
      }
    };
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setIsUploading(true);
      setProgress(25);

      // Lire le fichier et le convertir en base64
      const fileContent = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            resolve(e.target.result as string);
          } else {
            reject(new Error('Échec de la lecture du fichier'));
          }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file); // Lire comme texte pour les fichiers CSV
      });

      // Envoyer le fichier au format JSON
      const response = await axios.post('/api/import/csv/process', {
        filePath: file.name,
        fileContent: fileContent
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }
      });

      setIsUploading(false);
      setProgress(100);

      // Succès
      setImportResult({
        success: true,
        message: 'Importation réussie',
        stats: response.data.stats,
      });

    } catch (error) {
      setIsUploading(false);
      setIsProcessing(false);
      
      // Message d'erreur par défaut
      let errorMsg = "Une erreur est survenue lors de l'importation";
      
      // Analyser l'erreur pour fournir un message plus précis
      if (axios.isAxiosError(error)) {
        console.error('Axios error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers,
        });
        
        if (error.response?.data?.error) {
          errorMsg = error.response.data.error;
        } else if (error.response?.data?.message) {
          errorMsg = error.response.data.message;
        }
      } else if (error instanceof Error) {
        errorMsg = error.message;
      }
      
      setErrorMessage(errorMsg);
      
      // Afficher une notification d'erreur
      toast({
        title: "Erreur d'importation",
        description: errorMsg,
        variant: "destructive",
        duration: 5000,
      });
      
      // Réinitialiser l'interface après un court délai
      setTimeout(reset, 5000);
      
      console.error('Error uploading or processing CSV:', error);
    }
  };

  const reset = () => {
    setFile(null);
    setPreviewData([]);
    setHeaders([]);
    setImportResult(null);
    setProgress(0);
    setValidationErrors([]);
    setErrorMessage(null);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Importation de données CSV</h1>
      </div>
      
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Importer un fichier CSV</CardTitle>
            <CardDescription>
              Téléchargez un fichier CSV contenant les données d&apos;accès à importer
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!importResult ? (
              <div className="space-y-6">
                <div 
                  className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-12 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                  onClick={() => document.getElementById('csv-file')?.click()}
                >
                  <input
                    type="file"
                    id="csv-file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={isUploading || isProcessing}
                    aria-label="Sélectionner un fichier CSV à importer"
                  />
                  <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-lg font-medium">
                    {file ? file.name : 'Cliquez pour sélectionner un fichier CSV'}
                  </p>
                  {file && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      {(file.size / 1024 / 1024).toFixed(2)} MB • {new Date().toLocaleDateString()}
                    </p>
                  )}
                </div>

                {validationErrors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Erreurs de validation</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc pl-5 mt-2">
                        {validationErrors.map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {previewData.length > 0 && (
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid grid-cols-2">
                      <TabsTrigger value="preview">Aperçu des données</TabsTrigger>
                      <TabsTrigger value="mapping">Correspondance des champs</TabsTrigger>
                    </TabsList>
                    <TabsContent value="preview" className="space-y-4 mt-4">
                      <div className="overflow-x-auto border rounded-md">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {headers.slice(0, 8).map((header, i) => (
                                <TableHead key={i}>{header}</TableHead>
                              ))}
                              {headers.length > 8 && <TableHead>...</TableHead>}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {previewData.map((row, i) => (
                              <TableRow key={i}>
                                {headers.slice(0, 8).map((header, j) => (
                                  <TableCell key={j}>{row[header]}</TableCell>
                                ))}
                                {headers.length > 8 && <TableCell>...</TableCell>}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>
                    <TabsContent value="mapping" className="space-y-4 mt-4">
                      <Alert className="mb-4">
                        <Info className="h-4 w-4" />
                        <AlertTitle>Information sur les champs</AlertTitle>
                        <AlertDescription>
                          Cette table montre comment les colonnes de votre fichier CSV seront mappées dans la base de données.
                        </AlertDescription>
                      </Alert>
                      <div className="overflow-x-auto border rounded-md">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Colonne CSV</TableHead>
                              <TableHead>Champ BDD</TableHead>
                              <TableHead>Obligatoire</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Statut</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {COLUMN_MAPPINGS.map((mapping, i) => {
                              const found = headers.some(h => 
                                h.toLowerCase().includes(mapping.csvHeader.toLowerCase())
                              );
                              return (
                                <TableRow key={i}>
                                  <TableCell>{mapping.csvHeader}</TableCell>
                                  <TableCell className="font-mono text-xs">{mapping.dbField}</TableCell>
                                  <TableCell>{mapping.required ? 'Oui' : 'Non'}</TableCell>
                                  <TableCell>{mapping.description}</TableCell>
                                  <TableCell>
                                    {found ? (
                                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                                        Trouvé
                                      </Badge>
                                    ) : mapping.required ? (
                                      <Badge variant="destructive">Manquant</Badge>
                                    ) : (
                                      <Badge variant="outline">Non détecté</Badge>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>
                  </Tabs>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {importResult.success ? (
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                      <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                      <X className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>
                  )}
                  <div>
                    <h3 className={`text-lg font-medium ${importResult.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {importResult.success ? 'Importation réussie' : 'Erreur d\'importation'}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {importResult.message}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            {!importResult ? (
              <>
                <Button variant="outline" onClick={reset} disabled={!file || isUploading || isProcessing}>
                  Annuler
                </Button>
                <Button 
                  onClick={handleUpload} 
                  disabled={!file || isUploading || isProcessing || validationErrors.length > 0}
                >
                  {isUploading || isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isUploading ? 'Téléchargement...' : 'Traitement...'}
                    </>
                  ) : (
                    <>
                      <FileUp className="mr-2 h-4 w-4" />
                      Importer le fichier
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={reset}>
                  Importer un autre fichier
                </Button>
                <Button onClick={() => router.push('/attendance')}>
                  Voir les présences
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </>
            )}
          </CardFooter>
        </Card>

        {(isUploading || isProcessing) && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">
                    {isUploading ? 'Téléchargement du fichier...' : 'Traitement des données...'}
                  </span>
                  <span className="text-sm font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Étape {isUploading ? '1/2' : '2/2'}</span>
                  <Badge variant="outline">{file?.name}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {(errorMessage || importResult) && (
          <Card className="mt-4">
            <CardContent className="pt-6">
              {errorMessage ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Erreur d'importation</AlertTitle>
                  <AlertDescription>{errorMessage}</AlertDescription>
                  
                  <div className="mt-4">
                    <h4 className="font-medium">Conseils de dépannage :</h4>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                      <li>Vérifiez que toutes les lignes ont le même nombre de colonnes que l'en-tête</li>
                      <li>Assurez-vous que les colonnes requises (numéro de badge, date, heure) sont présentes</li>
                      <li>Contrôlez la configuration des séparateurs (le système attend des point-virgules)</li>
                      <li>Si vous avez des champs texte contenant des virgules, assurez-vous qu'ils sont entre guillemets</li>
                      <li>Vérifiez l'encodage du fichier (UTF-8 recommandé pour les caractères spéciaux)</li>
                    </ul>
                    
                    <h4 className="font-medium mt-4">Structure de fichier attendue :</h4>
                    <p className="text-sm mt-1">
                      Les colonnes requises sont : numéro de badge, date et heure d'événement. 
                      Les autres champs sont optionnels mais recommandés pour une meilleure qualité des données.
                    </p>
                  </div>
                </Alert>
              ) : importResult && (
                <Alert variant={importResult.success ? "default" : "destructive"}>
                  {importResult.success ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  <AlertTitle>{importResult.success ? "Importation réussie" : "Échec de l'importation"}</AlertTitle>
                  <AlertDescription>{importResult.message}</AlertDescription>
                  
                  {importResult.success && importResult.stats && (
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <h4 className="font-medium">Statistiques générales</h4>
                        <ul className="text-sm mt-2 space-y-1">
                          <li>Total des enregistrements: {importResult.stats.totalRecords}</li>
                          <li>Traités avec succès: {importResult.stats.successfullyProcessed}</li>
                          <li>Doublons ignorés: {importResult.stats.duplicates}</li>
                          <li>Enregistrements ignorés: {importResult.stats.skippedRecords}</li>
                          <li>Erreurs: {importResult.stats.errorRecords}</li>
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-medium">Type de données</h4>
                        <ul className="text-sm mt-2 space-y-1">
                          <li>Employés: {importResult.stats.employees}</li>
                          <li>Visiteurs: {importResult.stats.visitors}</li>
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-medium">Types d'événements</h4>
                        <ul className="text-sm mt-2 space-y-1">
                          <li>Entrées: {importResult.stats.entriesCount}</li>
                          <li>Sorties: {importResult.stats.exitsCount}</li>
                        </ul>
                      </div>
                      
                      {importResult.stats.warnings && importResult.stats.warnings.length > 0 && (
                        <div className="col-span-2 md:col-span-3">
                          <h4 className="font-medium">Avertissements</h4>
                          <ul className="text-sm mt-2 list-disc pl-5 space-y-1">
                            {importResult.stats.warnings.map((warning, index) => (
                              <li key={index}>{warning}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </Alert>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Note sur l'importation de données</CardTitle>
          <CardDescription>Informations importantes sur le processus d'importation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-4">
            <p>
              L'importation de fichiers CSV permet d'alimenter la base de données utilisée pour générer les tableaux de bord et les rapports. 
              Chaque fichier importé est analysé et les données sont stockées de manière structurée pour faciliter les requêtes et l'analyse.
            </p>
            <p>
              Le système identifie automatiquement le type de données (employés ou visiteurs) en fonction du contenu du fichier.
              Les données sont ensuite traitées et stockées dans les collections correspondantes de la base de données.
            </p>
            <div className="mt-4">
              <h4 className="font-medium mb-2">Format de fichier requis</h4>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Format :</strong> Fichiers CSV avec séparateur point-virgule (;)</li>
                <li><strong>Encodage :</strong> UTF-8</li>
                <li><strong>En-têtes :</strong> Le fichier doit contenir une ligne d'en-tête avec les noms des colonnes</li>
                <li>
                  <strong>Colonnes requises :</strong> 
                  <ul className="list-disc pl-5 mt-1">
                    <li>Numéro de badge</li>
                    <li>Date évènements (format DD/MM/YYYY)</li>
                    <li>Heure évènements</li>
                    <li>Centrale</li>
                    <li>Lecteur</li>
                    <li>Nature Evenement</li>
                    <li>Nom</li>
                    <li>Prénom</li>
                    <li>Statut</li>
                    <li>Groupe</li>
                  </ul>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}