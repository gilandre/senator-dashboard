import React from 'react';
import ChangePasswordForm from './change-password-form';

export default function ChangePasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Changement de mot de passe requis</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Pour des raisons de sécurité, vous devez changer votre mot de passe avant de continuer.
          </p>
        </div>
        
        <ChangePasswordForm />
      </div>
    </div>
  );
} 