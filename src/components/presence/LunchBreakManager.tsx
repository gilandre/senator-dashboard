import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Clock, Plus, Trash } from 'lucide-react';

interface LunchBreak {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  duration: number;
}

interface LunchBreakManagerProps {
  employeeId: string;
  date: string;
  onUpdate: () => void;
}

export function LunchBreakManager({ employeeId, date, onUpdate }: LunchBreakManagerProps) {
  const [startTime, setStartTime] = useState('12:00');
  const [endTime, setEndTime] = useState('13:00');
  const [isLoading, setIsLoading] = useState(false);
  const [lunchBreak, setLunchBreak] = useState<LunchBreak | null>(null);

  const fetchLunchBreak = async () => {
    try {
      const response = await fetch(`/api/employees/${employeeId}/lunch-breaks?startDate=${date}&endDate=${date}`);
      if (response.ok) {
        const breaks = await response.json();
        if (breaks.length > 0) {
          setLunchBreak(breaks[0]);
          setStartTime(breaks[0].start_time.substring(0, 5));
          setEndTime(breaks[0].end_time.substring(0, 5));
        } else {
          setLunchBreak(null);
        }
      }
    } catch (error) {
      console.error('Error fetching lunch break:', error);
    }
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/employees/${employeeId}/lunch-breaks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date,
          start_time: startTime,
          end_time: endTime,
        }),
      });

      if (response.ok) {
        await fetchLunchBreak();
        onUpdate();
      }
    } catch (error) {
      console.error('Error saving lunch break:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/employees/${employeeId}/lunch-breaks?date=${date}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setLunchBreak(null);
        setStartTime('12:00');
        setEndTime('13:00');
        onUpdate();
      }
    } catch (error) {
      console.error('Error deleting lunch break:', error);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchLunchBreak();
  }, [employeeId, date]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="h-5 w-5" />
          <span>Pause déjeuner</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Début</label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Fin</label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            {lunchBreak ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isLoading}
              >
                <Trash className="h-4 w-4 mr-2" />
                Supprimer
              </Button>
            ) : null}
            <Button
              onClick={handleSave}
              disabled={isLoading}
            >
              <Plus className="h-4 w-4 mr-2" />
              {lunchBreak ? 'Mettre à jour' : 'Ajouter'}
            </Button>
          </div>

          {lunchBreak && (
            <div className="mt-4 text-sm text-gray-500">
              Durée : {lunchBreak.duration} minutes
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 