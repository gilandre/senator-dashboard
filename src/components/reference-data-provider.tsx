'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import axios from 'axios';
import { Loader2 } from 'lucide-react';

// Type pour les données de référence
export type ReferenceDataItem = {
  id: number;
  code: string;
  value: string;
  display_name: string;
  description?: string;
  type: string;
  module: string;
  feature?: string;
  is_active: boolean;
  sort_order: number;
  color_code?: string;
  icon_name?: string;
};

// Type pour le contexte
type ReferenceDataContextType = {
  referenceData: ReferenceDataItem[];
  getItems: (type: string, module?: string, feature?: string) => ReferenceDataItem[];
  getItemByCode: (type: string, code: string, module?: string) => ReferenceDataItem | undefined;
  getDisplayName: (type: string, code: string, module?: string) => string;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

// Contexte pour les données de référence
const ReferenceDataContext = createContext<ReferenceDataContextType | undefined>(undefined);

// Hook pour utiliser les données de référence
export const useReferenceData = () => {
  const context = useContext(ReferenceDataContext);
  if (!context) {
    throw new Error('useReferenceData must be used within a ReferenceDataProvider');
  }
  return context;
};

// Propriétés du provider
type ReferenceDataProviderProps = {
  children: ReactNode;
  preloadTypes?: string[];
  preloadModules?: string[];
};

// Provider des données de référence
export function ReferenceDataProvider({ 
  children, 
  preloadTypes = ['status', 'role'],
  preloadModules = ['users'] 
}: ReferenceDataProviderProps) {
  const [referenceData, setReferenceData] = useState<ReferenceDataItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fonction pour charger les données de référence
  const loadReferenceData = async () => {
    setIsLoading(true);
    setError(null);
    
    console.log("ReferenceDataProvider - Chargement des données de référence...");
    console.log("ReferenceDataProvider - Types:", preloadTypes);
    console.log("ReferenceDataProvider - Modules:", preloadModules);
    
    try {
      // Construire les paramètres de requête
      const params = new URLSearchParams();
      preloadTypes.forEach(type => params.append('type', type));
      preloadModules.forEach(module => params.append('module', module));
      params.append('active', 'true');

      console.log("ReferenceDataProvider - URL params:", params.toString());
      const response = await axios.get(`/api/reference-data?${params.toString()}`);
      
      console.log("ReferenceDataProvider - Réponse API:", response.data);
      
      if (response.data && response.data.reference_data) {
        setReferenceData(response.data.reference_data);
        
        // Log des données chargées, particulièrement les rôles
        const roles = response.data.reference_data.filter((item: ReferenceDataItem) => item.type === 'role');
        console.log("ReferenceDataProvider - Rôles chargés:", roles);
      } else {
        console.error('Format de réponse inattendu:', response.data);
        setError('Format de réponse inattendu');
      }
    } catch (err: any) {
      console.error('Erreur lors du chargement des données de référence:', err);
      setError(err.message || 'Erreur lors du chargement des données de référence');
    } finally {
      setIsLoading(false);
    }
  };

  // Charger les données au montage du composant
  useEffect(() => {
    loadReferenceData();
  }, []);

  // Fonction pour filtrer les éléments par type, module et feature
  const getItems = (type: string, module?: string, feature?: string): ReferenceDataItem[] => {
    console.log(`getItems - Recherche éléments de type=${type}, module=${module || 'any'}, feature=${feature || 'any'}`);
    console.log(`getItems - Données disponibles:`, referenceData.length);
    
    const items = referenceData.filter(item => 
      item.type === type && 
      (module ? item.module === module : true) && 
      (feature ? item.feature === feature : true)
    ).sort((a, b) => a.sort_order - b.sort_order);
    
    // Ajouter des logs pour le débogage
    if (type === 'role') {
      console.log(`getItems - Résultats pour ${type}:`, items);
      
      // Log des ID des rôles pour comparer avec les role_id des utilisateurs
      console.log(`getItems - IDs des rôles disponibles:`, items.map(item => item.id));
    }
    
    return items;
  };

  // Fonction pour obtenir un élément par son code
  const getItemByCode = (type: string, code: string, module?: string): ReferenceDataItem | undefined => {
    console.log(`getItemByCode - Recherche élément de type=${type}, code=${code}, module=${module || 'any'}`);
    
    const item = referenceData.find(item => 
      item.type === type && 
      item.code === code && 
      (module ? item.module === module : true)
    );
    
    console.log(`getItemByCode - Résultat:`, item);
    return item;
  };

  // Fonction pour obtenir le nom d'affichage d'un code
  const getDisplayName = (type: string, code: string, module?: string): string => {
    const item = getItemByCode(type, code, module);
    return item ? item.display_name : code;
  };

  // Valeur du contexte
  const contextValue: ReferenceDataContextType = {
    referenceData,
    getItems,
    getItemByCode,
    getDisplayName,
    isLoading,
    error,
    refresh: loadReferenceData
  };

  // Si les données sont en cours de chargement, afficher un indicateur
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-24">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2">Chargement des données de référence...</span>
      </div>
    );
  }

  // Si une erreur s'est produite, afficher un message d'erreur
  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <h3 className="text-red-800 font-medium">Erreur de chargement</h3>
        <p className="text-red-600">{error}</p>
        <button 
          onClick={loadReferenceData}
          className="mt-2 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded-md"
        >
          Réessayer
        </button>
      </div>
    );
  }

  // Rendu du provider
  return (
    <ReferenceDataContext.Provider value={contextValue}>
      {children}
    </ReferenceDataContext.Provider>
  );
} 