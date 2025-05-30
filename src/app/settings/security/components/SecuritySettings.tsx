'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, RefreshCw } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SecuritySettings {
  require2FA: boolean;
  maxLoginAttempts: number;
  lockoutDuration: number;
  sessionTimeout: number;
  passwordMinLength: number;
  passwordRequireSpecial: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireUppercase: boolean;
  passwordExpiryDays: number;
  notifyOnIncident: boolean;
  notifyOnAccessDenied: boolean;
  notifyOnMultipleFailures: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  autoLockTimeout: number;
  requireReauthOnSensitive: boolean;
  maxConcurrentSessions: number;
  sessionInactivityTimeout: number;
}

export default function SecuritySettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SecuritySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings/security');
      if (!response.ok) throw new Error('Erreur lors de la récupération des paramètres');
      const data = await response.json();
      setSettings(data.settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les paramètres de sécurité"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings/security', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (!response.ok) throw new Error('Erreur lors de la sauvegarde');
      
      toast({
        title: "Succès",
        description: "Les paramètres de sécurité ont été mis à jour"
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de sauvegarder les paramètres"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Êtes-vous sûr de vouloir réinitialiser les paramètres de sécurité ?')) return;
    
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings/security?action=reset', {
        method: 'POST'
      });

      if (!response.ok) throw new Error('Erreur lors de la réinitialisation');
      
      await fetchSettings();
      toast({
        title: "Succès",
        description: "Les paramètres de sécurité ont été réinitialisés"
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de réinitialiser les paramètres"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!settings) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-end space-x-2">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={isSaving}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Réinitialiser
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Sauvegarder
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Authentification */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Authentification</h3>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="require2FA">Authentification à deux facteurs</Label>
              <Switch
                id="require2FA"
                checked={settings.require2FA}
                onCheckedChange={(checked) => setSettings({ ...settings, require2FA: checked })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxLoginAttempts">Tentatives de connexion maximales</Label>
              <Input
                id="maxLoginAttempts"
                type="number"
                min={1}
                max={10}
                value={settings.maxLoginAttempts}
                onChange={(e) => setSettings({ ...settings, maxLoginAttempts: parseInt(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lockoutDuration">Durée de verrouillage (minutes)</Label>
              <Input
                id="lockoutDuration"
                type="number"
                min={5}
                max={60}
                value={settings.lockoutDuration}
                onChange={(e) => setSettings({ ...settings, lockoutDuration: parseInt(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sessionTimeout">Délai d'expiration de session (minutes)</Label>
              <Input
                id="sessionTimeout"
                type="number"
                min={5}
                max={120}
                value={settings.sessionTimeout}
                onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) })}
              />
            </div>
          </div>
        </div>

        {/* Mot de passe */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Politique de mot de passe</h3>
          
          <div className="space-y-2">
            <div className="space-y-2">
              <Label htmlFor="passwordMinLength">Longueur minimale</Label>
              <Input
                id="passwordMinLength"
                type="number"
                min={8}
                max={32}
                value={settings.passwordMinLength}
                onChange={(e) => setSettings({ ...settings, passwordMinLength: parseInt(e.target.value) })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="passwordRequireSpecial">Caractères spéciaux requis</Label>
              <Switch
                id="passwordRequireSpecial"
                checked={settings.passwordRequireSpecial}
                onCheckedChange={(checked) => setSettings({ ...settings, passwordRequireSpecial: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="passwordRequireNumbers">Chiffres requis</Label>
              <Switch
                id="passwordRequireNumbers"
                checked={settings.passwordRequireNumbers}
                onCheckedChange={(checked) => setSettings({ ...settings, passwordRequireNumbers: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="passwordRequireUppercase">Majuscules requises</Label>
              <Switch
                id="passwordRequireUppercase"
                checked={settings.passwordRequireUppercase}
                onCheckedChange={(checked) => setSettings({ ...settings, passwordRequireUppercase: checked })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="passwordExpiryDays">Expiration du mot de passe (jours)</Label>
              <Input
                id="passwordExpiryDays"
                type="number"
                min={30}
                max={365}
                value={settings.passwordExpiryDays}
                onChange={(e) => setSettings({ ...settings, passwordExpiryDays: parseInt(e.target.value) })}
              />
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Notifications</h3>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="notifyOnIncident">Notifier sur les incidents</Label>
              <Switch
                id="notifyOnIncident"
                checked={settings.notifyOnIncident}
                onCheckedChange={(checked) => setSettings({ ...settings, notifyOnIncident: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="notifyOnAccessDenied">Notifier sur les accès refusés</Label>
              <Switch
                id="notifyOnAccessDenied"
                checked={settings.notifyOnAccessDenied}
                onCheckedChange={(checked) => setSettings({ ...settings, notifyOnAccessDenied: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="notifyOnMultipleFailures">Notifier sur les échecs multiples</Label>
              <Switch
                id="notifyOnMultipleFailures"
                checked={settings.notifyOnMultipleFailures}
                onCheckedChange={(checked) => setSettings({ ...settings, notifyOnMultipleFailures: checked })}
              />
            </div>
          </div>
        </div>

        {/* Paramètres avancés */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Paramètres avancés</h3>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="maintenanceMode">Mode maintenance</Label>
              <Switch
                id="maintenanceMode"
                checked={settings.maintenanceMode}
                onCheckedChange={(checked) => setSettings({ ...settings, maintenanceMode: checked })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maintenanceMessage">Message de maintenance</Label>
              <Input
                id="maintenanceMessage"
                value={settings.maintenanceMessage}
                onChange={(e) => setSettings({ ...settings, maintenanceMessage: e.target.value })}
                maxLength={500}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="autoLockTimeout">Délai de verrouillage automatique (minutes)</Label>
              <Input
                id="autoLockTimeout"
                type="number"
                min={1}
                max={60}
                value={settings.autoLockTimeout}
                onChange={(e) => setSettings({ ...settings, autoLockTimeout: parseInt(e.target.value) })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="requireReauthOnSensitive">Réauthentification pour les actions sensibles</Label>
              <Switch
                id="requireReauthOnSensitive"
                checked={settings.requireReauthOnSensitive}
                onCheckedChange={(checked) => setSettings({ ...settings, requireReauthOnSensitive: checked })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxConcurrentSessions">Sessions simultanées maximales</Label>
              <Input
                id="maxConcurrentSessions"
                type="number"
                min={1}
                max={10}
                value={settings.maxConcurrentSessions}
                onChange={(e) => setSettings({ ...settings, maxConcurrentSessions: parseInt(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sessionInactivityTimeout">Délai d'inactivité de session (minutes)</Label>
              <Input
                id="sessionInactivityTimeout"
                type="number"
                min={5}
                max={120}
                value={settings.sessionInactivityTimeout}
                onChange={(e) => setSettings({ ...settings, sessionInactivityTimeout: parseInt(e.target.value) })}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 