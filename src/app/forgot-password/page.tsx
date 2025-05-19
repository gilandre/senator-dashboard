'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { APP_CONFIG } from '@/config/app';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Simule l'envoi d'un email de réinitialisation
      // Dans un environnement réel, vous feriez un appel API pour envoyer le lien de réinitialisation
      // par exemple: 
      // const response = await fetch('/api/auth/forgot-password', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email }),
      // });
      
      // Simulation d'une réponse réussie
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setSuccess(true);
    } catch (error) {
      setError('Une erreur est survenue. Veuillez réessayer.');
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
          <span className="text-xl font-bold text-gray-900 dark:text-white">{APP_CONFIG.name}</span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-grow flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
            <div className="px-8 pt-8 pb-6 border-b border-gray-200 dark:border-gray-700">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center">
                {success ? 'Vérifiez votre email' : 'Mot de passe oublié'}
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 text-center">
                {success 
                  ? 'Des instructions pour réinitialiser votre mot de passe ont été envoyées à votre adresse email.' 
                  : 'Entrez votre adresse email pour recevoir un lien de réinitialisation.'}
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
                      <Mail className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  </div>
                  
                  <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                    Si un compte existe avec l'adresse email <strong>{email}</strong>, 
                    vous recevrez un email avec les instructions pour réinitialiser votre mot de passe.
                  </p>
                  
                  <div className="pt-4">
                    <Button 
                      onClick={() => router.push('/login')}
                      className="w-full flex justify-center items-center gap-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Retour à la connexion
                    </Button>
                  </div>
                </div>
              ) : (
                <form className="space-y-6" onSubmit={handleSubmit}>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Adresse e-mail
                    </label>
                    <div className="mt-1">
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                        placeholder="votre@email.com"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col space-y-3">
                    <Button
                      type="submit"
                      className="w-full flex justify-center items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <Mail className="h-4 w-4" />
                      )}
                      {isLoading ? "Envoi en cours..." : "Envoyer les instructions"}
                    </Button>
                    
                    <Link href="/auth/login" className="text-sm text-center text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300">
                      Retour à la connexion
                    </Link>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 text-center text-sm text-gray-600 dark:text-gray-400">
        <p>&copy; {new Date().getFullYear()} {APP_CONFIG.name}. Tous droits réservés.</p>
      </footer>
    </div>
  );
} 