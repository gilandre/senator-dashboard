"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Save, Lock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ChartCard from '@/components/dashboard/chart-card';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Module {
  id: string;
  name: string;
}

export default function NewPermissionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [modules, setModules] = useState<Module[]>([]);
  
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState('function'); // 'module' ou 'function'
  
  // Permissions spécifiques
  const [canView, setCanView] = useState(true);
  const [canCreate, setCanCreate] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [canApprove, setCanApprove] = useState(false);
  const [canExport, setCanExport] = useState(false);

  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Load available modules
    loadModules();
  }, []);
  
  const loadModules = async () => {
    try {
      setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (!name || !code) {
        throw new Error('Veuillez remplir tous les champs obligatoires');
      }

      const response = await fetch('/api/permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          code,
          isModule: type === 'module',
          isFunction: type === 'function',
          module: type === 'module' ? name : 'default',
          view: canView,
          create: canCreate,
          edit: canEdit,
          delete: canDelete,
          approve: canApprove,
          export: canExport,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Une erreur est survenue');
      }

      toast({
        title: "Succès",
        description: "La permission a été créée avec succès."
      });
      
      router.push('/settings/access-control?tab=permissions');
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
      toast({
        title: "Erreur",
        description: "Impossible de créer la permission.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    // Convertir le nom en code: enlever les accents, mettre en minuscule, remplacer les espaces par des underscores
    const newCode = newName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_');
    setCode(newCode);
  };
  
  return (
    <div className="p-6 w-full max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Nouvelle permission</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Créer une nouvelle permission</CardTitle>
            <CardDescription>
              Définissez les détails de cette permission. Les modules représentent les sections principales 
              de l'application, tandis que les fonctions sont des fonctionnalités spécifiques.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erreur</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Nom de la permission *</Label>
              <Input
                id="name"
                value={name}
                onChange={handleNameChange}
                placeholder="Gestion des utilisateurs"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Code *</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="gestion_utilisateurs"
                required
              />
              <p className="text-sm text-muted-foreground">
                Code unique utilisé dans le système. Généré automatiquement à partir du nom.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Type de permission</Label>
              <RadioGroup value={type} onValueChange={setType} className="flex flex-col space-y-2 mt-2">
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="module" id="module" />
                  <Label htmlFor="module" className="font-normal cursor-pointer">
                    Module
                    <p className="text-sm text-muted-foreground mt-1">
                      Un module représente une section principale de l'application (ex: Utilisateurs, Rapports).
                    </p>
                  </Label>
                </div>
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="function" id="function" />
                  <Label htmlFor="function" className="font-normal cursor-pointer">
                    Fonction
                    <p className="text-sm text-muted-foreground mt-1">
                      Une fonction est une fonctionnalité spécifique dans l'application (ex: Création d'utilisateur).
                    </p>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-3 pt-3 border-t">
              <Label>Actions autorisées</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start space-x-2">
                  <Checkbox id="canView" checked={canView} onCheckedChange={(checked) => setCanView(checked as boolean)} />
                  <Label htmlFor="canView" className="font-normal cursor-pointer">
                    Visualiser
                    <p className="text-sm text-muted-foreground">Autoriser l'accès en lecture</p>
                  </Label>
                </div>
                <div className="flex items-start space-x-2">
                  <Checkbox id="canCreate" checked={canCreate} onCheckedChange={(checked) => setCanCreate(checked as boolean)} />
                  <Label htmlFor="canCreate" className="font-normal cursor-pointer">
                    Créer
                    <p className="text-sm text-muted-foreground">Autoriser la création</p>
                  </Label>
                </div>
                <div className="flex items-start space-x-2">
                  <Checkbox id="canEdit" checked={canEdit} onCheckedChange={(checked) => setCanEdit(checked as boolean)} />
                  <Label htmlFor="canEdit" className="font-normal cursor-pointer">
                    Modifier
                    <p className="text-sm text-muted-foreground">Autoriser la modification</p>
                  </Label>
                </div>
                <div className="flex items-start space-x-2">
                  <Checkbox id="canDelete" checked={canDelete} onCheckedChange={(checked) => setCanDelete(checked as boolean)} />
                  <Label htmlFor="canDelete" className="font-normal cursor-pointer">
                    Supprimer
                    <p className="text-sm text-muted-foreground">Autoriser la suppression</p>
                  </Label>
                </div>
                <div className="flex items-start space-x-2">
                  <Checkbox id="canApprove" checked={canApprove} onCheckedChange={(checked) => setCanApprove(checked as boolean)} />
                  <Label htmlFor="canApprove" className="font-normal cursor-pointer">
                    Approuver
                    <p className="text-sm text-muted-foreground">Autoriser l'approbation</p>
                  </Label>
                </div>
                <div className="flex items-start space-x-2">
                  <Checkbox id="canExport" checked={canExport} onCheckedChange={(checked) => setCanExport(checked as boolean)} />
                  <Label htmlFor="canExport" className="font-normal cursor-pointer">
                    Exporter
                    <p className="text-sm text-muted-foreground">Autoriser l'exportation</p>
                  </Label>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/settings/access-control?tab=permissions')}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création en cours...
                </>
              ) : (
                'Créer la permission'
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
} 