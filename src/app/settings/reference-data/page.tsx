'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Search, Plus, Edit, Trash, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';

type ReferenceDataItem = {
  id: number;
  code: string;
  value: string;
  display_name: string;
  description?: string;
  type: string;
  module: string;
  feature?: string;
  is_active: boolean;
  sort_order: number;
  color_code?: string;
  icon_name?: string;
};

export default function ReferenceDataPage() {
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [referenceData, setReferenceData] = useState<ReferenceDataItem[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<Partial<ReferenceDataItem> | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Types de données de référence disponibles
  const modules = [
    { value: 'users', label: 'Utilisateurs' },
    { value: 'access', label: 'Contrôle d\'accès' },
    { value: 'employees', label: 'Employés' },
    { value: 'documents', label: 'Documents' },
    { value: 'system', label: 'Système' },
    { value: 'security', label: 'Sécurité' }
  ];

  // Types d'éléments pour chaque module
  const typesByModule: Record<string, Array<{ value: string, label: string }>> = {
    users: [
      { value: 'status', label: 'Statut' },
      { value: 'role', label: 'Rôle' },
      { value: 'permission', label: 'Permission' }
    ],
    access: [
      { value: 'card_type', label: 'Type de carte' },
      { value: 'access_level', label: 'Niveau d\'accès' },
      { value: 'reader_type', label: 'Type de lecteur' }
    ],
    employees: [
      { value: 'department', label: 'Département' },
      { value: 'position', label: 'Poste' },
      { value: 'status', label: 'Statut' }
    ],
    documents: [
      { value: 'type', label: 'Type de document' },
      { value: 'status', label: 'Statut' },
      { value: 'category', label: 'Catégorie' }
    ],
    system: [
      { value: 'event_type', label: 'Type d\'événement' },
      { value: 'severity', label: 'Niveau de sévérité' },
      { value: 'configuration', label: 'Configuration' }
    ],
    security: [
      { value: 'default_password', label: 'Mots de passe par défaut' },
      { value: 'security_level', label: 'Niveau de sécurité' },
      { value: 'auth_method', label: 'Méthode d\'authentification' }
    ]
  };

  useEffect(() => {
    // Simulation de chargement des données
    setTimeout(() => {
      // Données simulées
      const mockData: ReferenceDataItem[] = [
        {
          id: 1,
          code: 'active',
          value: 'active',
          display_name: 'Actif',
          description: 'Utilisateur actif dans le système',
          type: 'status',
          module: 'users',
          feature: undefined,
          is_active: true,
          sort_order: 1,
          color_code: '#4CAF50',
          icon_name: 'check-circle'
        },
        {
          id: 2,
          code: 'inactive',
          value: 'inactive',
          display_name: 'Inactif',
          description: 'Utilisateur désactivé',
          type: 'status',
          module: 'users',
          feature: undefined,
          is_active: true,
          sort_order: 2,
          color_code: '#F44336',
          icon_name: 'x-circle'
        },
        {
          id: 3,
          code: 'admin',
          value: 'admin',
          display_name: 'Administrateur',
          description: 'Administrateur du système',
          type: 'role',
          module: 'users',
          feature: undefined,
          is_active: true,
          sort_order: 1,
          color_code: '#2196F3',
          icon_name: 'shield'
        },
        {
          id: 4,
          code: 'user',
          value: 'user',
          display_name: 'Utilisateur',
          description: 'Utilisateur standard',
          type: 'role',
          module: 'users',
          feature: undefined,
          is_active: true,
          sort_order: 2,
          color_code: '#9E9E9E',
          icon_name: 'user'
        }
      ];
      
      setReferenceData(mockData);
      setIsLoading(false);
    }, 1000);
  }, []);

  // Filtrage des données de référence
  const filteredData = referenceData
    .filter(item => item.module === activeTab)
    .filter(item => 
      searchQuery === '' || 
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.type.toLowerCase().includes(searchQuery.toLowerCase())
    );

  // Grouper par type
  const groupedData = filteredData.reduce((acc, item) => {
    if (!acc[item.type]) {
      acc[item.type] = [];
    }
    acc[item.type].push(item);
    return acc;
  }, {} as Record<string, ReferenceDataItem[]>);

  const handleAddItem = () => {
    setCurrentItem({
      code: '',
      value: '',
      display_name: '',
      description: '',
      type: typesByModule[activeTab][0]?.value || '',
      module: activeTab,
      is_active: true,
      sort_order: 0
    });
    setIsEditing(false);
    setIsDialogOpen(true);
  };

  const handleEditItem = (item: ReferenceDataItem) => {
    setCurrentItem({ ...item });
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const handleSaveItem = () => {
    if (!currentItem) return;

    // Dans une implémentation réelle, ceci serait un appel API
    if (isEditing) {
      setReferenceData(prev => 
        prev.map(item => item.id === currentItem.id ? { ...item, ...currentItem } as ReferenceDataItem : item)
      );
      toast({
        title: "Mise à jour réussie",
        description: "L'élément a été mis à jour avec succès."
      });
    } else {
      const newItem: ReferenceDataItem = {
        id: Math.max(0, ...referenceData.map(item => item.id)) + 1,
        code: currentItem.code || '',
        value: currentItem.value || '',
        display_name: currentItem.display_name || '',
        description: currentItem.description,
        type: currentItem.type || '',
        module: currentItem.module || activeTab,
        feature: currentItem.feature,
        is_active: currentItem.is_active || true,
        sort_order: currentItem.sort_order || 0,
        color_code: currentItem.color_code,
        icon_name: currentItem.icon_name
      };
      setReferenceData(prev => [...prev, newItem]);
      toast({
        title: "Ajout réussi",
        description: "Nouvel élément ajouté avec succès."
      });
    }

    setIsDialogOpen(false);
    setCurrentItem(null);
  };

  const handleDeleteItem = (id: number) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) {
      setReferenceData(prev => prev.filter(item => item.id !== id));
      toast({
        title: "Suppression réussie",
        description: "L'élément a été supprimé avec succès."
      });
    }
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
      <h1 className="text-2xl font-bold">Données de référence</h1>
      
      <div className="flex justify-between items-center">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            {modules.map(module => (
              <TabsTrigger key={module.value} value={module.value}>
                {module.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Gestion des données</CardTitle>
          <div className="flex space-x-2">
            <div className="relative w-[300px]">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button variant="outline" size="icon" onClick={() => setIsLoading(true)}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button onClick={handleAddItem}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              {Object.keys(groupedData).length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  Aucune donnée trouvée pour les critères sélectionnés.
                </div>
              ) : (
                Object.entries(groupedData).map(([type, items]) => (
                  <Card key={type} className="overflow-hidden">
                    <CardHeader className="bg-muted/50 py-2">
                      <CardTitle className="text-lg">
                        {typesByModule[activeTab]?.find(t => t.value === type)?.label || type}
                      </CardTitle>
                    </CardHeader>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Nom d'affichage</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Ordre</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-mono">{item.code}</TableCell>
                            <TableCell>
                              {item.color_code && (
                                <div className="flex items-center">
                                  <div
                                    className="w-3 h-3 rounded-full mr-2"
                                    style={{ backgroundColor: item.color_code }}
                                  />
                                  {item.display_name}
                                </div>
                              )}
                              {!item.color_code && item.display_name}
                            </TableCell>
                            <TableCell className="max-w-xs truncate">{item.description}</TableCell>
                            <TableCell>
                              <Badge variant={item.is_active ? "default" : "outline"}>
                                {item.is_active ? 'Actif' : 'Inactif'}
                              </Badge>
                            </TableCell>
                            <TableCell>{item.sort_order}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => handleEditItem(item)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id)}>
                                <Trash className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog pour ajouter/modifier une donnée de référence */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Modifier une donnée de référence" : "Ajouter une donnée de référence"}
            </DialogTitle>
            <DialogDescription>
              {isEditing 
                ? "Modifiez les informations ci-dessous puis cliquez sur Enregistrer."
                : "Remplissez le formulaire ci-dessous pour ajouter une nouvelle donnée."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={currentItem?.type || ''}
                  onValueChange={(value) => setCurrentItem(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Sélectionner un type" />
                  </SelectTrigger>
                  <SelectContent>
                    {typesByModule[activeTab]?.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="is_active">Statut</Label>
                <div className="flex items-center space-x-2 pt-2">
                  <Switch
                    checked={currentItem?.is_active || false}
                    onCheckedChange={(checked) => setCurrentItem(prev => ({ ...prev, is_active: checked }))}
                  />
                  <span>{currentItem?.is_active ? 'Actif' : 'Inactif'}</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="code">Code (identifiant unique)</Label>
              <Input
                id="code"
                value={currentItem?.code || ''}
                onChange={(e) => setCurrentItem(prev => ({ ...prev, code: e.target.value }))}
                placeholder="ex: active, admin, high_priority"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="value">Valeur interne</Label>
              <Input
                id="value"
                value={currentItem?.value || ''}
                onChange={(e) => setCurrentItem(prev => ({ ...prev, value: e.target.value }))}
                placeholder="ex: active, admin, high_priority"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="display_name">Nom d'affichage</Label>
              <Input
                id="display_name"
                value={currentItem?.display_name || ''}
                onChange={(e) => setCurrentItem(prev => ({ ...prev, display_name: e.target.value }))}
                placeholder="ex: Actif, Administrateur, Haute priorité"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={currentItem?.description || ''}
                onChange={(e) => setCurrentItem(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Description détaillée..."
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sort_order">Ordre d'affichage</Label>
                <Input
                  id="sort_order"
                  type="number"
                  value={currentItem?.sort_order || 0}
                  onChange={(e) => setCurrentItem(prev => ({ ...prev, sort_order: parseInt(e.target.value) }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="color_code">Code couleur</Label>
                <div className="flex space-x-2">
                  <Input
                    id="color_code"
                    value={currentItem?.color_code || ''}
                    onChange={(e) => setCurrentItem(prev => ({ ...prev, color_code: e.target.value }))}
                    placeholder="#RRGGBB"
                  />
                  {currentItem?.color_code && (
                    <div
                      className="w-10 h-10 rounded border"
                      style={{ backgroundColor: currentItem.color_code }}
                    />
                  )}
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="icon_name">Icône</Label>
              <Input
                id="icon_name"
                value={currentItem?.icon_name || ''}
                onChange={(e) => setCurrentItem(prev => ({ ...prev, icon_name: e.target.value }))}
                placeholder="ex: check-circle, user, shield"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSaveItem}>
              {isEditing ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 