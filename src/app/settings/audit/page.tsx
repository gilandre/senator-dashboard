'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, Search, Download, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DatePicker } from '@/components/date-picker';

export default function AuditPage() {
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [activities, setActivities] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('activities');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 jours passés
    end: new Date()
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [actionType, setActionType] = useState('all');

  useEffect(() => {
    // Simulation de chargement des données
    setTimeout(() => {
      setActivities([
        {
          id: 1,
          user: 'Administrateur',
          action: 'login',
          details: 'Connexion au système',
          ip_address: '192.168.1.1',
          timestamp: new Date(2025, 4, 25, 10, 30, 0)
        },
        {
          id: 2,
          user: 'Administrateur',
          action: 'view_users',
          details: 'Consultation de la liste des utilisateurs',
          ip_address: '192.168.1.1',
          timestamp: new Date(2025, 4, 25, 10, 35, 0)
        },
        {
          id: 3,
          user: 'Administrateur',
          action: 'modify_user',
          details: 'Modification des permissions de l\'utilisateur John Doe',
          ip_address: '192.168.1.1',
          timestamp: new Date(2025, 4, 25, 10, 40, 0)
        },
        {
          id: 4,
          user: 'Administrateur',
          action: 'update_settings',
          details: 'Mise à jour des paramètres de sécurité',
          ip_address: '192.168.1.1',
          timestamp: new Date(2025, 4, 25, 11, 15, 0)
        },
        {
          id: 5,
          user: 'Administrateur',
          action: 'logout',
          details: 'Déconnexion du système',
          ip_address: '192.168.1.1',
          timestamp: new Date(2025, 4, 25, 12, 0, 0)
        }
      ]);
      setIsLoading(false);
    }, 1000);
  }, []);

  // Filtrer les activités
  const filteredActivities = activities
    .filter(activity => 
      (searchQuery === '' || 
        activity.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.ip_address.toLowerCase().includes(searchQuery.toLowerCase())
      ) &&
      (actionType === 'all' || activity.action === actionType)
    )
    .filter(activity => {
      const activityDate = new Date(activity.timestamp);
      return activityDate >= dateRange.start && activityDate <= dateRange.end;
    });

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (status === 'unauthenticated' || !session?.user?.role || session.user.role !== 'admin') {
    return (
      <Card className="p-4">
        <div className="text-center text-red-500">
          Vous n'avez pas les droits nécessaires pour accéder à cette page.
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Audit des activités</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="activities">Activités des utilisateurs</TabsTrigger>
          <TabsTrigger value="logins">Connexions</TabsTrigger>
          <TabsTrigger value="changes">Modifications</TabsTrigger>
        </TabsList>

        <Card>
          <CardHeader>
            <CardTitle>Filtres</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <DatePicker
                  selected={dateRange.start}
                  onSelect={(date) => date && setDateRange({...dateRange, start: date})}
                  label="Date de début"
                />
              </div>
              <div>
                <DatePicker
                  selected={dateRange.end}
                  onSelect={(date) => date && setDateRange({...dateRange, end: date})}
                  label="Date de fin"
                />
              </div>
              <div>
                <Select value={actionType} onValueChange={setActionType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Type d'action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les actions</SelectItem>
                    <SelectItem value="login">Connexion</SelectItem>
                    <SelectItem value="logout">Déconnexion</SelectItem>
                    <SelectItem value="view_users">Consultation utilisateurs</SelectItem>
                    <SelectItem value="modify_user">Modification utilisateur</SelectItem>
                    <SelectItem value="update_settings">Mise à jour paramètres</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Button variant="outline" size="icon" onClick={() => setIsLoading(true)}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <TabsContent value="activities" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Détails</TableHead>
                      <TableHead>Adresse IP</TableHead>
                      <TableHead>Date/Heure</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredActivities.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4">
                          Aucune activité trouvée pour les critères de recherche sélectionnés.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredActivities.map((activity) => (
                        <TableRow key={activity.id}>
                          <TableCell>{activity.user}</TableCell>
                          <TableCell>
                            <span className="capitalize">{activity.action.replace('_', ' ')}</span>
                          </TableCell>
                          <TableCell>{activity.details}</TableCell>
                          <TableCell>{activity.ip_address}</TableCell>
                          <TableCell>
                            {format(activity.timestamp, 'dd MMM yyyy HH:mm:ss', { locale: fr })}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logins" className="space-y-4">
          <Card>
            <CardContent className="p-4 text-center py-10">
              <p>Fonctionnalité en cours de développement</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="changes" className="space-y-4">
          <Card>
            <CardContent className="p-4 text-center py-10">
              <p>Fonctionnalité en cours de développement</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 