'use client';

import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  LockKeyhole, 
  Key, 
  History, 
  RefreshCw, 
  Save,
  X,
  Check,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { ISecuritySettings } from '@/models/SecuritySettings';
import { ISecurityIncident } from '@/models/SecurityIncident';
import { useToast } from '@/components/ui/toast-provider';
import PasswordTester from './password-tester';
import Link from 'next/link';

interface SecuritySettingsClientProps {}

export default function SecuritySettingsClient({}: SecuritySettingsClientProps) {
  // État pour les données
  const [settings, setSettings] = useState<ISecuritySettings | null>(null);
  const [incidents, setIncidents] = useState<ISecurityIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();
  
  // Charger les paramètres de sécurité
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/security/settings');
        
        if (!response.ok) {
          throw new Error('Erreur lors du chargement des paramètres de sécurité');
        }
        
        const data = await response.json();
        setSettings(data);
        
        // Charger les incidents de sécurité
        const incidentsResponse = await fetch('/api/security/incidents?limit=10');
        
        if (incidentsResponse.ok) {
          const incidentsData = await incidentsResponse.json();
          // S'assurer que les incidents sont correctement extraits de la réponse
          if (incidentsData && incidentsData.data) {
            setIncidents(incidentsData.data);
          } else {
            setIncidents([]);
            console.warn('Format de réponse inattendu pour les incidents:', incidentsData);
          }
        } else {
          setIncidents([]);
          console.error('Erreur lors du chargement des incidents de sécurité:', incidentsResponse.statusText);
        }
        
      } catch (error) {
        console.error('Erreur:', error);
        setError((error as Error).message);
        showToast((error as Error).message, 'error');
      } finally {
        setLoading(false);
      }
    };
    
    loadSettings();
  }, [showToast]);
  
  // Gérer la mise à jour des paramètres
  const handleSettingsUpdate = async () => {
    if (!settings) return;
    
    try {
      setSaving(true);
      
      // Créer une copie des paramètres sans les champs internes
      const { 
        passwordPolicy, 
        accountPolicy, 
        sessionPolicy, 
        networkPolicy, 
        auditPolicy, 
        twoFactorAuth 
      } = settings;
      
      // N'envoyer que les données nécessaires
      const settingsToSend = {
        passwordPolicy,
        accountPolicy,
        sessionPolicy,
        networkPolicy,
        auditPolicy,
        twoFactorAuth
      };
      
      const response = await fetch('/api/security/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settingsToSend),
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour des paramètres de sécurité');
      }
      
      const updatedSettings = await response.json();
      setSettings(updatedSettings);
      
      showToast('Paramètres de sécurité mis à jour avec succès', 'success');
    } catch (error) {
      console.error('Erreur:', error);
      setError((error as Error).message);
      showToast((error as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };
  
  // Mettre à jour un champ spécifique des paramètres
  const updateSetting = (section: keyof ISecuritySettings, field: string, value: any) => {
    if (!settings) return;
    
    // Créer une copie profonde de l'objet settings
    const updatedSettings = JSON.parse(JSON.stringify(settings)) as any;
    
    // Mettre à jour le champ spécifique
    if (updatedSettings[section] && field in updatedSettings[section]) {
      updatedSettings[section][field] = value;
    }
    
    // Mettre à jour l'état
    setSettings(updatedSettings as ISecuritySettings);
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Chargement des paramètres de sécurité...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400 mt-0.5" />
          <div>
            <h3 className="text-lg font-medium text-red-800 dark:text-red-300">
              Erreur lors du chargement des paramètres
            </h3>
            <p className="text-red-600 dark:text-red-400 mt-1">{error}</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Réessayer
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  if (!settings) {
    return null;
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Paramètres de sécurité</h1>
        <Button onClick={handleSettingsUpdate} disabled={saving}>
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
              Enregistrement...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Enregistrer les modifications
            </>
          )}
        </Button>
      </div>
      
      <Tabs defaultValue="general" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 mb-8">
          <TabsTrigger value="general">Général</TabsTrigger>
          <TabsTrigger value="password">Mots de passe</TabsTrigger>
          <TabsTrigger value="session">Sessions</TabsTrigger>
          <TabsTrigger value="logs">Audit</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Politique de compte</CardTitle>
              <CardDescription>
                Paramètres généraux de gestion des comptes utilisateurs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="maxLoginAttempts">Tentatives de connexion maximales</Label>
                    <Input
                      id="maxLoginAttempts"
                      type="number"
                      className="w-20 text-right"
                      value={settings.accountPolicy.maxLoginAttempts}
                      onChange={(e) => updateSetting('accountPolicy', 'maxLoginAttempts', parseInt(e.target.value))}
                      min={1}
                      max={10}
                    />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Nombre de tentatives de connexion échouées avant verrouillage
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="lockoutDuration">Durée de verrouillage (minutes)</Label>
                    <Input
                      id="lockoutDuration"
                      type="number"
                      className="w-20 text-right"
                      value={settings.accountPolicy.lockoutDuration}
                      onChange={(e) => updateSetting('accountPolicy', 'lockoutDuration', parseInt(e.target.value))}
                      min={5}
                      max={1440}
                    />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Durée du verrouillage après trop de tentatives échouées
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <h3 className="font-medium">Changement de mot de passe à la première connexion</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Obliger les nouveaux utilisateurs à changer leur mot de passe
                  </p>
                </div>
                <Switch
                  checked={settings.accountPolicy.forcePasswordChangeOnFirstLogin}
                  onCheckedChange={(checked) => updateSetting('accountPolicy', 'forcePasswordChangeOnFirstLogin', checked)}
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Authentification à deux facteurs</CardTitle>
              <CardDescription>
                Configuration de l'authentification à deux facteurs (2FA)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Activer l'authentification à deux facteurs</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Renforcer la sécurité en demandant un second facteur d'authentification
                  </p>
                </div>
                <Switch
                  checked={settings.twoFactorAuth.enabled}
                  onCheckedChange={(checked) => updateSetting('twoFactorAuth', 'enabled', checked)}
                />
              </div>
              
              {settings.twoFactorAuth.enabled && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="font-medium mb-3">Obligatoire pour les rôles</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {['admin', 'manager', 'operator', 'consultant'].map((role) => (
                      <div key={role} className="flex items-center space-x-2">
                        <Switch
                          id={`2fa-${role}`}
                          checked={settings.twoFactorAuth.requiredForRoles.includes(role)}
                          onCheckedChange={(checked) => {
                            const currentRoles = [...settings.twoFactorAuth.requiredForRoles];
                            const newRoles = checked
                              ? [...currentRoles, role]
                              : currentRoles.filter(r => r !== role);
                            
                            updateSetting('twoFactorAuth', 'requiredForRoles', newRoles);
                          }}
                        />
                        <Label htmlFor={`2fa-${role}`} className="capitalize">{role}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="password" className="space-y-6">
          {settings && <PasswordTester securitySettings={settings} />}
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <LockKeyhole className="h-5 w-5 mr-2 text-primary" />
                Politique de mot de passe
              </CardTitle>
              <CardDescription>
                Configuration des règles de création et de gestion des mots de passe
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="minLength">Longueur minimale</Label>
                    <Input
                      id="minLength"
                      type="number"
                      className="w-20 text-right"
                      value={settings.passwordPolicy.minLength}
                      onChange={(e) => updateSetting('passwordPolicy', 'minLength', parseInt(e.target.value))}
                      min={6}
                      max={24}
                    />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Nombre minimum de caractères requis
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="requireUppercase"
                      checked={settings.passwordPolicy.requireUppercase}
                      onCheckedChange={(checked) => updateSetting('passwordPolicy', 'requireUppercase', checked)}
                    />
                    <div>
                      <Label htmlFor="requireUppercase">Exiger des majuscules</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Au moins une lettre majuscule (A-Z)
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="requireLowercase"
                      checked={settings.passwordPolicy.requireLowercase}
                      onCheckedChange={(checked) => updateSetting('passwordPolicy', 'requireLowercase', checked)}
                    />
                    <div>
                      <Label htmlFor="requireLowercase">Exiger des minuscules</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Au moins une lettre minuscule (a-z)
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="requireNumbers"
                      checked={settings.passwordPolicy.requireNumbers}
                      onCheckedChange={(checked) => updateSetting('passwordPolicy', 'requireNumbers', checked)}
                    />
                    <div>
                      <Label htmlFor="requireNumbers">Exiger des chiffres</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Au moins un chiffre (0-9)
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="requireSpecialChars"
                      checked={settings.passwordPolicy.requireSpecialChars}
                      onCheckedChange={(checked) => updateSetting('passwordPolicy', 'requireSpecialChars', checked)}
                    />
                    <div>
                      <Label htmlFor="requireSpecialChars">Caractères spéciaux</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Au moins un caractère spécial (#, !, ?, etc.)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                <h3 className="font-medium mb-4">Règles d'expiration et de réutilisation</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="expiryDays">Expiration (en jours)</Label>
                      <Input
                        id="expiryDays"
                        type="number"
                        className="w-20 text-right"
                        value={settings.passwordPolicy.expiryDays}
                        onChange={(e) => updateSetting('passwordPolicy', 'expiryDays', parseInt(e.target.value))}
                        min={0}
                        max={365}
                      />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Nombre de jours avant expiration (0 = jamais)
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="preventReuse">Empêcher la réutilisation</Label>
                      <Input
                        id="preventReuse"
                        type="number"
                        className="w-20 text-right"
                        value={settings.passwordPolicy.preventReuse}
                        onChange={(e) => updateSetting('passwordPolicy', 'preventReuse', parseInt(e.target.value))}
                        min={0}
                        max={24}
                      />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Nombre de mots de passe précédents à vérifier (0 = non vérifié)
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">
                        Exemple de conformité de mot de passe
                      </h3>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        Avec les paramètres actuels, un exemple de mot de passe conforme serait:
                      </p>
                      <code className="mt-2 inline-block px-3 py-1 text-sm bg-blue-100 dark:bg-blue-800 rounded">
                        {settings.passwordPolicy.requireUppercase ? "A" : ""}
                        {settings.passwordPolicy.requireLowercase ? "b" : ""}
                        {settings.passwordPolicy.requireNumbers ? "1" : ""}
                        {settings.passwordPolicy.requireSpecialChars ? "#" : ""}
                        {"x".repeat(Math.max(0, settings.passwordPolicy.minLength - 
                          (settings.passwordPolicy.requireUppercase ? 1 : 0) - 
                          (settings.passwordPolicy.requireLowercase ? 1 : 0) - 
                          (settings.passwordPolicy.requireNumbers ? 1 : 0) - 
                          (settings.passwordPolicy.requireSpecialChars ? 1 : 0)))}
                      </code>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex justify-between">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                <RefreshCw className="h-4 w-4 inline mr-1" />
                Dernière mise à jour: {settings.updatedAt ? new Date(settings.updatedAt).toLocaleDateString() : 'Jamais'}
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  // Rétablir les valeurs par défaut pour la politique de mot de passe
                  const defaultSettings = {
                    ...settings,
                    passwordPolicy: {
                      minLength: 8,
                      requireUppercase: true,
                      requireLowercase: true,
                      requireNumbers: true,
                      requireSpecialChars: true,
                      preventReuse: 5,
                      expiryDays: 90
                    }
                  };
                  setSettings(defaultSettings as ISecuritySettings);
                }}
              >
                Réinitialiser aux valeurs par défaut
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Key className="h-5 w-5 mr-2 text-primary" />
                Récupération de compte
              </CardTitle>
              <CardDescription>
                Configuration des options de récupération de mot de passe
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Réinitialisation par email</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Permettre aux utilisateurs de réinitialiser leur mot de passe par email
                  </p>
                </div>
                <Switch
                  checked={settings.accountPolicy.forcePasswordChangeOnFirstLogin}
                  onCheckedChange={(checked) => updateSetting('accountPolicy', 'forcePasswordChangeOnFirstLogin', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <h3 className="font-medium">Expiration des liens de réinitialisation</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Délai d'expiration des liens de réinitialisation de mot de passe (en heures)
                  </p>
                </div>
                <Input
                  type="number"
                  className="w-20 text-right"
                  value={24} // Valeur par défaut, à remplacer par le champ réel si disponible
                  min={1}
                  max={72}
                  // Ajouter le gestionnaire d'événements si ce champ existe dans le modèle
                  // onChange={(e) => updateSetting('accountPolicy', 'resetLinkExpiry', parseInt(e.target.value))}
                  disabled={!settings.accountPolicy.forcePasswordChangeOnFirstLogin}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="session" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres de session</CardTitle>
              <CardDescription>
                Configuration des délais d'expiration de session
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sessionTimeout">Durée maximale de session (minutes)</Label>
                    <Input
                      id="sessionTimeout"
                      type="number"
                      className="w-20 text-right"
                      value={settings.sessionPolicy.sessionTimeout}
                      onChange={(e) => updateSetting('sessionPolicy', 'sessionTimeout', parseInt(e.target.value))}
                      min={15}
                      max={1440}
                    />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Temps avant déconnexion automatique
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="inactivityTimeout">Délai d'inactivité (minutes)</Label>
                    <Input
                      id="inactivityTimeout"
                      type="number"
                      className="w-20 text-right"
                      value={settings.sessionPolicy.inactivityTimeout}
                      onChange={(e) => updateSetting('sessionPolicy', 'inactivityTimeout', parseInt(e.target.value))}
                      min={1}
                      max={60}
                    />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Temps avant verrouillage temporaire
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <h3 className="font-medium">Limiter à une session simultanée</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Déconnecter les sessions existantes lors d'une nouvelle connexion
                  </p>
                </div>
                <Switch
                  checked={settings.sessionPolicy.singleSessionOnly}
                  onCheckedChange={(checked) => updateSetting('sessionPolicy', 'singleSessionOnly', checked)}
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Paramètres réseau</CardTitle>
              <CardDescription>
                Restrictions d'accès et protection du réseau
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Activer les restrictions d'adresses IP</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Limiter les connexions à certaines adresses IP
                  </p>
                </div>
                <Switch
                  checked={settings.networkPolicy.ipRestrictionEnabled}
                  onCheckedChange={(checked) => updateSetting('networkPolicy', 'ipRestrictionEnabled', checked)}
                />
              </div>
              
              {settings.networkPolicy.ipRestrictionEnabled && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="font-medium mb-3">Adresses IP autorisées</h3>
                  <div className="space-y-2">
                    {settings.networkPolicy.allowedIPs.map((ip, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Input
                          value={ip}
                          onChange={(e) => {
                            const newIPs = [...settings.networkPolicy.allowedIPs];
                            newIPs[index] = e.target.value;
                            updateSetting('networkPolicy', 'allowedIPs', newIPs);
                          }}
                          placeholder="ex: 192.168.1.0/24"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            const newIPs = settings.networkPolicy.allowedIPs.filter((_, i) => i !== index);
                            updateSetting('networkPolicy', 'allowedIPs', newIPs);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      onClick={() => {
                        const newIPs = [...settings.networkPolicy.allowedIPs, ''];
                        updateSetting('networkPolicy', 'allowedIPs', newIPs);
                      }}
                    >
                      Ajouter une adresse IP
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <h3 className="font-medium">Forcer HTTPS</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Rediriger automatiquement toutes les connexions HTTP vers HTTPS
                  </p>
                </div>
                <Switch
                  checked={settings.networkPolicy.enforceHTTPS}
                  onCheckedChange={(checked) => updateSetting('networkPolicy', 'enforceHTTPS', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Audit et journalisation</CardTitle>
              <CardDescription>
                Configuration de la journalisation des événements de sécurité
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="logLogins"
                    checked={settings.auditPolicy.logLogins}
                    onCheckedChange={(checked) => updateSetting('auditPolicy', 'logLogins', checked)}
                  />
                  <div>
                    <Label htmlFor="logLogins">Journaliser les connexions</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Journaliser les tentatives réussies et échouées
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="logModifications"
                    checked={settings.auditPolicy.logModifications}
                    onCheckedChange={(checked) => updateSetting('auditPolicy', 'logModifications', checked)}
                  />
                  <div>
                    <Label htmlFor="logModifications">Journaliser les modifications</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Journaliser les actions de création, modification et suppression
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <Label htmlFor="logRetentionDays">Durée de conservation des journaux (jours)</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Période avant archivage automatique
                  </p>
                </div>
                <Input
                  id="logRetentionDays"
                  type="number"
                  className="w-20 text-right"
                  value={settings.auditPolicy.logRetentionDays}
                  onChange={(e) => updateSetting('auditPolicy', 'logRetentionDays', parseInt(e.target.value))}
                  min={30}
                  max={3650}
                />
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <h3 className="font-medium">Notifications de sécurité</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Envoyer des alertes pour les événements critiques
                  </p>
                </div>
                <Switch
                  checked={settings.auditPolicy.enableNotifications}
                  onCheckedChange={(checked) => updateSetting('auditPolicy', 'enableNotifications', checked)}
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Historique des incidents de sécurité</CardTitle>
              <CardDescription>
                Derniers événements de sécurité détectés
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-800">
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Type</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Utilisateur</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">IP</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Détails</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidents && incidents.length > 0 ? (
                      incidents.map((incident, index) => (
                        <tr 
                          key={index} 
                          className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900"
                        >
                          <td className="px-4 py-3 text-sm font-medium">
                            {incident.type}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {new Date(incident.timestamp).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {incident.userEmail || 'Inconnu'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {incident.ipAddress}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {incident.details}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`
                              px-2 py-1 rounded-full text-xs font-medium 
                              ${incident.status === 'resolved' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : ''}
                              ${incident.status === 'blocked' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' : ''}
                              ${incident.status === 'alert' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' : ''}
                              ${incident.status === 'locked' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' : ''}
                              ${incident.status === 'info' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' : ''}
                            `}>
                              {incident.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                          Aucun incident de sécurité récent
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                
                <div className="mt-4 flex items-center justify-between border-t pt-4 dark:border-gray-800">
                  <div className="flex items-center">
                    <Shield className="mr-2 h-5 w-5 text-amber-500" />
                    <div>
                      <div className="text-sm font-medium">Incidents de sécurité récents</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {incidents && incidents.length > 0 
                          ? `${incidents.length} incident(s) détecté(s)`
                          : "Aucun incident récent"}
                      </div>
                    </div>
                  </div>
                  <Link 
                    href="/settings/security/incidents" 
                    className="inline-flex"
                  >
                    <Button variant="outline" size="sm">
                      Voir l'historique complet
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 