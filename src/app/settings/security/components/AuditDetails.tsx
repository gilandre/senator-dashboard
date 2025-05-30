'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Loader2,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Shield,
  UserCheck,
  Activity,
  ClipboardCheck,
  AlertCircle
} from 'lucide-react';

interface AuditDetailsProps {
  audit: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function AuditDetails({ audit, isOpen, onClose }: AuditDetailsProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');

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

  const handleExport = async (format: 'pdf' | 'json') => {
    setIsExporting(true);
    try {
      const response = await fetch(`/api/export/${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'audit',
          auditId: audit.id,
          includeDetails: true
        })
      });

      if (!response.ok) throw new Error('Erreur lors de l\'export');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-${audit.id}-${format === 'pdf' ? 'rapport.pdf' : 'donnees.json'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Succès",
        description: `L'export a été généré avec succès`
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'exporter les résultats"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const renderAuditResults = () => {
    if (!audit.details.results) {
      return (
        <div className="text-center text-muted-foreground py-4">
          {audit.details.error ? (
            <div className="flex items-center justify-center gap-2 text-red-500">
              <AlertCircle className="h-5 w-5" />
              <span>Erreur lors de l'audit: {audit.details.error}</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <Clock className="h-5 w-5 animate-spin" />
              <span>L'audit est en cours d'exécution...</span>
            </div>
          )}
        </div>
      );
    }

    switch (audit.details.auditType) {
      case 'security_settings':
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Résumé des paramètres</CardTitle>
                <CardDescription>
                  Dernière mise à jour: {format(new Date(audit.details.results.lastUpdate), 'dd/MM/yyyy HH:mm', { locale: fr })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div className="flex justify-between items-center">
                    <span>Nombre de modifications</span>
                    <Badge variant="outline">{audit.details.results.changes}</Badge>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Dernières modifications</h4>
                    <div className="space-y-2">
                      {audit.details.results.settings.slice(0, 5).map((setting: any, index: number) => (
                        <div key={index} className="flex justify-between items-center text-sm">
                          <span>{setting.key}</span>
                          <span className="text-muted-foreground">
                            par {setting.updatedByUser.firstName} {setting.updatedByUser.lastName}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'user_access':
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Résumé des accès</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <span className="text-sm text-muted-foreground">Total des accès</span>
                      <div className="text-2xl font-bold">{audit.details.results.totalAccess}</div>
                    </div>
                    <div className="space-y-2">
                      <span className="text-sm text-muted-foreground">Utilisateurs uniques</span>
                      <div className="text-2xl font-bold">{audit.details.results.uniqueUsers}</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Répartition par statut</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(audit.details.results.byStatus).map(([status, count]: [string, any]) => (
                        <div key={status} className="flex justify-between items-center text-sm">
                          <span className="capitalize">{status}</span>
                          <Badge variant="outline">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'authentication':
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Résumé de l'authentification</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <span className="text-sm text-muted-foreground">Total des authentifications</span>
                      <div className="text-2xl font-bold">{audit.details.results.totalAuth}</div>
                    </div>
                    <div className="space-y-2">
                      <span className="text-sm text-muted-foreground">Tentatives échouées</span>
                      <div className="text-2xl font-bold text-red-500">{audit.details.results.failedAttempts}</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Répartition par action</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(audit.details.results.byAction).map(([action, count]: [string, any]) => (
                        <div key={action} className="flex justify-between items-center text-sm">
                          <span className="capitalize">{action.replace('_', ' ')}</span>
                          <Badge variant="outline">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'incidents':
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Résumé des incidents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <span className="text-sm text-muted-foreground">Total des incidents</span>
                      <div className="text-2xl font-bold">{audit.details.results.totalIncidents}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium">Par sévérité</h4>
                      <div className="space-y-2">
                        {Object.entries(audit.details.results.bySeverity).map(([severity, count]: [string, any]) => (
                          <div key={severity} className="flex justify-between items-center text-sm">
                            <span className="capitalize">{severity}</span>
                            <Badge variant="outline">{count}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium">Par statut</h4>
                      <div className="space-y-2">
                        {Object.entries(audit.details.results.byStatus).map(([status, count]: [string, any]) => (
                          <div key={status} className="flex justify-between items-center text-sm">
                            <span className="capitalize">{status.replace('_', ' ')}</span>
                            <Badge variant="outline">{count}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'system_health':
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>État du système</CardTitle>
                <CardDescription>
                  Dernière vérification: {format(new Date(audit.details.results.health.lastCheck), 'dd/MM/yyyy HH:mm', { locale: fr })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <span className="text-sm text-muted-foreground">Sessions actives</span>
                      <div className="text-2xl font-bold">{audit.details.results.activeSessions}</div>
                    </div>
                    <div className="space-y-2">
                      <span className="text-sm text-muted-foreground">Erreurs récentes</span>
                      <div className="text-2xl font-bold text-red-500">{audit.details.results.recentErrors.length}</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">État de santé</h4>
                    <Badge variant={audit.details.results.health.status === 'healthy' ? 'default' : 'destructive'}>
                      {audit.details.results.health.status === 'healthy' ? 'Sain' : 'Attention'}
                    </Badge>
                  </div>
                  {audit.details.results.health.metrics && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Métriques système</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(audit.details.results.health.metrics).map(([key, value]: [string, any]) => (
                          <div key={key} className="flex justify-between items-center text-sm">
                            <span className="capitalize">{key.replace('_', ' ')}</span>
                            <span>{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'compliance':
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Conformité</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <span className="text-sm text-muted-foreground">Changements de mot de passe</span>
                      <div className="text-2xl font-bold">{audit.details.results.passwordChanges}</div>
                    </div>
                    <div className="space-y-2">
                      <span className="text-sm text-muted-foreground">Modifications de rôles</span>
                      <div className="text-2xl font-bold">{audit.details.results.roleChanges}</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">État de conformité</h4>
                    <div className="space-y-2">
                      {Object.entries(audit.details.results.compliance).map(([key, value]: [string, any]) => (
                        <div key={key} className="flex justify-between items-center text-sm">
                          <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <Badge variant={value ? 'default' : 'destructive'}>
                            {value ? 'Conforme' : 'Non conforme'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return (
          <div className="text-center text-muted-foreground py-4">
            Type d'audit non reconnu
          </div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getAuditTypeIcon(audit.details.auditType)}
            <span>Détails de l'audit</span>
          </DialogTitle>
          <DialogDescription>
            Audit de type {audit.details.auditType.replace('_', ' ')} - {audit.details.scope}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(audit.status)}
              <span className="capitalize">{audit.status.replace('_', ' ')}</span>
            </div>
            {audit.status === 'resolved' && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('json')}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Export JSON
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('pdf')}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Export PDF
                </Button>
              </div>
            )}
          </div>

          <div className="grid gap-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-muted-foreground">Créé le</span>
                <div>{format(new Date(audit.createdAt), 'dd/MM/yyyy HH:mm', { locale: fr })}</div>
              </div>
              {audit.details.completedAt && (
                <div>
                  <span className="text-muted-foreground">Terminé le</span>
                  <div>{format(new Date(audit.details.completedAt), 'dd/MM/yyyy HH:mm', { locale: fr })}</div>
                </div>
              )}
            </div>
            <div>
              <span className="text-muted-foreground">Demandé par</span>
              <div>{audit.assignedToUser ? `${audit.assignedToUser.firstName} ${audit.assignedToUser.lastName}` : '-'}</div>
            </div>
            {audit.details.targetUsers?.length > 0 && (
              <div>
                <span className="text-muted-foreground">Utilisateurs ciblés</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {audit.details.targetUsers.map((userId: string) => (
                    <Badge key={userId} variant="secondary">{userId}</Badge>
                  ))}
                </div>
              </div>
            )}
            {audit.details.targetResources?.length > 0 && (
              <div>
                <span className="text-muted-foreground">Ressources ciblées</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {audit.details.targetResources.map((resource: string) => (
                    <Badge key={resource} variant="secondary">{resource}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="summary">Résumé</TabsTrigger>
              <TabsTrigger value="details">Détails</TabsTrigger>
            </TabsList>
            <TabsContent value="summary">
              {renderAuditResults()}
            </TabsContent>
            <TabsContent value="details">
              <Card>
                <CardContent className="pt-6">
                  <pre className="text-sm overflow-auto p-4 bg-muted rounded-lg">
                    {JSON.stringify(audit.details.results, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 