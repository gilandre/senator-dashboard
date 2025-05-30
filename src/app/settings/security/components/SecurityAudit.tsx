'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Loader2,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Shield,
  UserCheck,
  Activity,
  ClipboardCheck
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import AuditDetails from './AuditDetails';

interface Audit {
  id: string;
  type: string;
  severity: string;
  description: string;
  details: {
    auditType: string;
    scope: string;
    startDate: string | null;
    endDate: string | null;
    targetUsers?: string[];
    targetResources?: string[];
    includeDetails: boolean;
    requestedBy: string;
    status: string;
    results?: any;
    completedAt?: string;
    error?: string;
  };
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  assignedTo?: string;
  assignedToUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface AuditsResponse {
  audits: Audit[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export default function SecurityAudit() {
  const { toast } = useToast();
  const [audits, setAudits] = useState<Audit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAudit, setSelectedAudit] = useState<Audit | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    status: 'all',
    type: 'all',
    startDate: '',
    endDate: '',
    search: ''
  });
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    pages: 0
  });
  const [newAudit, setNewAudit] = useState({
    type: '',
    scope: 'full',
    startDate: null as Date | null,
    endDate: null as Date | null,
    targetUsers: [] as string[],
    targetResources: [] as string[],
    includeDetails: true
  });
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    fetchAudits();
  }, [filters]);

  const fetchAudits = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.append(key, value.toString());
        }
      });

      const response = await fetch(`/api/security/audit?${params}`);
      if (!response.ok) throw new Error('Erreur lors de la récupération des audits');
      
      const data: AuditsResponse = await response.json();
      setAudits(data.audits);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les audits"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAudit = async () => {
    try {
      const response = await fetch('/api/security/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newAudit,
          startDate: newAudit.startDate?.toISOString(),
          endDate: newAudit.endDate?.toISOString()
        })
      });

      if (!response.ok) throw new Error('Erreur lors de la création de l\'audit');
      
      await fetchAudits();
      setIsDialogOpen(false);
      setNewAudit({
        type: '',
        scope: 'full',
        startDate: null,
        endDate: null,
        targetUsers: [],
        targetResources: [],
        includeDetails: true
      });
      toast({
        title: "Succès",
        description: "L'audit a été initié avec succès"
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de créer l'audit"
      });
    }
  };

  const getAuditTypeIcon = (type: string) => {
    switch (type) {
      case 'security_settings':
        return <Shield className="h-4 w-4" />;
      case 'user_access':
        return <UserCheck className="h-4 w-4" />;
      case 'authentication':
        return <Activity className="h-4 w-4" />;
      case 'incidents':
        return <AlertTriangle className="h-4 w-4" />;
      case 'system_health':
        return <Activity className="h-4 w-4" />;
      case 'compliance':
        return <ClipboardCheck className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'resolved':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'closed':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher un audit..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-8 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>

        <div className="w-[180px]">
          <Select
            value={filters.status}
            onValueChange={(value) => setFilters({ ...filters, status: value, page: 1 })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="open">Ouvert</SelectItem>
              <SelectItem value="in_progress">En cours</SelectItem>
              <SelectItem value="resolved">Résolu</SelectItem>
              <SelectItem value="closed">Fermé</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-[180px]">
          <Select
            value={filters.type}
            onValueChange={(value) => setFilters({ ...filters, type: value, page: 1 })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="security_settings">Paramètres</SelectItem>
              <SelectItem value="user_access">Accès utilisateurs</SelectItem>
              <SelectItem value="authentication">Authentification</SelectItem>
              <SelectItem value="incidents">Incidents</SelectItem>
              <SelectItem value="system_health">Santé système</SelectItem>
              <SelectItem value="compliance">Conformité</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-[300px]">
          <DatePickerWithRange
            date={{
              from: filters.startDate ? new Date(filters.startDate) : undefined,
              to: filters.endDate ? new Date(filters.endDate) : undefined
            }}
            onDateChange={(range) => setFilters({
              ...filters,
              startDate: range.from?.toISOString() || '',
              endDate: range.to?.toISOString() || '',
              page: 1
            })}
          />
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouvel audit
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Nouvel audit de sécurité</DialogTitle>
              <DialogDescription>
                Créez un nouvel audit de sécurité pour analyser différents aspects du système.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="type">Type d'audit</label>
                  <Select
                    value={newAudit.type}
                    onValueChange={(value) => setNewAudit({ ...newAudit, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Type d'audit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="security_settings">Paramètres de sécurité</SelectItem>
                      <SelectItem value="user_access">Accès utilisateurs</SelectItem>
                      <SelectItem value="authentication">Authentification</SelectItem>
                      <SelectItem value="incidents">Incidents</SelectItem>
                      <SelectItem value="system_health">Santé système</SelectItem>
                      <SelectItem value="compliance">Conformité</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="scope">Portée</label>
                  <Select
                    value={newAudit.scope}
                    onValueChange={(value) => setNewAudit({ ...newAudit, scope: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Portée" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Complète</SelectItem>
                      <SelectItem value="partial">Partielle</SelectItem>
                      <SelectItem value="targeted">Ciblée</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label>Période</label>
                <DatePickerWithRange
                  date={{
                    from: newAudit.startDate || undefined,
                    to: newAudit.endDate || undefined
                  }}
                  onDateChange={(range) => setNewAudit({
                    ...newAudit,
                    startDate: range.from || null,
                    endDate: range.to || null
                  })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setNewAudit({
                    type: '',
                    scope: 'full',
                    startDate: null,
                    endDate: null,
                    targetUsers: [],
                    targetResources: [],
                    includeDetails: true
                  });
                  setIsDialogOpen(false);
                }}
              >
                Annuler
              </Button>
              <Button
                onClick={handleCreateAudit}
                disabled={!newAudit.type}
              >
                Créer l'audit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Liste des audits */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Assigné à</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {audits.map((audit) => (
              <TableRow key={audit.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getAuditTypeIcon(audit.details.auditType)}
                    <span className="capitalize">{audit.details.auditType.replace('_', ' ')}</span>
                  </div>
                </TableCell>
                <TableCell className="max-w-[300px] truncate">
                  {audit.description}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(audit.status)}
                    <span className="capitalize">{audit.status.replace('_', ' ')}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {audit.assignedToUser
                    ? `${audit.assignedToUser.firstName} ${audit.assignedToUser.lastName}`
                    : '-'}
                </TableCell>
                <TableCell>
                  {format(new Date(audit.createdAt), 'dd/MM/yyyy HH:mm', { locale: fr })}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedAudit(audit);
                          setIsDetailsOpen(true);
                        }}
                      >
                        Voir les détails
                      </DropdownMenuItem>
                      {audit.status === 'resolved' && (
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedAudit(audit);
                            setIsDetailsOpen(true);
                          }}
                        >
                          Exporter les résultats
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Affichage de {audits.length} sur {pagination.total} audits
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
              disabled={filters.page === 1}
            >
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
              disabled={filters.page === pagination.pages}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}

      {/* Dialog de détails */}
      {selectedAudit && (
        <AuditDetails
          audit={selectedAudit}
          isOpen={isDetailsOpen}
          onClose={() => {
            setIsDetailsOpen(false);
            setSelectedAudit(null);
          }}
        />
      )}
    </div>
  );
} 