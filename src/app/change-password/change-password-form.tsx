'use client';

import React, { useState } from 'react';
import { 
  Eye, 
  EyeOff, 
  Lock, 
  Check, 
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ChangePasswordForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const { register, handleSubmit, watch, formState: { errors } } = useForm<PasswordFormData>();
  const newPassword = watch('newPassword', '');
  
  // Évaluer la force du mot de passe
  const getPasswordStrength = (password: string): 'weak' | 'medium' | 'strong' => {
    if (!password || password.length < 8) return 'weak';
    
    let strength = 0;
    
    // Vérifier les critères de complexité
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    
    // Évaluer la longueur
    if (password.length >= 12) strength += 1;
    
    if (strength <= 2) return 'weak';
    if (strength <= 4) return 'medium';
    return 'strong';
  };
  
  const passwordStrength = newPassword ? getPasswordStrength(newPassword) : null;
  
  const onSubmit = async (data: PasswordFormData) => {
    if (data.newPassword !== data.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors du changement de mot de passe');
      }
      
      // Succès
      setSuccess(true);
      
      // Rediriger après 2 secondes
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
      
    } catch (err: any) {
      setError(err.message || 'Une erreur s\'est produite');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Afficher le message de succès
  if (success) {
    return (
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <CheckCircle2 className="h-12 w-12 text-green-500" />
        </div>
        <h3 className="text-xl font-bold text-green-600 dark:text-green-400 mb-2">
          Mot de passe modifié avec succès
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Votre mot de passe a été changé. Vous allez être redirigé vers le tableau de bord.
        </p>
        <Button 
          variant="default" 
          onClick={() => router.push('/dashboard')}
        >
          Aller au tableau de bord
        </Button>
      </div>
    );
  }
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-800 dark:text-red-300 mb-4 flex items-start">
          <AlertTriangle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Mot de passe actuel</Label>
        <div className="relative">
          <Input
            id="currentPassword"
            type={showCurrentPassword ? 'text' : 'password'}
            placeholder="Entrez votre mot de passe actuel"
            {...register('currentPassword', { required: 'Ce champ est requis' })}
            disabled={isLoading}
            className={errors.currentPassword ? 'border-red-500' : ''}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
          >
            {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {errors.currentPassword && (
          <p className="text-red-500 text-sm mt-1">{errors.currentPassword.message}</p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="newPassword">Nouveau mot de passe</Label>
        <div className="relative">
          <Input
            id="newPassword"
            type={showNewPassword ? 'text' : 'password'}
            placeholder="Entrez votre nouveau mot de passe"
            {...register('newPassword', { 
              required: 'Ce champ est requis',
              minLength: { value: 8, message: 'Le mot de passe doit contenir au moins 8 caractères' }
            })}
            disabled={isLoading}
            className={errors.newPassword ? 'border-red-500' : ''}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
            onClick={() => setShowNewPassword(!showNewPassword)}
          >
            {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {errors.newPassword && (
          <p className="text-red-500 text-sm mt-1">{errors.newPassword.message}</p>
        )}
        
        {newPassword && (
          <div className="mt-2">
            <p className="text-sm mb-1 text-gray-500 dark:text-gray-400">Force du mot de passe:</p>
            <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`h-full ${
                  passwordStrength === 'weak' ? 'bg-red-500 w-1/3' : 
                  passwordStrength === 'medium' ? 'bg-yellow-500 w-2/3' : 
                  'bg-green-500 w-full'
                }`}
              />
            </div>
            <p className={`text-xs mt-1 ${
              passwordStrength === 'weak' ? 'text-red-500' : 
              passwordStrength === 'medium' ? 'text-yellow-500' : 
              'text-green-500'
            }`}>
              {passwordStrength === 'weak' ? 'Faible' : 
               passwordStrength === 'medium' ? 'Moyen' : 
               'Fort'}
            </p>
            
            <div className="mt-2 space-y-1">
              <div className="flex items-center text-sm">
                <div className={`w-4 h-4 rounded-full mr-2 flex items-center justify-center
                  ${/^.{8,}$/.test(newPassword) ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                  {/^.{8,}$/.test(newPassword) && <Check className="h-3 w-3 text-white" />}
                </div>
                <span className={/^.{8,}$/.test(newPassword) ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}>
                  Au moins 8 caractères
                </span>
              </div>
              <div className="flex items-center text-sm">
                <div className={`w-4 h-4 rounded-full mr-2 flex items-center justify-center
                  ${/[A-Z]/.test(newPassword) ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                  {/[A-Z]/.test(newPassword) && <Check className="h-3 w-3 text-white" />}
                </div>
                <span className={/[A-Z]/.test(newPassword) ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}>
                  Au moins une majuscule
                </span>
              </div>
              <div className="flex items-center text-sm">
                <div className={`w-4 h-4 rounded-full mr-2 flex items-center justify-center
                  ${/[0-9]/.test(newPassword) ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                  {/[0-9]/.test(newPassword) && <Check className="h-3 w-3 text-white" />}
                </div>
                <span className={/[0-9]/.test(newPassword) ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}>
                  Au moins un chiffre
                </span>
              </div>
              <div className="flex items-center text-sm">
                <div className={`w-4 h-4 rounded-full mr-2 flex items-center justify-center
                  ${/[^A-Za-z0-9]/.test(newPassword) ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                  {/[^A-Za-z0-9]/.test(newPassword) && <Check className="h-3 w-3 text-white" />}
                </div>
                <span className={/[^A-Za-z0-9]/.test(newPassword) ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}>
                  Au moins un caractère spécial
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="Confirmez votre nouveau mot de passe"
            {...register('confirmPassword', {
              required: 'Ce champ est requis',
              validate: value => value === newPassword || 'Les mots de passe ne correspondent pas'
            })}
            disabled={isLoading}
            className={errors.confirmPassword ? 'border-red-500' : ''}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>
        )}
      </div>
      
      <Button 
        type="submit" 
        disabled={isLoading} 
        className="w-full"
      >
        {isLoading ? (
          <>
            <span className="animate-spin mr-2 inline-block h-4 w-4 border-2 border-t-transparent border-white rounded-full"></span>
            Traitement en cours...
          </>
        ) : (
          <>
            <Lock className="mr-2 h-4 w-4" />
            Changer mon mot de passe
          </>
        )}
      </Button>
    </form>
  );
} 