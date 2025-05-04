'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, KeyRound, ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get('token');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState(true); // On suppose que le token est valide par défaut

  // Vérifier la validité du token à l'initialisation de la page
  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      setError('Token de réinitialisation manquant. Veuillez demander un nouveau lien de réinitialisation.');
      return;
    }

    // On pourrait vérifier la validité du token via une API
    // Dans un environnement réel, vous feriez un appel API pour vérifier le token
    // par exemple:
    // const checkToken = async () => {
    //   try {
    //     const response = await fetch(`/api/auth/verify-reset-token?token=${token}`);
    //     const data = await response.json();
    //     if (!response.ok || !data.valid) {
    //       setTokenValid(false);
    //       setError('Token de réinitialisation invalide ou expiré. Veuillez demander un nouveau lien de réinitialisation.');
    //     }
    //   } catch (error) {
    //     setTokenValid(false);
    //     setError('Une erreur est survenue lors de la vérification du token.');
    //   }
    // };
    // checkToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tokenValid) {
      return;
    }

    // Valider les mots de passe
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Dans un environnement réel, vous feriez un appel API pour réinitialiser le mot de passe
      // par exemple:
      // const response = await fetch('/api/auth/reset-password', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ token, newPassword: password }),
      // });
      // 
      // if (!response.ok) {
      //   const data = await response.json();
      //   throw new Error(data.error || 'Une erreur est survenue');
      // }

      // Simulation d'une réponse réussie
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setSuccess(true);
    } catch (error: any) {
      setError(error.message || 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-emerald-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="w-full py-6 px-4 flex justify-center">
        <div className="flex items-center space-x-2">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-md shadow-lg"></div>
            <div className="absolute inset-1 bg-white dark:bg-gray-900 rounded-sm flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-lg">S</div>
          </div>
          <span className="text-xl font-bold text-gray-900 dark:text-white">SENATOR INVESTECH</span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-grow flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
            <div className="px-8 pt-8 pb-6 border-b border-gray-200 dark:border-gray-700">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center">
                {success ? 'Mot de passe réinitialisé' : 'Réinitialiser votre mot de passe'}
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 text-center">
                {success 
                  ? 'Votre mot de passe a été réinitialisé avec succès.' 
                  : tokenValid ? 'Créez un nouveau mot de passe pour votre compte.' : 'Une erreur est survenue.'}
              </p>
            </div>

            <div className="p-8">
              {error && (
                <div className="mb-6 p-3 rounded-md bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}
              
              {success ? (
                <div className="space-y-6">
                  <div className="flex justify-center">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
                      <Check className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  </div>
                  
                  <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                    Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
                  </p>
                  
                  <div className="pt-4">
                    <Button 
                      onClick={() => router.push('/login')}
                      className="w-full flex justify-center items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Aller à la page de connexion
                    </Button>
                  </div>
                </div>
              ) : tokenValid ? (
                <form className="space-y-6" onSubmit={handleSubmit}>
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Nouveau mot de passe
                    </label>
                    <div className="mt-1 relative">
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 dark:text-gray-400"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Le mot de passe doit contenir au moins 8 caractères
                    </p>
                  </div>
                  
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Confirmer le mot de passe
                    </label>
                    <div className="mt-1 relative">
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 dark:text-gray-400"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <Button
                      type="submit"
                      className="w-full flex justify-center items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <KeyRound className="h-4 w-4" />
                      )}
                      {isLoading ? "Réinitialisation en cours..." : "Réinitialiser le mot de passe"}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-6">
                  <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                    Le lien de réinitialisation est invalide ou a expiré. Veuillez demander un nouveau lien de réinitialisation.
                  </p>
                  
                  <div className="pt-4">
                    <Button 
                      onClick={() => router.push('/forgot-password')}
                      className="w-full flex justify-center items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Demander un nouveau lien
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 text-center text-sm text-gray-600 dark:text-gray-400">
        <p>&copy; {new Date().getFullYear()} QUANTINNUM EA. Tous droits réservés.</p>
      </footer>
    </div>
  );
} 