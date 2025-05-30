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
  BadgeCheck
} from 'lucide-react';

interface Employee {
  id: number;
  badge_number: string;
  employee_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  department: string | null;
  position: string | null;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
  department_id?: number;
  dept: {
    name: string;
    description: string | null;
  } | null;
  isSharedBadge?: boolean;
  badgeHistory?: Employee[];
}

interface Department {
  id: number;
  name: string;
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function EmployeeList() {
  const router = useRouter();
  
  // State
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0
  });
  const [filters, setFilters] = useState({
    search: '',
    department: '',
    status: ''
  });
  
  const [kpiStats, setKpiStats] = useState({
    totalActive: 0,
    byDepartment: {}
  });
  
  // Fetch data
  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/employees', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          ...filters
        }
      });

      setEmployees(response.data.employees);
      setDepartments(response.data.departments);
      setPagination(response.data.pagination);
      
      // Calculate KPIs
      const activeEmployees = response.data.employees.filter(
        (emp: Employee) => emp.status === 'active'
      ).length;
      
      const deptCounts: {[key: string]: number} = {};
      response.data.employees.forEach((emp: Employee) => {
        const dept = emp.dept?.name || emp.department || 'Non assigné';
        deptCounts[dept] = (deptCounts[dept] || 0) + 1;
      });
      
      setKpiStats({
        totalActive: activeEmployees,
        byDepartment: deptCounts
      });
      
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast({
        title: "Erreur",
        description: "Impossible de récupérer la liste des employés",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Effect to fetch data on mount and when filters/pagination change
  useEffect(() => {
    fetchEmployees();
  }, [pagination.page, pagination.limit, filters]);

  // Handle refresh
  const handleRefresh = () => {
    fetchEmployees();
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

  // Navigate to employee detail
  const viewEmployeeDetail = (employee: Employee) => {
    router.push(`/employees/${employee.id}`);
  };

  // Navigate to employee presence
  const viewEmployeePresence = (employee: Employee) => {
    router.push(`/attendance?badge=${employee.badge_number}`);
  };

  // Render status badge
  const renderStatusBadge = (status: string, isSharedBadge: boolean = false) => {
    const variants: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
      active: "default",
      inactive: "secondary",
      suspended: "destructive"
    };

    const labels: { [key: string]: string } = {
      active: "Actif",
      inactive: "Inactif",
      suspended: "Suspendu"
    };

    // Pour les badges partagés, modifier l'affichage
    if (isSharedBadge) {
      return (
        <div className="flex items-center gap-1">
          <Badge variant={variants[status] || "default"}>
            {labels[status] || status}
          </Badge>
          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
            Badge partagé
          </Badge>
        </div>
      );
    }

    return (
      <Badge variant={variants[status] || "default"}>
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Active Employees KPI */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Employés Actifs</CardTitle>
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

        {/* Badge Activity KPI */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Badges Assignés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <BadgeCheck className="h-5 w-5 text-muted-foreground mr-2" />
              <div className="text-2xl font-bold">
                {loading ? <Skeleton className="h-8 w-16" /> : pagination.total}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Liste des employés</CardTitle>
            <CardDescription>
              Consultez les informations des employés et leurs badges
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button 
              onClick={async () => {
                try {
                  setLoading(true);
                  const response = await axios.post('/api/batch/import-employees');
                  if (response.status === 200) {
                    // Utiliser les propriétés réellement disponibles dans la réponse
                    const employeesAdded = response.data.employeesAdded || 0;
                    const visitorsPurged = response.data.visitorsPurged || 0;
                    
                    toast({
                      title: "Importation réussie",
                      description: `${employeesAdded} nouveaux employés importés. ${visitorsPurged > 0 ? `${visitorsPurged} visiteurs purgés de la table employés.` : ''}`,
                    });
                    fetchEmployees();
                  }
                } catch (error: any) {
                  console.error('Erreur lors de l\'importation:', error);
                  toast({
                    title: "Erreur",
                    description: error.response?.data?.error || "Erreur lors de l'importation des employés",
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
                value={filters.department || 'all'}
                onValueChange={(value) => handleFilterChange('department', value === 'all' ? '' : value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Groupe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les groupes</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.name}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

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
                  <SelectItem value="suspended">Suspendu</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
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
            {!loading && employees.length === 0 && (
              <div className="py-8 text-center">
                <p className="text-muted-foreground">Aucun employé trouvé pour les critères sélectionnés.</p>
              </div>
            )}

            {/* Data table */}
            {!loading && employees.length > 0 && (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Badge</TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead>Groupe</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((employee) => (
                      <TableRow key={employee.id} className="cursor-pointer hover:bg-muted/50" onClick={() => viewEmployeeDetail(employee)}>
                        <TableCell>
                          <div className="font-medium">{employee.badge_number}</div>
                          {employee.isSharedBadge && (
                            <div className="text-xs text-amber-600 font-medium">
                              {employee.badgeHistory?.length} utilisateurs
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            {employee.employee_id || '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {employee.first_name} {employee.last_name}
                          </div>
                        </TableCell>
                        <TableCell>{employee.dept?.name || employee.department || '-'}</TableCell>
                        <TableCell>{renderStatusBadge(employee.status, employee.isSharedBadge)}</TableCell>
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
                                viewEmployeeDetail(employee);
                              }}>
                                <Eye className="mr-2 h-4 w-4" />
                                <span>Voir détails</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                viewEmployeePresence(employee);
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
            {pagination.total} employés trouvés
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