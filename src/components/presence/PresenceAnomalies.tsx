import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Clock, Calendar } from 'lucide-react';
import { PresenceRecord } from '@/types/presence';
import { format, parseISO, differenceInHours } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PresenceAnomaliesProps {
  records: PresenceRecord[];
}

interface Anomaly {
  type: 'retard' | 'depart_precoce' | 'absence' | 'pause_longue';
  date: string;
  description: string;
  severity: 'warning' | 'error';
}

export function PresenceAnomalies({ records }: PresenceAnomaliesProps) {
  const detectAnomalies = (): Anomaly[] => {
    const anomalies: Anomaly[] = [];

    records.forEach((record) => {
      // Vérifier les retards (premier badge après 9h)
      const firstBadgeTime = new Date(`${record.date}T${record.firstBadge.time}`);
      if (firstBadgeTime.getHours() >= 9) {
        anomalies.push({
          type: 'retard',
          date: record.date,
          description: `Arrivée à ${record.firstBadge.time} (après 9h)`,
          severity: 'warning'
        });
      }

      // Vérifier les départs précoces (dernier badge avant 17h)
      const lastBadgeTime = new Date(`${record.date}T${record.lastBadge.time}`);
      if (lastBadgeTime.getHours() < 17) {
        anomalies.push({
          type: 'depart_precoce',
          date: record.date,
          description: `Départ à ${record.lastBadge.time} (avant 17h)`,
          severity: 'warning'
        });
      }

      // Vérifier les absences (pas de badges)
      if (record.status === 'ABSENT') {
        anomalies.push({
          type: 'absence',
          date: record.date,
          description: 'Aucun badge enregistré',
          severity: 'error'
        });
      }

      // Vérifier les pauses trop longues (plus de 2h)
      const firstTime = new Date(`${record.date}T${record.firstBadge.time}`);
      const lastTime = new Date(`${record.date}T${record.lastBadge.time}`);
      const totalHours = differenceInHours(lastTime, firstTime);
      
      if (totalHours > 2 && record.status !== 'JOURNEE_CONTINUE') {
        anomalies.push({
          type: 'pause_longue',
          date: record.date,
          description: `Pause de ${totalHours} heures détectée`,
          severity: 'warning'
        });
      }
    });

    return anomalies;
  };

  const anomalies = detectAnomalies();

  if (anomalies.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Anomalies de présence</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTitle>Aucune anomalie détectée</AlertTitle>
            <AlertDescription>
              Toutes les présences sont conformes aux horaires attendus.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Anomalies de présence</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {anomalies.map((anomaly, index) => (
          <Alert key={index} variant={anomaly.severity === 'error' ? 'destructive' : 'default'}>
            {anomaly.type === 'retard' && <Clock className="h-4 w-4" />}
            {anomaly.type === 'depart_precoce' && <Clock className="h-4 w-4" />}
            {anomaly.type === 'absence' && <AlertTriangle className="h-4 w-4" />}
            {anomaly.type === 'pause_longue' && <Calendar className="h-4 w-4" />}
            <AlertTitle>
              {anomaly.type === 'retard' && 'Retard'}
              {anomaly.type === 'depart_precoce' && 'Départ précoce'}
              {anomaly.type === 'absence' && 'Absence'}
              {anomaly.type === 'pause_longue' && 'Pause longue'}
            </AlertTitle>
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span>{anomaly.description}</span>
                <span className="text-sm text-gray-500">
                  {format(parseISO(anomaly.date), 'dd/MM/yyyy', { locale: fr })}
                </span>
              </div>
            </AlertDescription>
          </Alert>
        ))}
      </CardContent>
    </Card>
  );
} 