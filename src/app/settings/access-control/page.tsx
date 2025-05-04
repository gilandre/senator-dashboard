"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Lock, 
  Search, 
  Plus, 
  ChevronLeft, 
  ShieldCheck, 
  Check, 
  X, 
  Filter, 
  Users, 
  Shield, 
  Edit, 
  Trash, 
  Eye,
  UserPlus,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import ChartCard from '@/components/dashboard/chart-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';

interface Profile {
  id: string;
  name: string;
  description: string;
  users: number;
  accessLevel: string;
  status: string;
}

interface Permission {
  id: string;
  name: string;
  isModule: boolean;
  isFunction?: boolean;
  parentModule?: string;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  approve: boolean;
  export: boolean;
}

export default function AccessControlPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("profiles");
  const [profileSearch, setProfileSearch] = useState("");
  const [permissionSearch, setPermissionSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [isNewProfileDialogOpen, setIsNewProfileDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState<string | null>(null);
  
  // États pour le formulaire nouveau profil
  const [newProfile, setNewProfile] = useState({
    name: '',
    description: '',
    accessLevel: 'Moyen',
    status: 'Actif'
  });
  
  useEffect(() => {
    loadProfiles();
    loadPermissions();
  }, []);
  
  // Fonction pour charger tous les profils depuis l'API
  const loadProfiles = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/profiles');
      
      if (!response.ok) {
        throw new Error(`Erreur lors du chargement des profils: ${response.statusText}`);
      }
      
      const data = await response.json();
      setProfiles(data.profiles || []);
    } catch (error) {
      console.error("Erreur:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les profils.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fonction pour charger toutes les permissions depuis l'API
  const loadPermissions = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/permissions');
      
      if (!response.ok) {
        throw new Error(`Erreur lors du chargement des permissions: ${response.statusText}`);
      }
      
      const data = await response.json();
      setPermissions(data.permissions || []);
    } catch (error) {
      console.error("Erreur:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les permissions.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrer les profils
  const filteredProfiles = profiles.filter(profile => 
    profile.name.toLowerCase().includes(profileSearch.toLowerCase()) ||
    profile.description.toLowerCase().includes(profileSearch.toLowerCase())
  );

  // Filtrer les permissions
  const filteredPermissions = permissions.filter(permission => {
    const textMatch = permission.name.toLowerCase().includes(permissionSearch.toLowerCase());
    const moduleMatch = selectedFilter === "all" || 
                       (selectedFilter === "modules" && permission.isModule) ||
                       (selectedFilter !== "modules" && permission.parentModule === selectedFilter);
    return textMatch && moduleMatch;
  });

  // Créer un nouveau profil
  const handleCreateProfile = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newProfile)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Erreur lors de la création du profil: ${response.statusText}`);
      }
      
      const createdProfile = await response.json();
      
      // Rafraîchir la liste des profils
      await loadProfiles();
      
      // Réinitialiser le formulaire
      setNewProfile({
        name: '',
        description: '',
        accessLevel: 'Moyen',
        status: 'Actif'
      });
      
      // Fermer le dialogue
      setIsNewProfileDialogOpen(false);
      
      toast({
        title: "Succès",
        description: "Le profil a été créé avec succès.",
      });
    } catch (error) {
      console.error("Erreur:", error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de créer le profil.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Gérer la désactivation/activation d'un profil
  const handleToggleProfileStatus = async (profileId: string, currentStatus: string) => {
    if (!profileId) {
      toast({
        title: "Erreur",
        description: "ID de profil non valide",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsLoading(true);
      const newStatus = currentStatus === 'Actif' ? 'Inactif' : 'Actif';
      
      const response = await fetch(`/api/profiles/${profileId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Erreur lors de la modification du statut: ${response.statusText}`);
      }
      
      // Mettre à jour localement l'état du profil
      setProfiles(profiles.map(profile => 
        profile.id === profileId 
          ? { ...profile, status: newStatus } 
          : profile
      ));
      
      toast({
        title: "Succès",
        description: `Le profil est maintenant ${newStatus}.`,
      });
    } catch (error) {
      console.error("Erreur:", error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de modifier le statut du profil.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Ouvrir le dialogue de confirmation de suppression
  const openDeleteDialog = (profileId: string) => {
    if (!profileId) {
      toast({
        title: "Erreur",
        description: "ID de profil non valide",
        variant: "destructive"
      });
      return;
    }
    
    setProfileToDelete(profileId);
    setIsDeleteDialogOpen(true);
  };

  // Supprimer un profil
  const handleDeleteProfile = async () => {
    if (!profileToDelete) {
      toast({
        title: "Erreur",
        description: "ID de profil non valide",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/profiles/${profileToDelete}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Erreur lors de la suppression: ${response.statusText}`);
      }
      
      // Mettre à jour la liste des profils
      setProfiles(profiles.filter(profile => profile.id !== profileToDelete));
      
      setIsDeleteDialogOpen(false);
      setProfileToDelete(null);
      
      toast({
        title: "Succès",
        description: "Le profil a été supprimé avec succès.",
      });
    } catch (error) {
      console.error("Erreur:", error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de supprimer le profil.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Gérer la modification d'une permission
  const handleEditPermission = (permissionId: string) => {
    // Rediriger vers la page de gestion du profil associé à cette permission
    const permission = permissions.find(p => p.id === permissionId);
    if (permission) {
      // Supposons que chaque permission a un profileId
      router.push(`/settings/access-control/permission/${permissionId}`);
    }
  };

  // Récupérer les modules disponibles pour le filtre
  const availableModules = permissions
    .filter(p => p.isModule)
    .map(p => ({ id: p.id, name: p.name }));

  // Gérer le changement de filtre de module
  const handleModuleFilterChange = (moduleName: string) => {
    setSelectedFilter(moduleName);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Link href="/settings" className="mr-4">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Retour
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Contrôle d&apos;accès</h1>
        </div>
      </div>

      <Tabs defaultValue="profiles" onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profiles" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Profils utilisateurs
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Permissions
          </TabsTrigger>
        </TabsList>

        {/* Onglet Profils Utilisateurs */}
        <TabsContent value="profiles" className="space-y-4">
          <div className="flex justify-between">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input 
                type="text" 
                placeholder="Rechercher un profil..." 
                className="pl-9 py-2 pr-4 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                value={profileSearch}
                onChange={(e) => setProfileSearch(e.target.value)}
                aria-label="Rechercher un profil"
              />
            </div>
            <Button size="sm" onClick={() => setIsNewProfileDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau profil
            </Button>
          </div>
          
          <ChartCard 
            title="Profils du système" 
            description="Gestion des profils et leurs permissions"
          >
            {isLoading && (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            )}
            
            {!isLoading && filteredProfiles.length === 0 && (
              <div className="py-8 text-center text-gray-500">
                Aucun profil trouvé. Créez votre premier profil avec le bouton "Nouveau profil".
              </div>
            )}
            
            {!isLoading && filteredProfiles.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-800">
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Profil</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Description</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Utilisateurs</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Niveau d&apos;accès</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Statut</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProfiles.map((profile) => (
                      <tr key={profile.id} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900">
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mr-3">
                              <Shield className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                            </div>
                            {profile.name}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">{profile.description}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-2 text-gray-500" />
                            {profile.users}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            profile.accessLevel === 'Complet' 
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' 
                              : profile.accessLevel === 'Élevé'
                                ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
                                : profile.accessLevel === 'Moyen'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                                  : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          }`}>
                            {profile.accessLevel}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            profile.status === 'Actif' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                          }`}>
                            {profile.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex items-center gap-1"
                              onClick={() => router.push(`/settings/access-control/profile/${profile.id}`)}
                              disabled={!profile.id}
                            >
                              <Edit className="h-3 w-3" />
                              Modifier
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex items-center gap-1"
                              onClick={() => router.push(`/settings/access-control/profile/${profile.id}?tab=permissions`)}
                              disabled={!profile.id}
                            >
                              <ShieldCheck className="h-3 w-3" />
                              Permissions
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex items-center gap-1"
                              onClick={() => router.push(`/settings/access-control/profile/${profile.id}?tab=users`)}
                              disabled={!profile.id}
                            >
                              <UserPlus className="h-3 w-3" />
                              Utilisateurs
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleToggleProfileStatus(profile.id, profile.status)}
                              disabled={!profile.id}
                              className={profile.status === 'Actif' 
                                ? "text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 flex items-center gap-1"
                                : "text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 flex items-center gap-1"
                              }
                            >
                              {profile.status === 'Actif' ? <X className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                              {profile.status === 'Actif' ? 'Désactiver' : 'Activer'}
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 flex items-center gap-1"
                              onClick={() => openDeleteDialog(profile.id)}
                              disabled={!profile.id}
                            >
                              <Trash className="h-3 w-3" />
                              Supprimer
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ChartCard>
        </TabsContent>

        {/* Onglet Permissions */}
        <TabsContent value="permissions" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => setSelectedFilter("all")}
                variant={selectedFilter === "all" ? "default" : "outline"}
                size="sm"
              >
                Tous
              </Button>
              <Button
                onClick={() => setSelectedFilter("modules")}
                variant={selectedFilter === "modules" ? "default" : "outline"}
                size="sm"
              >
                Modules
              </Button>
              {permissions
                .filter(p => p.isModule)
                .map(module => (
                  <Button
                    key={module.id}
                    onClick={() => handleModuleFilterChange(module.name)}
                    variant={selectedFilter === module.name ? "default" : "outline"}
                    size="sm"
                  >
                    {module.name}
                  </Button>
                ))
              }
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input 
                  type="text" 
                  placeholder="Rechercher une permission..." 
                  className="pl-9 py-2 pr-4 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                  value={permissionSearch}
                  onChange={(e) => setPermissionSearch(e.target.value)}
                />
              </div>
              <Link href="/settings/access-control/permission/new">
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle permission
                </Button>
              </Link>
              <Link href="/settings/access-control/system-init">
                <Button size="sm" variant="outline">
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Initialisation automatique
                </Button>
              </Link>
            </div>
          </div>
          
          <ChartCard 
            title="Permissions par module" 
            description="Définition détaillée des droits d'accès par module et fonction"
          >
            {isLoading && (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            )}
            
            {!isLoading && filteredPermissions.length === 0 && (
              <div className="py-8 text-center text-gray-500">
                Aucune permission trouvée pour les critères de recherche actuels.
              </div>
            )}
            
            {!isLoading && filteredPermissions.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-800">
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Module / Fonction</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">Voir</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">Créer</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">Modifier</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">Supprimer</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">Approuver</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">Exporter</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPermissions.map((permission) => (
                      <tr 
                        key={permission.id} 
                        className={`
                          border-b border-gray-200 dark:border-gray-800 
                          hover:bg-gray-50 dark:hover:bg-gray-900
                          ${permission.isModule ? 'bg-gray-50 dark:bg-gray-900/50 font-medium' : ''}
                          ${permission.isFunction ? 'pl-6' : ''}
                        `}
                      >
                        <td className={`px-4 py-3 text-sm ${permission.isFunction ? 'pl-10' : ''}`}>
                          <div className="flex items-center">
                            {permission.isModule && (
                              <div className="w-6 h-6 rounded-md bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center mr-2">
                                <Lock className="h-3 w-3 text-primary-500 dark:text-primary-400" />
                              </div>
                            )}
                            {permission.name}
                          </div>
                        </td>
                        {['view', 'create', 'edit', 'delete', 'approve', 'export'].map((action) => (
                          <td key={action} className="px-4 py-3 text-sm text-center">
                            {permission[action as keyof Permission] ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                                <Check className="h-4 w-4" />
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                                <X className="h-4 w-4" />
                              </span>
                            )}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-sm">
                          <div className="flex space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleEditPermission(permission.id)}
                              className="flex items-center gap-1"
                            >
                              <Edit className="h-3 w-3" />
                              Modifier
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ChartCard>
        </TabsContent>
      </Tabs>

      {/* Dialog de création de profil */}
      <Dialog open={isNewProfileDialogOpen} onOpenChange={setIsNewProfileDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un nouveau profil</DialogTitle>
            <DialogDescription>
              Remplissez les informations ci-dessous pour créer un nouveau profil d&apos;accès.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Nom du profil
              </label>
              <input
                id="name"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md"
                value={newProfile.name}
                onChange={(e) => setNewProfile({...newProfile, name: e.target.value})}
                placeholder="Ex: Administrateur, Opérateur..."
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <textarea
                id="description"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md"
                value={newProfile.description}
                onChange={(e) => setNewProfile({...newProfile, description: e.target.value})}
                placeholder="Description du profil et de ses responsabilités..."
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="accessLevel" className="text-sm font-medium">
                Niveau d&apos;accès
              </label>
              <select
                id="accessLevel"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md"
                value={newProfile.accessLevel}
                onChange={(e) => setNewProfile({...newProfile, accessLevel: e.target.value})}
              >
                <option value="Complet">Complet</option>
                <option value="Élevé">Élevé</option>
                <option value="Moyen">Moyen</option>
                <option value="Faible">Faible</option>
                <option value="Limité">Limité</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Statut</label>
              <div className="flex space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="mr-2"
                    name="status"
                    value="Actif"
                    checked={newProfile.status === "Actif"}
                    onChange={() => setNewProfile({...newProfile, status: "Actif"})}
                  />
                  <span>Actif</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="mr-2"
                    name="status"
                    value="Inactif"
                    checked={newProfile.status === "Inactif"}
                    onChange={() => setNewProfile({...newProfile, status: "Inactif"})}
                  />
                  <span>Inactif</span>
                </label>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewProfileDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateProfile} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Créer le profil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de suppression */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer ce profil ? Cette action est irréversible et supprimera toutes les permissions associées.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteProfile}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash className="h-4 w-4 mr-2" />}
              Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 