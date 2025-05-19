// Types d'événements d'accès
export type AccessEventType = 'entry' | 'exit' | 'unknown';

// Types de personnes
export type PersonType = 'employee' | 'visitor';

// Statuts de présence
export type PresenceStatus = 'PRESENT' | 'ABSENT' | 'EN_RETARD' | 'PARTI_TOT' | 'JOUR_FERIE' | 'JOURNEE_CONTINUE';

// Interface pour un badge d'accès
export interface AccessBadge {
  time: string;
  reader: string;
  type: 'ENTREE' | 'SORTIE';
}

// Interface pour un enregistrement de présence
export interface PresenceRecord {
  date: string;
  firstBadge: AccessBadge;
  lastBadge: AccessBadge;
  totalHours: number;
  status: PresenceStatus;
}

// Interface pour les statistiques de présence
export interface PresenceStats {
  daily: PresenceRecord[];
  weekly: {
    day: string;
    avgDuration: number;
    count: number;
  }[];
  monthly: {
    week: string;
    avgDuration: number;
    count: number;
  }[];
  yearly: {
    month: string;
    avgDuration: number;
    count: number;
  }[];
} 