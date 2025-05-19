import React from 'react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { User } from 'lucide-react';

interface UserActivity {
  id?: string;
  userId: string;
  userName: string;
  action: string;
  timestamp: string;
}

interface UserActivitiesProps {
  activities: UserActivity[];
}

export default function UserActivities({ activities }: UserActivitiesProps) {
  const formatDateTime = (isoString: string) => {
    try {
      const date = parseISO(isoString);
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (date.toDateString() === now.toDateString()) {
        return `Aujourd'hui ${format(date, 'HH:mm')}`;
      } else if (date.toDateString() === yesterday.toDateString()) {
        return `Hier ${format(date, 'HH:mm')}`;
      } else {
        return format(date, 'dd/MM/yyyy HH:mm', { locale: fr });
      }
    } catch (e) {
      return isoString;
    }
  };
  
  return (
    <div className="space-y-4 py-2">
      {activities.length > 0 ? (
        activities.map((activity, index) => (
          <div 
            key={activity.id || index} 
            className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
          >
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mr-3">
                <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </div>
              <div>
                <p className="font-medium">{activity.userName}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{activity.action}</p>
              </div>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {formatDateTime(activity.timestamp)}
            </span>
          </div>
        ))
      ) : (
        <div className="text-center py-6 text-gray-500">
          Aucune activité récente à afficher
        </div>
      )}
    </div>
  );
}