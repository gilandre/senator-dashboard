'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Shield, 
  Search, 
  Download, 
  RefreshCw,
  Filter, 
  Calendar,
  X
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ISecurityIncident } from '@/models/SecurityIncident';
import { useToast } from '@/components/ui/use-toast';

// Composant DatePicker personnalisé
function DatePicker({ value, onChange, placeholder }: { value: Date | null, onChange: (date: Date | null) => void, placeholder: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start text-left font-normal"
        >
          <Calendar className="mr-2 h-4 w-4" />
          {value ? format(value, 'dd/MM/yyyy') : <span className="text-muted-foreground">{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <CalendarComponent
          mode="single"
          selected={value}
          onSelect={(date: Date | undefined) => onChange(date || null)}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

interface PaginationState {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export default function SecurityIncidentsClient() {
  // État des données
  const [incidents, setIncidents] = useState<ISecurityIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 20,
    totalItems: 0,
    totalPages: 0
  });
  
  // État des filtres
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    startDate: null as Date | null,
    endDate: null as Date | null,
    userId: ''
  });
  
  const [showFilters, setShowFilters] = useState(false);
  const { toast } = useToast();
  
  // Charger les incidents
  const loadIncidents = async () => {
    try {
      setLoading(true);
      
      // Construire l'URL avec les paramètres de recherche
      const params = new URLSearchParams();
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());
      
      // Ajouter les filtres s'ils sont définis
      if (filters.type) params.append('type', filters.type);
      if (filters.status) params.append('status', filters.status);
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.startDate) params.append('startDate', filters.startDate.toISOString());
      if (filters.endDate) params.append('endDate', filters.endDate.toISOString());
      
      const response = await fetch(`/api/security/incidents?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des incidents de sécurité');
      }
      
      const data = await response.json();
      
      if (data && data.data) {
        setIncidents(data.data);
        setPagination({
          page: data.pagination.page,
          limit: data.pagination.limit,
          totalItems: data.pagination.totalItems,
          totalPages: data.pagination.totalPages
        });
      } else {
        setIncidents([]);
        toast({
          description: 'Format de réponse inattendu pour les incidents',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des incidents:', error);
      setError((error as Error).message);
      toast({
        description: (error as Error).message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Charger les incidents lors du premier rendu
  useEffect(() => {
    loadIncidents();
  }, [pagination.page, pagination.limit]);
  
  // Gérer le changement de page
  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };
  
  // Appliquer les filtres
  const applyFilters = () => {
    setPagination(prev => ({ ...prev, page: 1 })); // Revenir à la première page
    loadIncidents();
  };
  
  // Réinitialiser les filtres
  const resetFilters = () => {
    setFilters({
      type: '',
      status: '',
      startDate: null,
      endDate: null,
      userId: ''
    });
    
    setPagination(prev => ({ ...prev, page: 1 }));
    loadIncidents();
  };
  
  // Formater la date pour l'affichage
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'medium'
    }).format(date);
  };
  
  // Exporter les incidents au format CSV
  const exportToCsv = () => {
    if (incidents.length === 0) {
      toast({
        description: 'Aucun incident à exporter',
        variant: 'destructive'
      });
      return;
    }
    
    // Utiliser l'API d'export
    const params = new URLSearchParams();
    params.append('format', 'csv');
    
    // Ajouter les filtres
    if (filters.type) params.append('type', filters.type);
    if (filters.status) params.append('status', filters.status);
    if (filters.userId) params.append('userId', filters.userId);
    if (filters.startDate) params.append('startDate', filters.startDate.toISOString());
    if (filters.endDate) params.append('endDate', filters.endDate.toISOString());
    
    // Générer l'URL et déclencher le téléchargement
    const exportUrl = `/api/security/incidents/export?${params.toString()}`;
    window.open(exportUrl, '_blank');
  };
  
  // Filtrer les incidents
  const filteredIncidents = useMemo(() => {
    return incidents.filter(incident => {
      // Filtre de type
      if (filters.type && filters.type !== 'all-types' && incident.type !== filters.type) {
        return false;
      }
      
      // Filtre de statut
      if (filters.status && filters.status !== 'all-statuses' && incident.status !== filters.status) {
        return false;
      }
      
      return true;
    });
  }, [incidents, filters.type, filters.status]);
  
  if (loading && incidents.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Chargement des incidents de sécurité...</p>
        </div>
      </div>
    );
  }
  
  if (error && incidents.length === 0) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <div className="flex items-start space-x-3">
          <X className="h-6 w-6 text-red-600 dark:text-red-400 mt-0.5" />
          <div>
            <h3 className="text-lg font-medium text-red-800 dark:text-red-300">
              Erreur lors du chargement des incidents
            </h3>
            <p className="text-red-600 dark:text-red-400 mt-1">{error}</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => loadIncidents()}
            >
              Réessayer
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <div>
            <CardTitle>Incidents de sécurité</CardTitle>
            <CardDescription>
              Historique des incidents de sécurité détectés par le système
            </CardDescription>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtres
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCsv}
              disabled={incidents.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={loadIncidents}
              disabled={loading}
              aria-label="Rafraîchir"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        
        {showFilters && (
          <div className="px-6 pb-4 border-b border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Select
                  value={filters.type}
                  onValueChange={(value) => setFilters({...filters, type: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Type d'incident" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-types">Tous les types</SelectItem>
                    <SelectItem value="login_failed">Échec de connexion</SelectItem>
                    <SelectItem value="login_success">Connexion réussie</SelectItem>
                    <SelectItem value="account_locked">Compte verrouillé</SelectItem>
                    <SelectItem value="password_changed">Mot de passe modifié</SelectItem>
                    <SelectItem value="security_setting_change">Paramètres modifiés</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Select
                  value={filters.status}
                  onValueChange={(value) => setFilters({...filters, status: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-statuses">Tous les statuts</SelectItem>
                    <SelectItem value="info">Information</SelectItem>
                    <SelectItem value="alert">Alerte</SelectItem>
                    <SelectItem value="blocked">Bloqué</SelectItem>
                    <SelectItem value="resolved">Résolu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex space-x-2">
                <div className="w-1/2">
                  <DatePicker
                    value={filters.startDate}
                    onChange={(date) => setFilters({...filters, startDate: date})}
                    placeholder="Date début"
                  />
                </div>
                <div className="w-1/2">
                  <DatePicker
                    value={filters.endDate}
                    onChange={(date) => setFilters({...filters, endDate: date})}
                    placeholder="Date fin"
                  />
                </div>
              </div>
              
              <div className="flex space-x-2">
                <Button 
                  variant="default" 
                  onClick={applyFilters}
                  className="flex-1"
                >
                  Appliquer
                </Button>
                <Button 
                  variant="outline" 
                  onClick={resetFilters}
                >
                  Réinitialiser
                </Button>
              </div>
            </div>
          </div>
        )}
        
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Utilisateur</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">IP</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Détails</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Statut</th>
                </tr>
              </thead>
              <tbody>
                {filteredIncidents && filteredIncidents.length > 0 ? (
                  filteredIncidents.map((incident, index) => (
                    <tr 
                      key={index} 
                      className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900"
                    >
                      <td className="px-4 py-3 text-sm font-medium">
                        {incident.type}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {formatDate(incident.timestamp)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {incident.userEmail || 'Inconnu'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {incident.ipAddress}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {incident.details}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`
                          px-2 py-1 rounded-full text-xs font-medium 
                          ${incident.status === 'resolved' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : ''}
                          ${incident.status === 'blocked' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' : ''}
                          ${incident.status === 'alert' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' : ''}
                          ${incident.status === 'locked' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' : ''}
                          ${incident.status === 'info' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' : ''}
                        `}>
                          {incident.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                      Aucun incident de sécurité à afficher
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
        
        {pagination.totalPages > 1 && (
          <CardFooter className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 px-4 py-3">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Page {pagination.page} sur {pagination.totalPages} ({pagination.totalItems} incidents)
            </div>
            
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1 || loading}
              >
                Précédent
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages || loading}
              >
                Suivant
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
} 