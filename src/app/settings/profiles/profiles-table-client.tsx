"use client"

import React, { useState, useEffect } from 'react';
import { Shield, Users, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ChartCard from '@/components/dashboard/chart-card';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';

interface Profile {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  status: string;
  accessLevel: string;
  createdAt: string;
  updatedAt: string;
  usersCount: number;
  permissionsCount: number;
}

export default function ProfilesTableClient() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/profiles');
      console.log('Profils récupérés:', response.data);
      
      if (response.data && response.data.profiles) {
        setProfiles(response.data.profiles);
      }
      setError(null);
    } catch (err) {
      console.error('Erreur lors de la récupération des profils:', err);
      setError('Impossible de charger les profils. Veuillez réessayer plus tard.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = (id: string) => {
    router.push(`/settings/profiles/${id}`);
  };

  const handleManagePermissions = (id: string) => {
    router.push(`/settings/profiles/${id}/permissions`);
  };

  const handleToggleStatus = async (id: string, isActive: boolean) => {
    try {
      const response = await axios.put(`/api/profiles/${id}`, {
        isActive: !isActive
      });

      if (response.status === 200) {
        // Mise à jour locale de l'état
        setProfiles(prevProfiles => 
          prevProfiles.map(profile => 
            profile.id === id ? { ...profile, isActive: !isActive } : profile
          )
        );
      }
    } catch (err) {
      console.error(`Erreur lors de la modification du statut du profil:`, err);
      alert('Une erreur est survenue. Veuillez réessayer.');
    }
  };

  const filteredProfiles = searchTerm 
    ? profiles.filter(profile => 
        profile.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        profile.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : profiles;

  function getAccessLevelClass(level: string) {
    switch (level) {
      case 'Complet': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'Élevé': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'Moyen': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'Limité': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      default: return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    }
  }

  return (
    <ChartCard 
      title="Profils du système" 
      description="Gestion des profils et leurs permissions"
    >
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input 
            type="text" 
            placeholder="Rechercher un profil..." 
            className="pl-9 py-2 pr-4 w-full md:w-80 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Rechercher un profil"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-8 flex justify-center">
          <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-primary rounded-full"></div>
        </div>
      ) : error ? (
        <div className="py-8 text-center text-red-500">{error}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Profil</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Description</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Utilisateurs</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Permissions</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Niveau d'accès</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Statut</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    {searchTerm ? 'Aucun profil ne correspond à votre recherche' : 'Aucun profil trouvé'}
                  </td>
                </tr>
              ) : (
                filteredProfiles.map((profile) => {
                  const accessLevelClass = getAccessLevelClass(profile.accessLevel);
                  
                  return (
                    <tr key={profile.id} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900">
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mr-3">
                            <Shield className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          </div>
                          {profile.name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{profile.description}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-2 text-gray-500" />
                          {profile.usersCount}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                          {profile.permissionsCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${accessLevelClass}`}>
                          {profile.accessLevel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          profile.isActive 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                        }`}>
                          {profile.isActive ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEditProfile(profile.id)}
                          >
                            Modifier
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleManagePermissions(profile.id)}
                          >
                            Permissions
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className={profile.isActive 
                              ? "text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                              : "text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                            }
                            onClick={() => handleToggleStatus(profile.id, profile.isActive)}
                          >
                            {profile.isActive ? 'Désactiver' : 'Activer'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </ChartCard>
  );
} 