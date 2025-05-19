'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { 
  Search, 
  RefreshCw, 
  MoreHorizontal, 
  Eye, 
  ClipboardList,
  Users,
  BadgeCheck,
  Building2,
  BadgeInfo
} from 'lucide-react';

interface Visitor {
  id: number;
  badge_number: string;
  first_name: string;
  last_name: string;
  company: string;
  reason: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  access_count: number;
  first_seen: string | null;
  last_seen: string | null;
  isSharedBadge: boolean;
  badgeHistory: Visitor[];
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function VisitorList() {
  const router = useRouter();
  
  // State
  const [loading, setLoading] = useState(true);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [companies, setCompanies] = useState<string[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0
  });
  const [filters, setFilters] = useState({
    search: '',
    status: ''
  });
  
  const [kpiStats, setKpiStats] = useState({
    totalActive: 0,
    totalSharedBadges: 0
  });
  
  // Fetch data
  const fetchVisitors = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/visitors', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          ...filters
        }
      });

      setVisitors(response.data.visitors);
      setCompanies(response.data.companies);
      setPagination({
        total: response.data.total,
        page: response.data.currentPage,
        limit: pagination.limit,
        totalPages: response.data.totalPages
      });
      
      // Calculate KPIs
      const activeVisitors = response.data.visitors.filter(
        (visitor: Visitor) => visitor.status === 'active'
      ).length;
      
      const sharedBadgesCount = (response.data.badgeHistories || []).filter(
        (history: any) => history.isShared
      ).length;
      
      setKpiStats({
        totalActive: activeVisitors,
        totalSharedBadges: sharedBadgesCount
      });
      
    } catch (error) {
      console.error('Error fetching visitors:', error);
      toast({
        title: "Erreur",
        description: "Impossible de récupérer la liste des visiteurs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Effect to fetch data on mount and when filters/pagination change
  useEffect(() => {
    fetchVisitors();
  }, [pagination.page, pagination.limit, filters]);

  // Handle refresh
  const handleRefresh = () => {
    fetchVisitors();
  };

  // Handle filter changes
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  // Navigate to visitor detail
  const viewVisitorDetail = (visitor: Visitor) => {
    router.push(`/visitors/${visitor.id}`);
  };

  // Navigate to visitor presence
  const viewVisitorPresence = (visitor: Visitor) => {
    router.push(`/attendance?badge=${visitor.badge_number}`);
  };

  // Render status badge
  const renderStatusBadge = (status: string, isSharedBadge: boolean = false) => {
    const variants: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
      active: "default",
      inactive: "secondary"
    };

    let label = status === 'active' ? "Actif" : "Inactif";
    
    // Pour les badges partagés, modifier l'affichage
    if (isSharedBadge) {
      return (
        <div className="flex items-center gap-1">
          <Badge variant={variants[status]}>
            {label}
          </Badge>
          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
            Badge partagé
          </Badge>
        </div>
      );
    }

    return (
      <Badge variant={variants[status]}>
        {label}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Active Visitors KPI */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Visiteurs Actifs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Users className="h-5 w-5 text-muted-foreground mr-2" />
              <div className="text-2xl font-bold">
                {loading ? <Skeleton className="h-8 w-16" /> : kpiStats.totalActive}
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  / {pagination.total}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Badges KPI */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Badges Partagés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <BadgeInfo className="h-5 w-5 text-muted-foreground mr-2" />
              <div className="text-2xl font-bold">
                {loading ? <Skeleton className="h-8 w-16" /> : kpiStats.totalSharedBadges}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Liste des visiteurs</CardTitle>
            <CardDescription>
              Consultez les informations des visiteurs et leurs badges
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button 
              onClick={async () => {
                try {
                  setLoading(true);
                  const response = await axios.post('/api/batch/import-visitors');
                  if (response.status === 200) {
                    const stats = response.data.stats;
                    toast({
                      title: "Importation réussie",
                      description: `${stats.created} visiteurs créés, ${stats.updated} mis à jour, ${stats.skipped} ignorés, ${stats.errors} erreurs. Durée: ${stats.duration}`,
                    });
                    fetchVisitors();
                  }
                } catch (error: any) {
                  console.error('Erreur lors de l\'importation:', error);
                  toast({
                    title: "Erreur",
                    description: error.response?.data?.error || "Erreur lors de l'importation des visiteurs",
                    variant: "destructive",
                  });
                } finally {
                  setLoading(false);
                }
              }}
              variant="outline"
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Importer depuis les logs
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            {/* Search and filter bar */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom ou badge..."
                  className="pl-8"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </div>

              <Select
                value={filters.status || 'all'}
                onValueChange={(value) => handleFilterChange('status', value === 'all' ? '' : value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="inactive">Inactif</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Loading state */}
            {loading && (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            )}

            {/* No results message */}
            {!loading && visitors.length === 0 && (
              <div className="py-8 text-center">
                <p className="text-muted-foreground">Aucun visiteur trouvé pour les critères sélectionnés.</p>
              </div>
            )}

            {/* Data table */}
            {!loading && visitors.length > 0 && (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Badge</TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead>Accès</TableHead>
                      <TableHead>Dernier vu</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visitors.map((visitor) => (
                      <TableRow key={visitor.id} className="cursor-pointer hover:bg-muted/50" onClick={() => viewVisitorDetail(visitor)}>
                        <TableCell>
                          <div className="font-medium">{visitor.badge_number}</div>
                          {visitor.isSharedBadge && (
                            <div className="text-xs text-amber-600 font-medium">
                              {visitor.badgeHistory?.length} utilisateurs
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {visitor.first_name} {visitor.last_name}
                          </div>
                        </TableCell>
                        <TableCell>{visitor.access_count || 0}</TableCell>
                        <TableCell>
                          {visitor.last_seen ? new Date(visitor.last_seen).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell>{renderStatusBadge(visitor.status, visitor.isSharedBadge)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                viewVisitorDetail(visitor);
                              }}>
                                <Eye className="mr-2 h-4 w-4" />
                                <span>Voir détails</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                viewVisitorPresence(visitor);
                              }}>
                                <ClipboardList className="mr-2 h-4 w-4" />
                                <span>Présences</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-muted-foreground">
            {pagination.total} visiteurs trouvés
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
            >
              Suivant
            </Button>
          </div>
        </CardFooter>
      </Card>
      <Toaster />
    </div>
  );
} 