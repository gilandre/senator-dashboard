"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, Building, Shield, Smartphone, Edit, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ChartCard from '@/components/dashboard/chart-card';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState<any>(null);

  useEffect(() => {
    // Charger les informations utilisateur du localStorage
    const loadUserData = () => {
      try {
        const userData = localStorage.getItem('user');
        if (!userData) {
          // Rediriger vers la page de connexion si l'utilisateur n'est pas connecté
          router.push('/login');
          return;
        }
        
        const parsedUser = JSON.parse(userData);
        setUser({
          ...parsedUser,
          phoneNumber: '+33 6 12 34 56 78', // Données fictives pour l'exemple
          department: 'Administration',
          lastLogin: new Date().toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        });
        setEditedUser({
          ...parsedUser,
          phoneNumber: '+33 6 12 34 56 78',
          department: 'Administration'
        });
      } catch (error) {
        console.error('Erreur lors du chargement des données utilisateur:', error);
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [router]);

  const handleEditToggle = () => {
    if (isEditing) {
      // Si on annule l'édition, on restaure les valeurs originales
      setEditedUser({
        ...user,
        name: user.name,
        phoneNumber: user.phoneNumber,
        department: user.department
      });
    }
    setIsEditing(!isEditing);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditedUser((prev: any) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = () => {
    // Mettre à jour les informations utilisateur
    const updatedUser = {
      ...user,
      name: editedUser.name,
      phoneNumber: editedUser.phoneNumber,
      department: editedUser.department
    };
    
    setUser(updatedUser);
    
    // Dans un environnement réel, vous feriez un appel API pour sauvegarder les modifications
    // fetch('/api/auth/update-profile', {
    //   method: 'PUT',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(editedUser)
    // });
    
    // Mettre à jour le localStorage
    localStorage.setItem('user', JSON.stringify(updatedUser));
    
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Profil Utilisateur</h1>
        {isEditing ? (
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={handleEditToggle}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Annuler
            </Button>
            <Button 
              onClick={handleSave}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Enregistrer
            </Button>
          </div>
        ) : (
          <Button 
            variant="outline" 
            onClick={handleEditToggle}
            className="flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            Modifier
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <ChartCard 
            title="Informations personnelles" 
            description="Vos informations d'utilisateur"
          >
            <div className="flex flex-col items-center p-6">
              <div className="w-32 h-32 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
                <User className="h-16 w-16" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {user.name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {user.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                Dernière connexion: {user.lastLogin}
              </p>
            </div>
          </ChartCard>
        </div>

        <div className="md:col-span-2">
          <ChartCard 
            title="Détails du compte" 
            description="Informations détaillées de votre compte"
          >
            <div className="space-y-6 p-4">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Nom complet
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="name"
                      value={editedUser.name}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white">{user.name}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Adresse e-mail
                  </label>
                  <p className="text-gray-900 dark:text-white">{user.email}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">L'adresse e-mail ne peut pas être modifiée</p>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    Numéro de téléphone
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="phoneNumber"
                      value={editedUser.phoneNumber}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white">{user.phoneNumber}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Département
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="department"
                      value={editedUser.department}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white">{user.department}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Rôle
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {user.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Le rôle ne peut être modifié que par un administrateur</p>
                </div>
              </div>
            </div>
          </ChartCard>
        </div>
      </div>

      <ChartCard 
        title="Préférences de notification" 
        description="Gérez vos préférences de notification"
      >
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Notifications par e-mail</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">Recevoir des notifications par e-mail</p>
            </div>
            <div className="relative inline-block w-10 mr-2 align-middle select-none">
              <input type="checkbox" name="emailNotifications" id="emailNotifications" defaultChecked 
                className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white dark:bg-gray-700 border-4 border-gray-300 dark:border-gray-600 appearance-none cursor-pointer" />
              <label htmlFor="emailNotifications" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 dark:bg-gray-600 cursor-pointer"></label>
            </div>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Alertes de sécurité</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">Recevoir des alertes sur les activités suspectes</p>
            </div>
            <div className="relative inline-block w-10 mr-2 align-middle select-none">
              <input type="checkbox" name="securityAlerts" id="securityAlerts" defaultChecked
                className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white dark:bg-gray-700 border-4 border-gray-300 dark:border-gray-600 appearance-none cursor-pointer" />
              <label htmlFor="securityAlerts" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 dark:bg-gray-600 cursor-pointer"></label>
            </div>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Rapports hebdomadaires</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">Recevoir un résumé hebdomadaire des activités</p>
            </div>
            <div className="relative inline-block w-10 mr-2 align-middle select-none">
              <input type="checkbox" name="weeklyReports" id="weeklyReports"
                className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white dark:bg-gray-700 border-4 border-gray-300 dark:border-gray-600 appearance-none cursor-pointer" />
              <label htmlFor="weeklyReports" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 dark:bg-gray-600 cursor-pointer"></label>
            </div>
          </div>
        </div>
      </ChartCard>
    </div>
  );
} 