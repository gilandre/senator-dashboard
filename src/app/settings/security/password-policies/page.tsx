'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2, Save, RefreshCw, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from '@/components/ui/breadcrumb';

interface PasswordPolicy {
  min_length: number;
  require_uppercase: boolean;
  require_numbers: boolean;
  require_special: boolean;
  password?: string;
}

interface RolePasswordPolicies {
  default: PasswordPolicy;
  admin: PasswordPolicy;
  operator: PasswordPolicy;
  user: PasswordPolicy;
  [key: string]: PasswordPolicy;
}

interface SecuritySettings {
  id: number;
  min_password_length: number;
  require_special_chars: boolean;
  require_numbers: boolean;
  require_uppercase: boolean;
  password_history_count: number;
  max_login_attempts: number;
  lock_duration_minutes: number;
  two_factor_auth_enabled: boolean;
  temp_password_length: number;
  temp_password_expiry_hours: number;
  role_password_policies: string;
}

export default function PasswordPoliciesPage() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<SecuritySettings | null>(null);
  const [policies, setPolicies] = useState<RolePasswordPolicies>({
    default: { min_length: 12, require_uppercase: true, require_numbers: true, require_special: true, password: 'P@ssw0rd' },
    admin: { min_length: 16, require_uppercase: true, require_numbers: true, require_special: true, password: 'P@ssw0rd' },
    operator: { min_length: 14, require_uppercase: true, require_numbers: true, require_special: true, password: 'P@ssw0rd' },
    user: { min_length: 12, require_uppercase: true, require_numbers: true, require_special: true, password: 'P@ssw0rd' }
  });
  const [activeTab, setActiveTab] = useState('general');
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({
    default: false,
    admin: false,
    operator: false,
    user: false
  });
  
  // Fetch security settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings/security');
        const data = await response.json();
        
        if (data) {
          setSettings(data);
          
          // Parse role password policies if available
          if (data.role_password_policies) {
            try {
              const parsedPolicies = JSON.parse(data.role_password_policies);
              // Ensure all roles have policies
              const completePolicies = {
                default: { min_length: 12, require_uppercase: true, require_numbers: true, require_special: true, password: 'P@ssw0rd' },
                admin: { min_length: 16, require_uppercase: true, require_numbers: true, require_special: true, password: 'P@ssw0rd' },
                operator: { min_length: 14, require_uppercase: true, require_numbers: true, require_special: true, password: 'P@ssw0rd' },
                user: { min_length: 12, require_uppercase: true, require_numbers: true, require_special: true, password: 'P@ssw0rd' },
                ...parsedPolicies
              };
              setPolicies(completePolicies);
            } catch (error) {
              console.error('Erreur lors du parsing des politiques:', error);
            }
          }
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des paramètres de sécurité:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible de récupérer les paramètres de sécurité',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSettings();
  }, []);
  
  const handlePolicyChange = (role: string, field: keyof PasswordPolicy, value: any) => {
    setPolicies(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [field]: value
      }
    }));
  };
  
  const togglePasswordVisibility = (role: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [role]: !prev[role]
    }));
  };
  
  const handleSubmit = async () => {
    if (!settings) return;
    
    setIsSaving(true);
    
    try {
      const updatedSettings = {
        ...settings,
        role_password_policies: JSON.stringify(policies)
      };
      
      const response = await fetch('/api/settings/security', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedSettings)
      });
      
      if (response.ok) {
        toast({
          title: 'Succès',
          description: 'Les politiques de mot de passe ont été mises à jour',
          variant: 'default'
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la mise à jour des politiques');
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des paramètres:', error);
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur lors de la mise à jour des politiques',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const resetSettings = async () => {
    if (!confirm('Êtes-vous sûr de vouloir réinitialiser tous les paramètres aux valeurs par défaut ?')) {
      return;
    }
    
    setIsSaving(true);
    
    try {
      const response = await fetch('/api/settings/security?action=reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Recharger la page pour voir les nouveaux paramètres
        window.location.reload();
        
        toast({
          title: 'Succès',
          description: 'Les paramètres ont été réinitialisés aux valeurs par défaut',
          variant: 'default'
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la réinitialisation des paramètres');
      }
    } catch (error) {
      console.error('Erreur lors de la réinitialisation des paramètres:', error);
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur lors de la réinitialisation des paramètres',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Tableau de bord</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/settings">Paramètres</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/settings/security">Sécurité</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <span className="font-medium">Politiques de mot de passe</span>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Politiques de mot de passe</h1>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={resetSettings} disabled={isSaving} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Réinitialiser
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving} className="flex items-center gap-2">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer
          </Button>
        </div>
      </div>
      
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Ces paramètres définissent les politiques de mot de passe pour l'application et les mots de passe par défaut pour les nouveaux utilisateurs.
        </AlertDescription>
      </Alert>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="general">Général</TabsTrigger>
          <TabsTrigger value="default">Par défaut</TabsTrigger>
          <TabsTrigger value="admin">Administrateur</TabsTrigger>
          <TabsTrigger value="operator">Opérateur</TabsTrigger>
          <TabsTrigger value="user">Utilisateur</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres généraux des mots de passe</CardTitle>
              <CardDescription>
                Configurez les exigences globales pour tous les mots de passe
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="min_password_length">Longueur minimale</Label>
                    <Input
                      id="min_password_length"
                      type="number"
                      min={8}
                      max={32}
                      value={settings?.min_password_length || 12}
                      onChange={e => {
                        if (settings) {
                          setSettings({
                            ...settings,
                            min_password_length: parseInt(e.target.value)
                          });
                        }
                      }}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="password_history_count">Historique des mots de passe</Label>
                    <Input
                      id="password_history_count"
                      type="number"
                      min={0}
                      max={20}
                      value={settings?.password_history_count || 3}
                      onChange={e => {
                        if (settings) {
                          setSettings({
                            ...settings,
                            password_history_count: parseInt(e.target.value)
                          });
                        }
                      }}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Nombre de mots de passe précédents qui ne peuvent pas être réutilisés (0 pour désactiver)
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="require_uppercase">Majuscules requises</Label>
                    <Switch
                      id="require_uppercase"
                      checked={settings?.require_uppercase || false}
                      onCheckedChange={checked => {
                        if (settings) {
                          setSettings({
                            ...settings,
                            require_uppercase: checked
                          });
                        }
                      }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="require_numbers">Chiffres requis</Label>
                    <Switch
                      id="require_numbers"
                      checked={settings?.require_numbers || false}
                      onCheckedChange={checked => {
                        if (settings) {
                          setSettings({
                            ...settings,
                            require_numbers: checked
                          });
                        }
                      }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="require_special_chars">Caractères spéciaux requis</Label>
                    <Switch
                      id="require_special_chars"
                      checked={settings?.require_special_chars || false}
                      onCheckedChange={checked => {
                        if (settings) {
                          setSettings({
                            ...settings,
                            require_special_chars: checked
                          });
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Mots de passe temporaires</CardTitle>
              <CardDescription>
                Paramètres pour les mots de passe temporaires et la première connexion
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="temp_password_length">Longueur des mots de passe temporaires</Label>
                  <Input
                    id="temp_password_length"
                    type="number"
                    min={8}
                    max={32}
                    value={settings?.temp_password_length || 16}
                    onChange={e => {
                      if (settings) {
                        setSettings({
                          ...settings,
                          temp_password_length: parseInt(e.target.value)
                        });
                      }
                    }}
                  />
                </div>
                
                <div>
                  <Label htmlFor="temp_password_expiry_hours">Expiration des mots de passe temporaires (heures)</Label>
                  <Input
                    id="temp_password_expiry_hours"
                    type="number"
                    min={1}
                    max={168}
                    value={settings?.temp_password_expiry_hours || 24}
                    onChange={e => {
                      if (settings) {
                        setSettings({
                          ...settings,
                          temp_password_expiry_hours: parseInt(e.target.value)
                        });
                      }
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Tab for each role */}
        {['default', 'admin', 'operator', 'user'].map(role => (
          <TabsContent key={role} value={role} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>
                  {role === 'default' ? 'Politique par défaut' : 
                   role === 'admin' ? 'Politique administrateur' : 
                   role === 'operator' ? 'Politique opérateur' : 
                   'Politique utilisateur standard'}
                </CardTitle>
                <CardDescription>
                  Définissez les règles spécifiques pour les {role === 'default' ? 'utilisateurs par défaut' : `utilisateurs ${role}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor={`${role}_min_length`}>Longueur minimale</Label>
                      <Input
                        id={`${role}_min_length`}
                        type="number"
                        min={8}
                        max={32}
                        value={policies[role]?.min_length || 12}
                        onChange={e => handlePolicyChange(role, 'min_length', parseInt(e.target.value))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`${role}_password`}>Mot de passe par défaut</Label>
                      <div className="flex">
                        <Input
                          id={`${role}_password`}
                          type={showPasswords[role] ? 'text' : 'password'}
                          value={policies[role]?.password || 'P@ssw0rd'}
                          onChange={e => handlePolicyChange(role, 'password', e.target.value)}
                          className="rounded-r-none"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => togglePasswordVisibility(role)}
                          className="rounded-l-none"
                        >
                          {showPasswords[role] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Ce mot de passe sera attribué aux nouveaux utilisateurs {role} lors de leur création
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`${role}_require_uppercase`}>Majuscules requises</Label>
                      <Switch
                        id={`${role}_require_uppercase`}
                        checked={policies[role]?.require_uppercase || false}
                        onCheckedChange={checked => handlePolicyChange(role, 'require_uppercase', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`${role}_require_numbers`}>Chiffres requis</Label>
                      <Switch
                        id={`${role}_require_numbers`}
                        checked={policies[role]?.require_numbers || false}
                        onCheckedChange={checked => handlePolicyChange(role, 'require_numbers', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`${role}_require_special`}>Caractères spéciaux requis</Label>
                      <Switch
                        id={`${role}_require_special`}
                        checked={policies[role]?.require_special || false}
                        onCheckedChange={checked => handlePolicyChange(role, 'require_special', checked)}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
      
      <div className="flex justify-end mt-6">
        <Button onClick={handleSubmit} disabled={isSaving} className="flex items-center gap-2">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Enregistrer les modifications
        </Button>
      </div>
    </div>
  );
} 