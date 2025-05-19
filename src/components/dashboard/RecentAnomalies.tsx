'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface RecentAnomaliesProps {
  startDate?: string;
  endDate?: string;
}

interface Anomaly {
  id: number;
  badgeNumber: string;
  eventDate: string;
  eventTime: string;
  eventType: string;
  rawEventType: string | null;
  reader: string;
  groupName: string | null;
  userName: string | null;
}

const RecentAnomalies: React.FC<RecentAnomaliesProps> = ({ startDate, endDate }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);

  // Format date and time for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Get badge color based on event type
  const getBadgeColor = (eventType: string) => {
    switch (eventType.toLowerCase()) {
      case 'denied':
      case 'refused':
      case 'rejected':
        return 'destructive';
      case 'invalid_badge':
      case 'expired':
        return 'secondary';
      case 'badge_unknown':
        return 'outline';
      default:
        return 'default';
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        let url = '/api/anomalies';
        const params = new URLSearchParams();
        
        if (startDate) {
          params.append('startDate', startDate);
        }
        
        if (endDate) {
          params.append('endDate', endDate);
        }
        
        url += `?${params.toString()}`;
        
        const response = await fetch(url, {
          headers: {
            'x-test-bypass-auth': 'admin'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Erreur API: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (Array.isArray(data.recentAnomalies)) {
          const formattedAnomalies = data.recentAnomalies.map((item: any) => ({
            id: Number(item.id),
            badgeNumber: item.badgeNumber,
            eventDate: item.eventDate,
            eventTime: item.eventTime,
            eventType: item.eventType,
            rawEventType: item.rawEventType,
            reader: item.reader,
            groupName: item.groupName,
            userName: item.userName
          }));
          
          setAnomalies(formattedAnomalies);
        } else {
          console.error('Format de données d\'anomalies invalide:', data.recentAnomalies);
          setAnomalies([]);
        }
        
      } catch (err) {
        console.error('Erreur lors de la récupération des données:', err);
        setError('Impossible de charger les données. Veuillez réessayer plus tard.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [startDate, endDate]);

  // Render content based on loading state
  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-2">
          <Skeleton className="h-[400px] w-full" />
        </div>
      );
    }

    if (error) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }

    if (anomalies.length === 0) {
      return (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Aucune anomalie récente disponible.</AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="overflow-auto max-h-[400px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Heure</TableHead>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Badge</TableHead>
              <TableHead>Lecteur</TableHead>
              <TableHead>Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {anomalies.map((anomaly) => (
              <TableRow key={anomaly.id}>
                <TableCell>{formatDate(anomaly.eventDate)}</TableCell>
                <TableCell>{anomaly.eventTime}</TableCell>
                <TableCell>{anomaly.userName || 'Inconnu'}</TableCell>
                <TableCell>{anomaly.badgeNumber}</TableCell>
                <TableCell>{anomaly.reader}</TableCell>
                <TableCell>
                  <Badge variant={getBadgeColor(anomaly.eventType)}>
                    {anomaly.eventType}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Anomalies récentes</CardTitle>
        <CardDescription>Liste des dernières anomalies d'accès enregistrées</CardDescription>
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  );
};

export default RecentAnomalies; 