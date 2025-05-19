"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ChevronLeft, 
  Shield, 
  Check, 
  X, 
  Trash, 
  Save, 
  Users, 
  UserPlus,
  UserMinus,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ChartCard from '@/components/dashboard/chart-card';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger
} from '@/components/ui/dialog';

interface ProfileUser {
  id: string;
  name: string;
  email: string;
  lastLogin: string;
  status: string;
}

interface ProfilePermission {
  id: string;
  module: string;
  function?: string;
  level: string;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  approve: boolean;
  export: boolean;
}

export default function ProfileDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("details");
  const [editedProfile, setEditedProfile] = useState({
    name: '',
    description: '',
    accessLevel: 'Moyen',
    status: 'Actif'
  });
  
  const [profileUsers, setProfileUsers] = useState<ProfileUser[]>([]);
  const [profilePermissions, setProfilePermissions] = useState<ProfilePermission[]>([]);
  const [availableUsers, setAvailableUsers] = useState<ProfileUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  
  // Charger les données lors du chargement initial
  useEffect(() => {
    // Si on a le paramètre tab dans l'URL, activer cet onglet
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
    
    // Charger les données du profil
    loadProfileData();
  }, [params.id, searchParams]);
  
  // Fonction pour charger les données du profil
  const loadProfileData = async () => {
    try {
      setIsLoading(true);
      
      // Charger le profil
      const profileResponse = await fetch(`/api/profiles/${params.id}`);
      
      if (!profileResponse.ok) {
        if (profileResponse.status === 404) {
          toast({
            title: "Profil non trouvé",
            description: "Le profil demandé n'existe pas.",
            variant: "destructive"
          });
          router.push('/settings/access-control');
          return;
        }
        
        throw new Error(`Erreur lors du chargement du profil: ${profileResponse.statusText}`);
      }
      
      const profileData = await profileResponse.json();
      // Accéder au profil correctement dans la réponse API
      const profileObject = profileData.profile || profileData;
      setProfile(profileObject);
      setEditedProfile({
        name: profileObject.name,
        description: profileObject.description,
        accessLevel: profileObject.accessLevel,
        status: profileObject.status
      });
      
      // Charger les utilisateurs du profil
      await loadProfileUsers();
      
      // Charger les permissions du profil
      await loadProfilePermissions();
      
    } catch (error) {
      console.error("Erreur:", error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de charger les données du profil.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Charger les utilisateurs du profil
  const loadProfileUsers = async () => {
    if (!params.id || typeof params.id !== 'string') {
      console.error("ID de profil non valide pour charger les utilisateurs");
      return;
    }
    
    try {
      const usersResponse = await fetch(`/api/profiles/${params.id}/users`);
      
      if (!usersResponse.ok) {
        throw new Error(`Erreur lors du chargement des utilisateurs: ${usersResponse.statusText}`);
      }
      
      const usersData = await usersResponse.json();
      setProfileUsers(usersData.users || []);
      
      // Charger les utilisateurs disponibles pour l'ajout
      const availableUsersResponse = await fetch(`/api/users?available=true`);
      
      if (availableUsersResponse.ok) {
        const availableUsersData = await availableUsersResponse.json();
        setAvailableUsers(availableUsersData.users || []);
      }
      
    } catch (error) {
      console.error("Erreur:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les utilisateurs du profil.",
        variant: "destructive"
      });
    }
  };
  
  // Charger les permissions du profil
  const loadProfilePermissions = async () => {
    if (!params.id || typeof params.id !== 'string') {
      console.error("ID de profil non valide pour charger les permissions");
      return;
    }
    
    try {
      const permissionsResponse = await fetch(`/api/permissions?profileId=${params.id}`);
      
      if (!permissionsResponse.ok) {
        throw new Error(`Erreur lors du chargement des permissions: ${permissionsResponse.statusText}`);
      }
      
      const permissionsData = await permissionsResponse.json();
      setProfilePermissions(permissionsData.permissions || []);
      
    } catch (error) {
      console.error("Erreur:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les permissions du profil.",
        variant: "destructive"
      });
    }
  };
  
  // Gérer les changements de champs du formulaire de profil
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditedProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Sauvegarder les modifications du profil
  const handleSaveProfile = async () => {
    if (!params.id || typeof params.id !== 'string') {
      toast({
        title: "Erreur",
        description: "ID de profil non valide",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/profiles/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editedProfile)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Erreur lors de la mise à jour du profil: ${response.statusText}`);
      }
      
      const updatedProfile = await response.json();
      setProfile(updatedProfile);
      
      toast({
        title: "Profil mis à jour",
        description: "Les modifications ont été enregistrées avec succès."
      });
      
    } catch (error) {
      console.error("Erreur:", error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de mettre à jour le profil.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Supprimer le profil
  const handleDeleteProfile = async () => {
    if (!params.id || typeof params.id !== 'string') {
      toast({
        title: "Erreur",
        description: "ID de profil non valide",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/profiles/${params.id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Erreur lors de la suppression du profil: ${response.statusText}`);
      }
      
      toast({
        title: "Profil supprimé",
        description: "Le profil a été supprimé avec succès."
      });
      
      // Rediriger vers la liste des profils
      router.push('/settings/access-control');
      
    } catch (error) {
      console.error("Erreur:", error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de supprimer le profil.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setIsDeleteDialogOpen(false);
    }
  };
  
  // Modifier le statut d'une permission (activer/désactiver)
  const handleTogglePermission = async (permissionId: string) => {
    const permission = profilePermissions.find(p => p.id === permissionId);
    if (!permission) return;
    
    try {
      setIsLoading(true);
      
      // Inverser l'état de la permission
      const updatedPermission = { ...permission, view: !permission.view };
      
      const response = await fetch(`/api/permissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          profileId: params.id,
          permissions: [updatedPermission]
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Erreur lors de la modification de la permission: ${response.statusText}`);
      }
      
      // Mettre à jour l'état local
      setProfilePermissions(permissions => 
        permissions.map(p => 
          p.id === permissionId 
            ? { ...p, view: !p.view } 
            : p
        )
      );
      
      toast({
        title: "Permission modifiée",
        description: `La permission a été ${updatedPermission.view ? 'activée' : 'désactivée'} avec succès.`
      });
      
    } catch (error) {
      console.error("Erreur:", error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de modifier la permission.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Modifier le niveau d'une permission
  const handleChangePermissionLevel = async (permissionId: string, level: string) => {
    const permission = profilePermissions.find(p => p.id === permissionId);
    if (!permission) return;
    
    try {
      setIsLoading(true);
      
      // Définir les droits en fonction du niveau choisi
      const updatedPermission = { 
        ...permission, 
        level,
        view: true,
        create: level === 'Complet' || level === 'Écriture',
        edit: level === 'Complet' || level === 'Écriture',
        delete: level === 'Complet',
        approve: level === 'Complet',
        export: level === 'Complet' || level === 'Lecture'
      };
      
      const response = await fetch(`/api/permissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          profileId: params.id,
          permissions: [updatedPermission]
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Erreur lors de la modification de la permission: ${response.statusText}`);
      }
      
      // Mettre à jour l'état local
      setProfilePermissions(permissions => 
        permissions.map(p => 
          p.id === permissionId 
            ? updatedPermission 
            : p
        )
      );
      
      toast({
        title: "Permission modifiée",
        description: `Le niveau d'accès a été défini sur "${level}" avec succès.`
      });
      
    } catch (error) {
      console.error("Erreur:", error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de modifier la permission.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Ajouter un utilisateur au profil
  const handleAddUser = async (userId: string) => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/profiles/${params.id}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Erreur lors de l'ajout de l'utilisateur: ${response.statusText}`);
      }
      
      // Rafraîchir la liste des utilisateurs
      await loadProfileUsers();
      
      toast({
        title: "Utilisateur ajouté",
        description: "L'utilisateur a été ajouté au profil avec succès."
      });
      
      setIsAddUserDialogOpen(false);
      
    } catch (error) {
      console.error("Erreur:", error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible d'ajouter l'utilisateur au profil.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Retirer un utilisateur du profil
  const handleRemoveUser = async (userId: string) => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/profiles/${params.id}/users`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Erreur lors du retrait de l'utilisateur: ${response.statusText}`);
      }
      
      // Mettre à jour l'état local
      setProfileUsers(users => users.filter(user => user.id !== userId));
      
      toast({
        title: "Utilisateur retiré",
        description: "L'utilisateur a été retiré du profil avec succès."
      });
      
    } catch (error) {
      console.error("Erreur:", error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de retirer l'utilisateur du profil.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Filtrer les utilisateurs disponibles
  const filteredAvailableUsers = availableUsers.filter(user => 
    user.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    user.email.toLowerCase().includes(userSearch.toLowerCase())
  );
  
  if (isLoading && !profile) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {profile && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link href="/settings/access-control" className="mr-4">
                <Button variant="ghost" size="sm">
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Retour
                </Button>
              </Link>
              <h1 className="text-2xl font-bold">Profil: {profile.name}</h1>
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setIsDeleteDialogOpen(true)}
                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
              >
                <Trash className="h-4 w-4 mr-2" />
                Supprimer le profil
              </Button>
              <Button 
                onClick={handleSaveProfile}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Enregistrer
              </Button>
            </div>
          </div>
        
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Détails
              </TabsTrigger>
              <TabsTrigger value="permissions" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Permissions
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Utilisateurs
              </TabsTrigger>
            </TabsList>
            
            {/* Onglet Détails */}
            <TabsContent value="details" className="space-y-4">
              <ChartCard 
                title="Informations du profil" 
                description="Détails et configuration du profil"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Nom du profil</label>
                    <input
                      type="text"
                      name="name"
                      value={editedProfile.name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md"
                      title="Nom du profil"
                      placeholder="Nom du profil"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Niveau d&apos;accès</label>
                    <select
                      name="accessLevel"
                      value={editedProfile.accessLevel}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md"
                      title="Niveau d'accès"
                    >
                      <option value="Complet">Complet</option>
                      <option value="Élevé">Élevé</option>
                      <option value="Moyen">Moyen</option>
                      <option value="Faible">Faible</option>
                      <option value="Limité">Limité</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea
                      name="description"
                      value={editedProfile.description}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md"
                      rows={4}
                      title="Description du profil"
                      placeholder="Description du profil"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Statut</label>
                    <div className="flex space-x-4">
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          name="status"
                          value="Actif"
                          checked={editedProfile.status === "Actif"}
                          onChange={() => setEditedProfile({...editedProfile, status: "Actif"})}
                          className="mr-2"
                        />
                        <span>Actif</span>
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          name="status"
                          value="Inactif"
                          checked={editedProfile.status === "Inactif"}
                          onChange={() => setEditedProfile({...editedProfile, status: "Inactif"})}
                          className="mr-2"
                        />
                        <span>Inactif</span>
                      </label>
                    </div>
                  </div>
                </div>
              </ChartCard>
              
              <ChartCard
                title="Informations système"
                description="Métadonnées et statistiques du profil"
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Créé le</p>
                    <p className="font-medium">{profile.createdAt}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Créé par</p>
                    <p className="font-medium">{profile.createdBy}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Dernière modification</p>
                    <p className="font-medium">{profile.lastModified}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Nombre d&apos;utilisateurs</p>
                    <p className="font-medium">{profile.users}</p>
                  </div>
                </div>
              </ChartCard>
            </TabsContent>
            
            {/* Onglet Permissions */}
            <TabsContent value="permissions" className="space-y-4">
              <ChartCard 
                title="Permissions du profil" 
                description="Gestion des permissions pour chaque module et fonction"
              >
                {isLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-800">
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Module / Fonction</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">Niveau d&apos;accès</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">Voir</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">Créer</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">Modifier</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">Supprimer</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">Approuver</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">Exporter</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profilePermissions.map((permission) => (
                          <tr 
                            key={permission.id} 
                            className={`
                              border-b border-gray-200 dark:border-gray-800 
                              hover:bg-gray-50 dark:hover:bg-gray-900
                              ${!permission.function ? 'bg-gray-50 dark:bg-gray-900/50 font-medium' : ''}
                            `}
                          >
                            <td className={`px-4 py-3 text-sm ${permission.function ? 'pl-10' : ''}`}>
                              {permission.function ? permission.function : permission.module}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <select
                                value={permission.level}
                                onChange={(e) => handleChangePermissionLevel(permission.id, e.target.value)}
                                className="px-2 py-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                                title="Niveau d'accès"
                              >
                                <option value="Complet">Complet</option>
                                <option value="Écriture">Écriture</option>
                                <option value="Lecture">Lecture</option>
                                <option value="Aucun">Aucun</option>
                              </select>
                            </td>
                            {['view', 'create', 'edit', 'delete', 'approve', 'export'].map((action) => (
                              <td key={action} className="px-4 py-3 text-sm text-center">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="p-0 h-6 w-6"
                                  onClick={() => handleTogglePermission(permission.id)}
                                >
                                  {permission[action as keyof ProfilePermission] ? (
                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                                      <Check className="h-4 w-4" />
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                                      <X className="h-4 w-4" />
                                    </span>
                                  )}
                                </Button>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </ChartCard>
            </TabsContent>
            
            {/* Onglet Utilisateurs */}
            <TabsContent value="users" className="space-y-4">
              <div className="flex justify-between mb-4">
                <h3 className="text-lg font-medium">Utilisateurs du profil</h3>
                <Button size="sm" onClick={() => setIsAddUserDialogOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Ajouter un utilisateur
                </Button>
              </div>
              
              <ChartCard 
                title="Utilisateurs associés" 
                description="Gestion des utilisateurs ayant ce profil"
              >
                {isLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : profileUsers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Aucun utilisateur associé à ce profil.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-800">
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Utilisateur</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Email</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Dernière connexion</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Statut</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profileUsers.map((user) => (
                          <tr key={user.id} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900">
                            <td className="px-4 py-3 text-sm">{user.name}</td>
                            <td className="px-4 py-3 text-sm">{user.email}</td>
                            <td className="px-4 py-3 text-sm">{user.lastLogin || 'Jamais'}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                user.status === 'active' 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                              }`}>
                                {user.status === 'active' ? 'Actif' : 'Inactif'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 flex items-center gap-1"
                                onClick={() => handleRemoveUser(user.id)}
                              >
                                <UserMinus className="h-3 w-3" />
                                Retirer
                              </Button>
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
        </>
      )}
      
      {/* Dialog de confirmation de suppression */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer le profil <strong>{profile?.name}</strong> ?
              Cette action est irréversible et tous les utilisateurs associés à ce profil n&apos;auront plus d&apos;accès.
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
      
      {/* Dialog d'ajout d'utilisateur */}
      <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un utilisateur</DialogTitle>
            <DialogDescription>
              Sélectionnez un utilisateur à associer à ce profil.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mb-4">
            <input
              type="text"
              placeholder="Rechercher un utilisateur..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
          </div>
          
          <div className="max-h-60 overflow-y-auto">
            {filteredAvailableUsers.length === 0 ? (
              <div className="text-center text-gray-500 py-4">
                Aucun utilisateur disponible trouvé
              </div>
            ) : (
              <div className="space-y-2">
                {filteredAvailableUsers.map(user => (
                  <div 
                    key={user.id} 
                    className="flex items-center justify-between p-2 border border-gray-200 dark:border-gray-800 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900"
                  >
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                    <Button size="sm" onClick={() => handleAddUser(user.id)}>
                      Ajouter
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddUserDialogOpen(false)}>
              Annuler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 