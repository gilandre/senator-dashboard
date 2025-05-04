"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Save, Trash, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ChartCard from '@/components/dashboard/chart-card';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface Module {
  id: string;
  name: string;
}

interface Permission {
  id: string;
  name: string;
  code: string;
  isModule: boolean;
  isFunction: boolean;
  parentModule: string | null;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  approve: boolean;
  export: boolean;
}

export default function EditPermissionPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [modules, setModules] = useState<Module[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const [permission, setPermission] = useState<Permission>({
    id: '',
    name: '',
    code: '',
    isModule: false,
    isFunction: false,
    parentModule: null,
    view: true,
    create: false,
    edit: false,
    delete: false,
    approve: false,
    export: false
  });
  
  useEffect(() => {
    if (params.id) {
      // Load permission data and modules
      loadPermission();
      loadModules();
    }
  }, [params.id]);
  
  const loadPermission = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/permissions/${params.id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          toast({
            title: "Permission non trouvée",
            description: "La permission demandée n'existe pas.",
            variant: "destructive"
          });
          router.push('/settings/access-control?tab=permissions');
          return;
        }
        
        throw new Error(`Erreur lors du chargement: ${response.statusText}`);
      }
      
      const data = await response.json();
      setPermission(data.permission);
      
    } catch (error) {
      console.error("Erreur:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les informations de la permission.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadModules = async () => {
    try {
      const response = await fetch('/api/permissions?isModule=true');
      
      if (!response.ok) {
        throw new Error(`Erreur lors du chargement des modules: ${response.statusText}`);
      }
      
      const data = await response.json();
      setModules(data.permissions || []);
    } catch (error) {
      console.error("Erreur:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les modules.",
        variant: "destructive"
      });
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPermission(prev => ({ ...prev, [name]: value }));
  };
  
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    
    if (name === 'isModule' && checked) {
      // If this is a module, it can't be a function and doesn't have a parent module
      setPermission(prev => ({ 
        ...prev, 
        [name]: checked,
        isFunction: false,
        parentModule: null
      }));
    } else if (name === 'isFunction' && checked) {
      // If this is a function, it can't be a module
      setPermission(prev => ({ 
        ...prev, 
        [name]: checked,
        isModule: false
      }));
    } else {
      setPermission(prev => ({ ...prev, [name]: checked }));
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);
      
      // Validate
      if (!permission.name || !permission.code) {
        toast({
          title: "Erreur de validation",
          description: "Le nom et le code sont requis.",
          variant: "destructive"
        });
        return;
      }
      
      if (permission.isFunction && !permission.parentModule) {
        toast({
          title: "Erreur de validation",
          description: "Un module parent est requis pour une fonction.",
          variant: "destructive"
        });
        return;
      }
      
      const response = await fetch(`/api/permissions/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(permission)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Erreur lors de la mise à jour: ${response.statusText}`);
      }
      
      toast({
        title: "Succès",
        description: "La permission a été mise à jour avec succès."
      });
      
    } catch (error) {
      console.error("Erreur:", error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de mettre à jour la permission.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDelete = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/permissions/${params.id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Erreur lors de la suppression: ${response.statusText}`);
      }
      
      toast({
        title: "Succès",
        description: "La permission a été supprimée avec succès."
      });
      
      // Redirect back to permissions list
      router.push('/settings/access-control?tab=permissions');
      
    } catch (error) {
      console.error("Erreur:", error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de supprimer la permission.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setIsDeleteDialogOpen(false);
    }
  };
  
  if (isLoading && !permission.id) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Link href="/settings/access-control?tab=permissions" className="mr-4">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Retour
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">
            {permission.isModule ? 'Module: ' : 'Fonction: '}
            {permission.name}
          </h1>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={() => setIsDeleteDialogOpen(true)}
            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
          >
            <Trash className="h-4 w-4 mr-2" />
            Supprimer
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Enregistrer
          </Button>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <ChartCard 
          title="Informations de base" 
          description="Détails de la permission"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nom de la permission *</label>
              <input
                type="text"
                name="name"
                value={permission.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md"
                placeholder="Gestion des utilisateurs"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Code *</label>
              <input
                type="text"
                name="code"
                value={permission.code}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md"
                placeholder="gestion_utilisateurs"
                required
                disabled
              />
              <p className="text-xs text-gray-500 mt-1">Le code est généré automatiquement et ne peut pas être modifié.</p>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Type de permission</label>
              <div className="flex space-x-6">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="permissionType"
                    value="module"
                    checked={permission.isModule}
                    onChange={() => setPermission(prev => ({ 
                      ...prev, 
                      isModule: true,
                      isFunction: false,
                      parentModule: null 
                    }))}
                    className="rounded"
                  />
                  <span>Module</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="permissionType"
                    value="function"
                    checked={permission.isFunction}
                    onChange={() => setPermission(prev => ({ 
                      ...prev, 
                      isModule: false,
                      isFunction: true
                    }))}
                    className="rounded"
                  />
                  <span>Fonction</span>
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Les modules correspondent aux sections principales dans la barre latérale, tandis que les fonctions sont des fonctionnalités spécifiques au sein de ces modules.
              </p>
            </div>
            
            {permission.isFunction && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Module parent *</label>
                <select
                  name="parentModule"
                  value={permission.parentModule || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md"
                  required={permission.isFunction}
                  aria-label="Module parent"
                >
                  <option value="">Sélectionner un module</option>
                  {modules.map(module => (
                    <option key={module.id} value={module.name}>
                      {module.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </ChartCard>
        
        <ChartCard 
          title="Droits d'accès" 
          description="Définition des droits par défaut"
        >
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="view"
                checked={permission.view}
                onChange={handleCheckboxChange}
                className="rounded"
              />
              <span>Voir</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="create"
                checked={permission.create}
                onChange={handleCheckboxChange}
                className="rounded"
              />
              <span>Créer</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="edit"
                checked={permission.edit}
                onChange={handleCheckboxChange}
                className="rounded"
              />
              <span>Modifier</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="delete"
                checked={permission.delete}
                onChange={handleCheckboxChange}
                className="rounded"
              />
              <span>Supprimer</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="approve"
                checked={permission.approve}
                onChange={handleCheckboxChange}
                className="rounded"
              />
              <span>Approuver</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="export"
                checked={permission.export}
                onChange={handleCheckboxChange}
                className="rounded"
              />
              <span>Exporter</span>
            </label>
          </div>
          <p className="text-xs text-gray-500 px-4 pb-4">
            Ces droits seront utilisés comme valeurs par défaut. Ils pourront être personnalisés au niveau de chaque profil.
          </p>
        </ChartCard>
      </form>
      
      {/* Dialog de confirmation de suppression */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer cette permission ? Cette action est irréversible et peut affecter les profils qui utilisent cette permission.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
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