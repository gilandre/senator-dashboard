'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Clock, 
  Calendar, 
  Save, 
  ArrowLeft, 
  RefreshCw, 
  Plus, 
  Trash2,
  AlertTriangle,
  Check,
  Loader2,
  CalendarDays,
  CalendarOff,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
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
  Checkbox
} from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CalendarIcon,
  Trash,
} from "lucide-react";

// Types
type HolidayType = 'national' | 'religious' | 'special' | 'continuous';

interface Holiday {
  _id?: string;
  id?: string;
  name: string;
  date: string; // Format YYYY-MM-DD
  type: HolidayType;
  description?: string;
  repeatsYearly: boolean;
}

interface AttendanceParameters {
  id?: string;
  // Heures de travail
  startHour: string;
  endHour: string;
  dailyHours: number;
  countWeekends: boolean;
  countHolidays: boolean;
  
  // Paramètres de pause
  lunchBreak: boolean;
  lunchBreakDuration: number;
  lunchBreakStart: string;
  lunchBreakEnd: string;
  allowOtherBreaks: boolean;
  maxBreakTime: number;

  // Dates limites
  absenceRequestDeadline: number;
  overtimeRequestDeadline: number;

  // Paramètres d'arrondi
  roundAttendanceTime: boolean;
  roundingInterval: number;
  roundingDirection: 'up' | 'down' | 'nearest';
}

