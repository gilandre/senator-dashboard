'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Check, Undo } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

export default function InterfacePage() {
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  
  // Paramètres d'interface
  const [settings, setSettings] = useState({
    // Paramètres généraux
    appName: 'SENATOR INVESTECH',
    appLogo: '/logo.png',
    darkMode: false,
    sidebarCollapsed: false,
    animationsEnabled: true,
    
    // Paramètres de thème
    primaryColor: '#0070f3',
    secondaryColor: '#1e293b',
    accentColor: '#f59e0b',
    
    // Paramètres de tableau
    tableRowsPerPage: 10,
    tableRowHeight: 'medium',
    tableDensity: 'comfortable',
    tableStriped: true,
    tableShowBorders: true,
    
    // Paramètres de notification
    notificationPosition: 'top-right',
    notificationDuration: 5000,
    soundEnabled: true,
    desktopNotifications: false
  });
  
  // Options pour les paramètres
  const tableRowsOptions = [5, 10, 15, 20, 25, 50, 100];
  const tableRowHeightOptions = [
    { value: 'compact', label: 'Compact' },
    { value: 'medium', label: 'Moyen' },
    { value: 'relaxed', label: 'Détendu' }
  ];
  const tableDensityOptions = [
    { value: 'compact', label: 'Compact' },
    { value: 'comfortable', label: 'Confortable' },
    { value: 'spacious', label: 'Spacieux' }
  ];
  const notificationPositionOptions = [
    { value: 'top-right', label: 'Haut droite' },
    { value: 'top-left', label: 'Haut gauche' },
    { value: 'bottom-right', label: 'Bas droite' },
    { value: 'bottom-left', label: 'Bas gauche' },
    { value: 'top-center', label: 'Haut centre' },
    { value: 'bottom-center', label: 'Bas centre' }
  ];

  useEffect(() => {
    // Simule le chargement des paramètres depuis l'API
    setTimeout(() => {
      // Dans une implémentation réelle, on récupérerait les paramètres depuis l'API
      setIsLoading(false);
    }, 1000);
  }, []);

  const handleReset = () => {
    if (confirm('Êtes-vous sûr de vouloir réinitialiser tous les paramètres d\'interface ?')) {
      setIsSaving(true);
      
      // Simuler une requête API
      setTimeout(() => {
        setSettings({
          // Paramètres généraux
          appName: 'SENATOR INVESTECH',
          appLogo: '/logo.png',
          darkMode: false,
          sidebarCollapsed: false,
          animationsEnabled: true,
          
          // Paramètres de thème
          primaryColor: '#0070f3',
          secondaryColor: '#1e293b',
          accentColor: '#f59e0b',
          
          // Paramètres de tableau
          tableRowsPerPage: 10,
          tableRowHeight: 'medium',
          tableDensity: 'comfortable',
          tableStriped: true,
          tableShowBorders: true,
          
          // Paramètres de notification
          notificationPosition: 'top-right',
          notificationDuration: 5000,
          soundEnabled: true,
          desktopNotifications: false
        });
        
        setIsSaving(false);
        toast({
          title: "Réinitialisation réussie",
          description: "Les paramètres d'interface ont été réinitialisés aux valeurs par défaut."
        });
      }, 1000);
    }
  };

  const handleSave = () => {
    setIsSaving(true);
    
    // Simuler une requête API
    setTimeout(() => {
      setIsSaving(false);
      toast({
        title: "Enregistrement réussi",
        description: "Les paramètres d'interface ont été enregistrés avec succès."
      });
    }, 1000);
  };

  const handleChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (status === 'unauthenticated' || !session?.user?.role || session.user.role !== 'admin') {
    return (
      <Card className="p-4">
        <div className="text-center text-red-500">
          Vous n'avez pas les droits nécessaires pour accéder à cette page.
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Paramètres d'interface</h1>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleReset} disabled={isLoading || isSaving}>
            <Undo className="h-4 w-4 mr-2" />
            Réinitialiser
          </Button>
          <Button onClick={handleSave} disabled={isLoading || isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            Enregistrer
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">Général</TabsTrigger>
          <TabsTrigger value="theme">Thème</TabsTrigger>
          <TabsTrigger value="table">Tableaux</TabsTrigger>
          <TabsTrigger value="notification">Notifications</TabsTrigger>
        </TabsList>
        
        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin" />
            </CardContent>
          </Card>
        ) : (
          <>
            <TabsContent value="general" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Paramètres généraux</CardTitle>
                  <CardDescription>
                    Configurez les paramètres généraux de l'application.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="appName">Nom de l'application</Label>
                    <Input
                      id="appName"
                      value={settings.appName}
                      onChange={(e) => handleChange('appName', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="appLogo">Logo de l'application</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="appLogo"
                        value={settings.appLogo}
                        onChange={(e) => handleChange('appLogo', e.target.value)}
                      />
                      <Button variant="outline" className="shrink-0">
                        Parcourir...
                      </Button>
                    </div>
                    {settings.appLogo && (
                      <div className="mt-2 p-2 border rounded">
                        <img
                          src={settings.appLogo}
                          alt="Logo de l'application"
                          className="h-12 object-contain"
                          onError={(e) => {
                            // Use a local fallback instead of external placeholder
                            (e.target as HTMLImageElement).src = '/logo.png';
                          }}
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="darkMode">Mode sombre</Label>
                    <Switch
                      id="darkMode"
                      checked={settings.darkMode}
                      onCheckedChange={(checked) => handleChange('darkMode', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="sidebarCollapsed">Barre latérale réduite par défaut</Label>
                    <Switch
                      id="sidebarCollapsed"
                      checked={settings.sidebarCollapsed}
                      onCheckedChange={(checked) => handleChange('sidebarCollapsed', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="animationsEnabled">Activer les animations</Label>
                    <Switch
                      id="animationsEnabled"
                      checked={settings.animationsEnabled}
                      onCheckedChange={(checked) => handleChange('animationsEnabled', checked)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="theme" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Paramètres de thème</CardTitle>
                  <CardDescription>
                    Personnalisez l'apparence de l'application.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="primaryColor">Couleur principale</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="primaryColor"
                        value={settings.primaryColor}
                        onChange={(e) => handleChange('primaryColor', e.target.value)}
                      />
                      <div
                        className="w-10 h-10 rounded border"
                        style={{ backgroundColor: settings.primaryColor }}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="secondaryColor">Couleur secondaire</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="secondaryColor"
                        value={settings.secondaryColor}
                        onChange={(e) => handleChange('secondaryColor', e.target.value)}
                      />
                      <div
                        className="w-10 h-10 rounded border"
                        style={{ backgroundColor: settings.secondaryColor }}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="accentColor">Couleur d'accent</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="accentColor"
                        value={settings.accentColor}
                        onChange={(e) => handleChange('accentColor', e.target.value)}
                      />
                      <div
                        className="w-10 h-10 rounded border"
                        style={{ backgroundColor: settings.accentColor }}
                      />
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <Label>Aperçu du thème</Label>
                    <div className="mt-2 p-4 border rounded">
                      <div className="space-y-4">
                        <div style={{ backgroundColor: settings.primaryColor }} className="p-2 text-white rounded">
                          Couleur principale
                        </div>
                        <div style={{ backgroundColor: settings.secondaryColor }} className="p-2 text-white rounded">
                          Couleur secondaire
                        </div>
                        <div style={{ backgroundColor: settings.accentColor }} className="p-2 text-white rounded">
                          Couleur d'accent
                        </div>
                        <div className="flex space-x-2">
                          <Button style={{ backgroundColor: settings.primaryColor }}>
                            Bouton principal
                          </Button>
                          <Button variant="outline" style={{ borderColor: settings.secondaryColor, color: settings.secondaryColor }}>
                            Bouton secondaire
                          </Button>
                          <Button style={{ backgroundColor: settings.accentColor }}>
                            Bouton d'accent
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="table" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Paramètres des tableaux</CardTitle>
                  <CardDescription>
                    Configurez l'apparence et le comportement des tableaux de données.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="tableRowsPerPage">Lignes par page</Label>
                    <Select
                      value={settings.tableRowsPerPage.toString()}
                      onValueChange={(value) => handleChange('tableRowsPerPage', parseInt(value))}
                    >
                      <SelectTrigger id="tableRowsPerPage">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        {tableRowsOptions.map(option => (
                          <SelectItem key={option} value={option.toString()}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="tableRowHeight">Hauteur des lignes</Label>
                    <Select
                      value={settings.tableRowHeight}
                      onValueChange={(value) => handleChange('tableRowHeight', value)}
                    >
                      <SelectTrigger id="tableRowHeight">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        {tableRowHeightOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="tableDensity">Densité du tableau</Label>
                    <RadioGroup
                      value={settings.tableDensity}
                      onValueChange={(value) => handleChange('tableDensity', value)}
                      className="flex space-x-4"
                    >
                      {tableDensityOptions.map(option => (
                        <div key={option.value} className="flex items-center space-x-2">
                          <RadioGroupItem value={option.value} id={`density-${option.value}`} />
                          <Label htmlFor={`density-${option.value}`}>{option.label}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                  
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="tableStriped">Lignes alternées</Label>
                    <Switch
                      id="tableStriped"
                      checked={settings.tableStriped}
                      onCheckedChange={(checked) => handleChange('tableStriped', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="tableShowBorders">Afficher les bordures</Label>
                    <Switch
                      id="tableShowBorders"
                      checked={settings.tableShowBorders}
                      onCheckedChange={(checked) => handleChange('tableShowBorders', checked)}
                    />
                  </div>
                  
                  <div className="pt-4">
                    <Label>Aperçu du tableau</Label>
                    <div className="mt-2 border rounded overflow-hidden">
                      <table className={cn(
                        "w-full",
                        settings.tableStriped && "table-striped",
                        settings.tableShowBorders ? "border-collapse" : "border-separate border-spacing-0",
                        {
                          "text-sm": settings.tableRowHeight === "compact",
                          "text-base": settings.tableRowHeight === "medium",
                          "text-lg": settings.tableRowHeight === "relaxed",
                        },
                        {
                          "": settings.tableDensity === "compact",
                          "": settings.tableDensity === "comfortable",
                          "": settings.tableDensity === "spacious",
                        }
                      )}>
                        <thead>
                          <tr className={cn(
                            "bg-muted/50",
                            settings.tableShowBorders && "border-b"
                          )}>
                            <th className={cn(
                              "px-4 py-2 text-left font-medium",
                              settings.tableShowBorders && "border"
                            )}>ID</th>
                            <th className={cn(
                              "px-4 py-2 text-left font-medium",
                              settings.tableShowBorders && "border"
                            )}>Nom</th>
                            <th className={cn(
                              "px-4 py-2 text-left font-medium",
                              settings.tableShowBorders && "border"
                            )}>Email</th>
                            <th className={cn(
                              "px-4 py-2 text-left font-medium",
                              settings.tableShowBorders && "border"
                            )}>Statut</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[1, 2, 3].map((i) => (
                            <tr key={i} className={cn(
                              settings.tableStriped && i % 2 === 0 ? "bg-muted/20" : "",
                              settings.tableShowBorders && "border-b"
                            )}>
                              <td className={cn(
                                "px-4 py-2",
                                settings.tableShowBorders && "border"
                              )}>{i}</td>
                              <td className={cn(
                                "px-4 py-2",
                                settings.tableShowBorders && "border"
                              )}>Utilisateur {i}</td>
                              <td className={cn(
                                "px-4 py-2",
                                settings.tableShowBorders && "border"
                              )}>utilisateur{i}@example.com</td>
                              <td className={cn(
                                "px-4 py-2",
                                settings.tableShowBorders && "border"
                              )}>Actif</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="notification" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Paramètres de notification</CardTitle>
                  <CardDescription>
                    Configurez comment les notifications sont affichées dans l'application.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="notificationPosition">Position des notifications</Label>
                    <Select
                      value={settings.notificationPosition}
                      onValueChange={(value) => handleChange('notificationPosition', value)}
                    >
                      <SelectTrigger id="notificationPosition">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        {notificationPositionOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="notificationDuration">Durée d'affichage (ms)</Label>
                    <Input
                      id="notificationDuration"
                      type="number"
                      min={1000}
                      max={20000}
                      step={1000}
                      value={settings.notificationDuration}
                      onChange={(e) => handleChange('notificationDuration', parseInt(e.target.value))}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="soundEnabled">Sons de notification</Label>
                    <Switch
                      id="soundEnabled"
                      checked={settings.soundEnabled}
                      onCheckedChange={(checked) => handleChange('soundEnabled', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="desktopNotifications">Notifications bureau (navigateur)</Label>
                    <Switch
                      id="desktopNotifications"
                      checked={settings.desktopNotifications}
                      onCheckedChange={(checked) => handleChange('desktopNotifications', checked)}
                    />
                  </div>
                  
                  <div className="pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        toast({
                          title: "Notification de test",
                          description: "Ceci est une notification de test pour prévisualiser vos paramètres."
                        });
                      }}
                    >
                      Afficher une notification de test
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
} 