"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, RefreshCw, AlertTriangle, ShieldAlert, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';

export default function SystemInitPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [forceReset, setForceReset] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleInitSystem = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setResult(null);

      const response = await fetch('/api/system/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          force: forceReset,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
        toast({
          title: 'Initialisation réussie',
          description: 'Le système a été initialisé avec succès.',
        });
      } else {
        setError(data.error || 'Une erreur est survenue lors de l\'initialisation');
        toast({
          title: 'Erreur',
          description: data.error || 'Une erreur est survenue lors de l\'initialisation',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Erreur:', err);
      setError('Une erreur est survenue lors de la communication avec le serveur');
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la communication avec le serveur',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Link href="/settings/access-control" className="mr-4">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Retour
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Initialisation du système</h1>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Initialisation automatique
          </CardTitle>
          <CardDescription>
            Cette page permet d'initialiser ou de réinitialiser automatiquement le système de permissions et de profils.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Erreur</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5" />
                    Permissions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    Le système détectera automatiquement les modules et fonctions de l'application et créera les permissions correspondantes.
                  </p>

                  <ul className="list-disc ml-5 mt-3 text-sm">
                    <li>Tableau de bord</li>
                    <li>Assiduité (Liste, Import, Export)</li>
                    <li>Accès (Logs, Monitoring)</li>
                    <li>Paramètres (Utilisateurs, Profils, etc.)</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Profils
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    Des profils par défaut seront créés avec des habilitations prédéfinies.
                  </p>

                  <ul className="list-disc ml-5 mt-3 text-sm">
                    <li>Administrateur (accès complet)</li>
                    <li>Gestionnaire (gestion des présences)</li>
                    <li>Opérateur (saisie quotidienne)</li>
                    <li>Consultant (lecture seule)</li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            <div className="flex items-center space-x-2 mt-6 p-4 border rounded-md">
              <Switch 
                id="force-reset" 
                checked={forceReset} 
                onCheckedChange={setForceReset} 
              />
              <Label htmlFor="force-reset" className="font-medium">
                Réinitialiser complètement
                <p className="text-sm font-normal text-muted-foreground">
                  Supprime toutes les permissions et profils existants avant l'initialisation. À utiliser avec précaution.
                </p>
              </Label>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleInitSystem}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Initialisation en cours...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                {forceReset ? 'Réinitialiser le système' : 'Initialiser le système'}
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Résultat de l'initialisation</CardTitle>
            <CardDescription>
              Voici le détail des opérations effectuées
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="p-4 rounded-md bg-gray-100 dark:bg-gray-900 overflow-auto text-xs">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 