export default function WorkCalendarPage() {
  const router = useRouter();
  const { toast } = useToast();

  // États pour les différentes configurations
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [parameters, setParameters] = useState<AttendanceParameters>({
    startHour: '08:00',
    endHour: '17:00',
    dailyHours: 8,
    countWeekends: false,
    countHolidays: false,
    lunchBreak: true,
    lunchBreakDuration: 60,
    lunchBreakStart: '12:00',
    lunchBreakEnd: '13:00',
    allowOtherBreaks: true,
    maxBreakTime: 30,
    absenceRequestDeadline: 3,
    overtimeRequestDeadline: 5,
    roundAttendanceTime: false,
    roundingInterval: 15,
    roundingDirection: 'nearest'
  });

  // État pour la gestion des jours fériés
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [newHoliday, setNewHoliday] = useState<Holiday>({
    name: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    type: 'national',
    repeatsYearly: false,
  });
  const [editMode, setEditMode] = useState(false);
  const [isAddingIvorianHolidays, setIsAddingIvorianHolidays] = useState(false);
  const [isLoadingHolidays, setIsLoadingHolidays] = useState(true);
  const [isAddingHoliday, setIsAddingHoliday] = useState(false);

  // Charger la configuration au chargement
  useEffect(() => {
    loadParameters();
    loadHolidays();
  }, []);

  // Fonctions pour charger les données
  const loadParameters = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/config/attendance');
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des paramètres');
      }
      const data = await response.json();
      setParameters(data);
    } catch (error) {
      console.error('Erreur:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les paramètres",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadHolidays = async () => {
    setIsLoadingHolidays(true);
    try {
      const response = await fetch('/api/holidays');
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des jours fériés');
      }
      const data = await response.json();
      
      // Accéder à la propriété holidays de la réponse
      const holidays = data.holidays || [];
      
      console.log('Jours fériés chargés:', holidays.map((h: any) => ({ id: h.id, name: h.name })));
      setHolidays(holidays);
    } catch (error) {
      console.error('Erreur:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les jours fériés",
        variant: "destructive"
      });
    } finally {
      setIsLoadingHolidays(false);
    }
  };

  // Fonction pour sauvegarder la configuration
  const saveParameters = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/config/attendance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parameters)
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la sauvegarde des paramètres');
      }

      toast({
        title: "Succès",
        description: "Paramètres sauvegardés avec succès",
        variant: "default"
      });
    } catch (error) {
      console.error('Erreur:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les paramètres",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Gérer l'ajout d'un nouveau jour férié
  const handleAddHoliday = async () => {
    try {
      setIsAddingHoliday(true);
      
      // Validate the holiday
      if (!newHoliday.name) {
        toast({
          title: "Nom requis",
          description: "Veuillez saisir un nom pour le jour férié",
          variant: "destructive",
        });
        return;
      }
      
      // Format the date for submission
      const formattedDate = format(newHoliday.date, 'yyyy-MM-dd');
      
      // Make the API call
      const response = await fetch('/api/holidays', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newHoliday,
          date: formattedDate,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de l'ajout du jour férié");
      }
      
      // Reset the form
      setNewHoliday({
        name: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        type: 'national',
        repeatsYearly: false,
      });
      
      // Reload the holidays
      await loadHolidays();
      
      toast({
        title: "Jour férié ajouté",
        description: "Le jour férié a été ajouté avec succès",
      });
    } catch (error: any) {
      console.error('Erreur lors de l\'ajout du jour férié:', error);
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de l'ajout du jour férié",
        variant: "destructive",
      });
    } finally {
      setIsAddingHoliday(false);
    }
  };

  // Gérer la suppression d'un jour férié
  const handleDeleteHoliday = async (id: string) => {
    if (!id) {
      toast({
        title: "Erreur",
        description: "ID du jour férié manquant",
        variant: "destructive"
      });
      return;
    }

    if (!confirm('Êtes-vous sûr de vouloir supprimer ce jour férié?')) {
      return;
    }

    try {
      console.log("Suppression du jour férié avec ID:", id);
      const url = `/api/holidays/${id}`;
      console.log("URL de suppression:", url);
      
      const response = await fetch(url, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Erreur de suppression:', response.status, errorData);
        throw new Error(`Erreur lors de la suppression du jour férié: ${response.status}`);
      }

      loadHolidays();
      
      toast({
        title: "Succès",
        description: "Jour férié supprimé avec succès",
        variant: "default"
      });
    } catch (error) {
      console.error('Erreur:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le jour férié",
        variant: "destructive"
      });
    }
  };

  // Ajouter des jours fériés de la Côte d'Ivoire
  const addIvorianHolidays = async () => {
    setIsAddingIvorianHolidays(true);
    try {
      const currentYear = new Date().getFullYear();
      const ivorianHolidays: Holiday[] = [
        { name: "Jour de l'An", date: `${currentYear}-01-01`, type: 'national', description: 'Jour férié national', repeatsYearly: true },
        { name: "Fête du Travail", date: `${currentYear}-05-01`, type: 'national', description: 'Fête internationale du travail', repeatsYearly: true },
        { name: "Fête Nationale", date: `${currentYear}-08-07`, type: 'national', description: 'Commémoration de l\'indépendance', repeatsYearly: true },
        { name: "Assomption", date: `${currentYear}-08-15`, type: 'religious', description: 'Fête catholique', repeatsYearly: true },
        { name: "Toussaint", date: `${currentYear}-11-01`, type: 'religious', description: 'Fête catholique', repeatsYearly: true },
        { name: "Journée Nationale de la Paix", date: `${currentYear}-11-15`, type: 'national', description: 'Journée de la paix', repeatsYearly: true },
        { name: "Noël", date: `${currentYear}-12-25`, type: 'religious', description: 'Fête chrétienne', repeatsYearly: true },
        // Note: Les fêtes musulmanes varient d'année en année selon le calendrier lunaire
        // Ces dates doivent être mises à jour annuellement
      ];

      // Récupérer les jours fériés existants pour vérifier les doublons
      const response = await fetch('/api/holidays');
      const existingHolidays = await response.json();
      
      const existingDates = new Set(existingHolidays.map((h: any) => h.date.substring(0, 10)));
      
      let addedCount = 0;
      let skippedCount = 0;

      // Ajouter chaque jour férié s'il n'existe pas déjà
      for (const holiday of ivorianHolidays) {
        // Vérifier si un jour férié existe déjà à cette date
        if (existingDates.has(holiday.date)) {
          console.log(`Jour férié déjà existant à la date ${holiday.date}: ${holiday.name}`);
          skippedCount++;
          continue;
        }
        
        const response = await fetch('/api/holidays', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(holiday)
        });

        if (!response.ok) {
          // Si le statut est 409 (conflit), c'est un doublon
          if (response.status === 409) {
            skippedCount++;
            continue;
          }
          throw new Error(`Erreur lors de l'ajout du jour férié: ${holiday.name}`);
        }
        
        addedCount++;
      }

      await loadHolidays();
      
      // Message différent selon le résultat
      if (addedCount > 0) {
        toast({
          title: "Jours fériés ajoutés",
          description: `${addedCount} jour(s) férié(s) ajouté(s) avec succès${skippedCount > 0 ? `, ${skippedCount} ignoré(s) car déjà existant(s)` : ''}`,
          variant: "default"
        });
      } else {
        toast({
          title: "Aucun ajout",
          description: "Tous les jours fériés existaient déjà dans le système",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout des jours fériés:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter les jours fériés",
        variant: "destructive"
      });
    } finally {
      setIsAddingIvorianHolidays(false);
    }
  };

  // Fonctions utilitaires
  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'dd MMMM yyyy', { locale: fr });
  };

  const getTypeLabel = (type: string): string => {
    switch (type) {
      case 'national':
        return 'National';
      case 'religious':
        return 'Religieux';
      case 'special':
        return 'Spécial';
      case 'continuous':
        return 'Jour continu';
      default:
        return type;
    }
  };

  const getTypeBadgeColor = (type: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (type) {
      case 'national':
        return 'default';
      case 'religious':
        return 'secondary';
      case 'special':
        return 'destructive';
      case 'continuous':
        return 'outline';
      default:
        return 'default';
    }
  };

  // Render JSX
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="ghost" onClick={() => router.push('/settings')} className="mr-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <h1 className="text-2xl font-bold">Gestion du temps et présences</h1>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={loadParameters} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Button onClick={saveParameters} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            Enregistrer
          </Button>
        </div>
      </div>

      <p className="text-muted-foreground">
        Configurez les horaires de travail, les pauses, et gérez les jours fériés qui affectent le calcul des heures de présence.
      </p>

      <Tabs defaultValue="working-hours" className="space-y-4">
        <TabsList className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4">
          <TabsTrigger value="working-hours" className="flex items-center justify-center">
            <Clock className="h-4 w-4 mr-2" />
            Heures de travail
          </TabsTrigger>
          <TabsTrigger value="breaks" className="flex items-center justify-center">
            <Clock className="h-4 w-4 mr-2" />
            Pauses
          </TabsTrigger>
          <TabsTrigger value="holidays" className="flex items-center justify-center">
            <Calendar className="h-4 w-4 mr-2" />
            Jours fériés
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center justify-center">
            <Calendar className="h-4 w-4 mr-2" />
            Paramètres avancés
          </TabsTrigger>
        </TabsList>

        {/* Contenu Heures de travail */}
        <TabsContent value="working-hours">
          <Card>
            <CardHeader>
              <CardTitle>Heures de travail</CardTitle>
              <CardDescription>
                Définissez les horaires standards de travail et les règles de calcul des heures.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startHour">Heure de début</Label>
                  <Input
                    id="startHour"
                    type="time"
                    value={parameters.startHour}
                    onChange={(e) => setParameters({ ...parameters, startHour: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endHour">Heure de fin</Label>
                  <Input
                    id="endHour"
                    type="time"
                    value={parameters.endHour}
                    onChange={(e) => setParameters({ ...parameters, endHour: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dailyHours">Heures de travail par jour</Label>
                <Input
                  id="dailyHours"
                  type="number"
                  min="1"
                  max="24"
                  step="0.5"
                  value={parameters.dailyHours}
                  onChange={(e) => setParameters({ ...parameters, dailyHours: Number(e.target.value) })}
                />
                <p className="text-sm text-muted-foreground">
                  Définit le nombre d'heures standard dans une journée de travail
                </p>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="countWeekends">Compter les weekends</Label>
                  <p className="text-sm text-muted-foreground">
                    Inclure les weekends dans le calcul des heures de présence
                  </p>
                </div>
                <Switch
                  id="countWeekends"
                  checked={parameters.countWeekends}
                  onCheckedChange={(checked: boolean) => setParameters({ ...parameters, countWeekends: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="countHolidays">Compter les jours fériés</Label>
                  <p className="text-sm text-muted-foreground">
                    Inclure les jours fériés dans le calcul des heures de présence
                  </p>
                </div>
                <Switch
                  id="countHolidays"
                  checked={parameters.countHolidays}
                  onCheckedChange={(checked: boolean) => setParameters({ ...parameters, countHolidays: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contenu Pauses */}
        <TabsContent value="breaks">
          <Card>
            <CardHeader>
              <CardTitle>Pauses</CardTitle>
              <CardDescription>
                Configurez les règles de pause déjeuner et autres pauses.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="lunchBreak">Pause déjeuner</Label>
                  <p className="text-sm text-muted-foreground">
                    Activer le décompte automatique de la pause déjeuner
                  </p>
                </div>
                <Switch
                  id="lunchBreak"
                  checked={parameters.lunchBreak}
                  onCheckedChange={(checked: boolean) => setParameters({ ...parameters, lunchBreak: checked })}
                />
              </div>

              {parameters.lunchBreak && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="lunchBreakStart">Début de la pause déjeuner</Label>
                      <Input
                        id="lunchBreakStart"
                        type="time"
                        value={parameters.lunchBreakStart}
                        onChange={(e) => setParameters({ ...parameters, lunchBreakStart: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lunchBreakEnd">Fin de la pause déjeuner</Label>
                      <Input
                        id="lunchBreakEnd"
                        type="time"
                        value={parameters.lunchBreakEnd}
                        onChange={(e) => setParameters({ ...parameters, lunchBreakEnd: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lunchBreakDuration">Durée de la pause déjeuner (minutes)</Label>
                    <Input
                      id="lunchBreakDuration"
                      type="number"
                      min="15"
                      max="120"
                      value={parameters.lunchBreakDuration}
                      onChange={(e) => setParameters({ ...parameters, lunchBreakDuration: Number(e.target.value) })}
                    />
                    <p className="text-sm text-muted-foreground">
                      Cette durée sera déduite automatiquement du temps de présence
                    </p>
                  </div>
                </>
              )}

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="allowOtherBreaks">Autres pauses</Label>
                  <p className="text-sm text-muted-foreground">
                    Autoriser d'autres pauses à être décomptées du temps de travail
                  </p>
                </div>
                <Switch
                  id="allowOtherBreaks"
                  checked={parameters.allowOtherBreaks}
                  onCheckedChange={(checked: boolean) => setParameters({ ...parameters, allowOtherBreaks: checked })}
                />
              </div>

              {parameters.allowOtherBreaks && (
                <div className="space-y-2">
                  <Label htmlFor="maxBreakTime">Temps de pause maximum par jour (minutes)</Label>
                  <Input
                    id="maxBreakTime"
                    type="number"
                    min="5"
                    max="60"
                    value={parameters.maxBreakTime}
                    onChange={(e) => setParameters({ ...parameters, maxBreakTime: Number(e.target.value) })}
                  />
                  <p className="text-sm text-muted-foreground">
                    Limite le temps total des pauses supplémentaires (hors déjeuner)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contenu Jours fériés */}
        <TabsContent value="holidays">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Jours fériés</CardTitle>
                <CardDescription>
                  Gérer les jours fériés et les congés spéciaux.
                </CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={addIvorianHolidays}
                  disabled={isAddingIvorianHolidays}
                >
                  {isAddingIvorianHolidays ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Ajout en cours...
                    </>
                  ) : (
                    <>
                      <CalendarDays className="mr-2 h-4 w-4" />
                      Jours fériés CI
                    </>
                  )}
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Ajouter
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Ajouter un jour férié</DialogTitle>
                      <DialogDescription>
                        Ajoutez un jour férié ou un congé spécial au calendrier.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <div className="space-y-2">
                        <Label htmlFor="holiday-name">Nom</Label>
                        <Input
                          id="holiday-name"
                          placeholder="Nom du jour férié"
                          value={newHoliday.name}
                          onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="holiday-date">Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                              id="holiday-date"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {newHoliday.date ? format(new Date(newHoliday.date), 'PPP', { locale: fr }) : "Sélectionner une date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <div className="p-3">
                              <Input
                                type="date"
                                value={newHoliday.date}
                                onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
                              />
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="holiday-type">Type</Label>
                        <Select
                          value={newHoliday.type}
                          onValueChange={(value) => setNewHoliday({ ...newHoliday, type: value as HolidayType })}
                        >
                          <SelectTrigger id="holiday-type">
                            <SelectValue placeholder="Sélectionner un type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="national">Jour férié public</SelectItem>
                            <SelectItem value="religious">Congé entreprise</SelectItem>
                            <SelectItem value="special">Événement spécial</SelectItem>
                            <SelectItem value="continuous">Journée continue</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="repeat-yearly"
                            checked={newHoliday.repeatsYearly}
                            onCheckedChange={(checked) => setNewHoliday({ ...newHoliday, repeatsYearly: !!checked })}
                          />
                          <label
                            htmlFor="repeat-yearly"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            Se répète chaque année
                          </label>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => {
                        setNewHoliday({
                          name: "",
                          date: "",
                          type: "national",
                          repeatsYearly: false,
                        });
                      }}>
                        Annuler
                      </Button>
                      <Button 
                        onClick={handleAddHoliday}
                        disabled={isAddingHoliday}
                      >
                        {isAddingHoliday && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Ajouter
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingHolidays ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : holidays.length === 0 ? (
                <div className="text-center py-6">
                  <CalendarOff className="h-12 w-12 mx-auto text-muted-foreground" />
                  <h3 className="mt-2 text-lg font-medium">Aucun jour férié</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Ajoutez des jours fériés pour les exclure du calcul du temps de travail.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Répétition</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {holidays.map((holiday) => (
                      <TableRow key={holiday.id || holiday._id}>
                        <TableCell>{holiday.name}</TableCell>
                        <TableCell>{formatDate(holiday.date)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getTypeBadgeColor(holiday.type)}>
                            {getTypeLabel(holiday.type)}
                          </Badge>
                        </TableCell>
                        <TableCell>{holiday.repeatsYearly ? "Annuelle" : "Unique"}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleDeleteHoliday(holiday.id || holiday._id || '')}
                              >
                                <Trash className="mr-2 h-4 w-4" />
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contenu Paramètres avancés */}
        <TabsContent value="advanced">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres avancés</CardTitle>
              <CardDescription>
                Configurez les options avancées de calcul et de gestion des heures.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Règles d'arrondi du temps</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="roundAttendanceTime">Arrondir les temps de présence</Label>
                      <p className="text-sm text-muted-foreground">
                        Arrondir les heures d'entrée et de sortie pour simplifier le calcul
                      </p>
                    </div>
                    <Switch
                      id="roundAttendanceTime"
                      checked={parameters.roundAttendanceTime}
                      onCheckedChange={(checked: boolean) => setParameters({ ...parameters, roundAttendanceTime: checked })}
                    />
                  </div>

                  {parameters.roundAttendanceTime && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="roundingInterval">Intervalle d'arrondi (minutes)</Label>
                        <Select
                          value={parameters.roundingInterval.toString()}
                          onValueChange={(value) => setParameters({ ...parameters, roundingInterval: Number(value) })}
                        >
                          <SelectTrigger id="roundingInterval">
                            <SelectValue placeholder="Sélectionner un intervalle" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">5 minutes</SelectItem>
                            <SelectItem value="10">10 minutes</SelectItem>
                            <SelectItem value="15">15 minutes</SelectItem>
                            <SelectItem value="30">30 minutes</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground">
                          Les temps seront arrondis au plus proche intervalle
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="roundingDirection">Direction d'arrondi</Label>
                        <Select
                          value={parameters.roundingDirection}
                          onValueChange={(value) => setParameters({ ...parameters, roundingDirection: value as 'up' | 'down' | 'nearest' })}
                        >
                          <SelectTrigger id="roundingDirection">
                            <SelectValue placeholder="Sélectionner une direction" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="up">Arrondir vers le haut</SelectItem>
                            <SelectItem value="down">Arrondir vers le bas</SelectItem>
                            <SelectItem value="nearest">Arrondir au plus proche</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground">
                          Détermine comment les temps sont arrondis (ex: 8h08 peut devenir 8h00, 8h15, etc.)
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-medium mb-4">Délais de demande</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="absenceRequestDeadline">Délai de demande d'absence (jours)</Label>
                    <Input
                      id="absenceRequestDeadline"
                      type="number"
                      min="1"
                      max="30"
                      value={parameters.absenceRequestDeadline}
                      onChange={(e) => setParameters({ ...parameters, absenceRequestDeadline: Number(e.target.value) })}
                    />
                    <p className="text-sm text-muted-foreground">
                      Nombre de jours minimum avant une absence pour soumettre une demande
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="overtimeRequestDeadline">Délai déclaration heures supplémentaires (jours)</Label>
                    <Input
                      id="overtimeRequestDeadline"
                      type="number"
                      min="1"
                      max="30"
                      value={parameters.overtimeRequestDeadline}
                      onChange={(e) => setParameters({ ...parameters, overtimeRequestDeadline: Number(e.target.value) })}
                    />
                    <p className="text-sm text-muted-foreground">
                      Nombre de jours maximum après des heures supplémentaires pour les déclarer
                    </p>
                  </div>
                </div>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Important</AlertTitle>
                <AlertDescription>
                  Ces paramètres avancés affectent le calcul des heures de présence et les règles d'approbation. Assurez-vous de bien comprendre leur impact avant de les modifier.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 