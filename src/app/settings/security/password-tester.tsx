'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { LockKeyhole, RefreshCw, Unlock, EyeOff, Eye } from 'lucide-react';
import { PasswordStrengthMeter } from '@/components/ui/password-strength-meter';
import { generateSecurePassword } from '@/lib/security/passwordStrengthMeter';
import { ISecuritySettings } from '@/models/SecuritySettings';

interface PasswordTesterProps {
  securitySettings: ISecuritySettings;
}

export default function PasswordTester({ securitySettings }: PasswordTesterProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleGeneratePassword = () => {
    const newPassword = generateSecurePassword(securitySettings);
    setPassword(newPassword);
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center">
          <LockKeyhole className="h-5 w-5 mr-2 text-primary" />
          Testeur de mot de passe
        </CardTitle>
        <CardDescription>
          Testez la force d'un mot de passe selon les règles actuelles
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex space-x-2">
          <div className="relative flex-1">
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Entrez un mot de passe à tester"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <Button variant="outline" onClick={handleGeneratePassword}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Générer
          </Button>
        </div>

        {password && (
          <PasswordStrengthMeter 
            password={password} 
            securitySettings={securitySettings} 
          />
        )}

        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md text-sm space-y-2">
          <p className="font-medium">Règles actuelles:</p>
          <ul className="space-y-1 text-gray-600 dark:text-gray-400 text-xs pl-5 list-disc">
            <li>Au moins {securitySettings.passwordPolicy.minLength} caractères</li>
            {securitySettings.passwordPolicy.requireUppercase && (
              <li>Au moins une lettre majuscule (A-Z)</li>
            )}
            {securitySettings.passwordPolicy.requireLowercase && (
              <li>Au moins une lettre minuscule (a-z)</li>
            )}
            {securitySettings.passwordPolicy.requireNumbers && (
              <li>Au moins un chiffre (0-9)</li>
            )}
            {securitySettings.passwordPolicy.requireSpecialChars && (
              <li>Au moins un caractère spécial (!@#$%^&*)</li>
            )}
            {securitySettings.passwordPolicy.expiryDays > 0 && (
              <li>Expiration après {securitySettings.passwordPolicy.expiryDays} jours</li>
            )}
            {securitySettings.passwordPolicy.preventReuse > 0 && (
              <li>Ne peut pas réutiliser les {securitySettings.passwordPolicy.preventReuse} derniers mots de passe</li>
            )}
          </ul>
        </div>
      </CardContent>
      <CardFooter className="bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Ce testeur n'enregistre pas les mots de passe saisis. Les données restent uniquement dans votre navigateur.
        </div>
      </CardFooter>
    </Card>
  );
} 