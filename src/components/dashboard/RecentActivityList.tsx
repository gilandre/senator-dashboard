'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ActivityIcon, Users, AlertTriangle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ActivityItem {
  id: string;
  type: 'access' | 'anomaly';
  personName: string;
  personType: 'employee' | 'visitor';
  location: string;
  timestamp: string;
  status: string;
}

export function RecentActivityList() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecentActivities = async () => {
      // Cette fonction récupérerait normalement les données depuis une API
      // Pour l'instant, nous utilisons des données factices
      try {
        setLoading(true);
        
        // Dans une implémentation réelle, vous remplaceriez ceci par un appel API
        // const response = await axios.get<ActivityItem[]>('/api/activities/recent');
        // setActivities(response.data);
        
        // Données simulées pour le prototype
        setTimeout(() => {
          const mockData: ActivityItem[] = [
            {
              id: '1',
              type: 'access',
              personName: 'Jean Dupont',
              personType: 'employee',
              location: 'Entrée principale',
              timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
              status: 'success',
            },
            {
              id: '2',
              type: 'access',
              personName: 'Marie Martin',
              personType: 'employee',
              location: 'Entrée parking',
              timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
              status: 'success',
            },
            {
              id: '3',
              type: 'anomaly',
              personName: 'Pierre Dubois',
              personType: 'visitor',
              location: 'Entrée bâtiment B',
              timestamp: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
              status: 'refused',
            },
          ];
          
          setActivities(mockData);
          setLoading(false);
        }, 1000);
        
      } catch (err) {
        console.error('Erreur lors de la récupération des activités récentes:', err);
        setError('Impossible de charger les activités récentes');
        setLoading(false);
      }
    };

    fetchRecentActivities();
  }, []);

  const formatTimeAgo = (timestamp: string) => {
    return formatDistanceToNow(new Date(timestamp), {
      addSuffix: true,
      locale: fr,
    });
  };

  const getActivityIcon = (activity: ActivityItem) => {
    if (activity.type === 'anomaly') {
      return <AlertTriangle className="h-5 w-5 text-red-500" />;
    }
    
    if (activity.personType === 'visitor') {
      return <Users className="h-5 w-5 text-blue-500" />;
    }
    
    return <ActivityIcon className="h-5 w-5 text-green-500" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium flex items-center">
          <Clock className="h-5 w-5 mr-2" />
          Activités récentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          // Squelette de chargement
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-start gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-red-500 text-sm">{error}</div>
        ) : activities.length === 0 ? (
          <div className="text-muted-foreground text-sm">Aucune activité récente</div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-4">
                <div className="rounded-full p-2 bg-gray-100 dark:bg-gray-800">
                  {getActivityIcon(activity)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {activity.personName}{' '}
                    <span className="font-normal text-muted-foreground">
                      {activity.type === 'access' ? 'a accédé à' : 'a généré une alerte à'}{' '}
                      {activity.location}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatTimeAgo(activity.timestamp)} • {activity.status === 'success' ? 'Succès' : 'Refusé'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 