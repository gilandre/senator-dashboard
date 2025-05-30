import { access_logs_event_type, access_logs_person_type } from '@prisma/client';

// Types pour les données normalisées
export interface NormalizedRecord {
  badgeNumber: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  eventDate: string;
  eventTime: string;
  controller?: string;
  reader?: string;
  eventType: string;
  department?: string;
  group?: string;
  isVisitor: boolean;
  direction?: string;
  status?: string;
  rawData: Record<string, any>;
}

// Type pour les données d'accès
export interface AccessLogData {
  badge_number: string;
  person_type: access_logs_person_type;
  event_date: Date;
  event_time: Date;
  reader?: string;
  terminal?: string;
  event_type: access_logs_event_type;
  raw_event_type: string;
  direction?: string;
  full_name?: string;
  group_name?: string;
  processed: boolean;
  created_at: Date;
}

// Type pour les statistiques de traitement
export interface ProcessingStats {
  successfullyProcessed: number;
  errorRecords: number;
  skippedRecords: number;
  duplicates: number;
  employees: number;
  visitors: number;
  entriesCount: number;
  exitsCount: number;
  totalRecords: number;
  warnings: string[];
}

// Type pour les erreurs de traitement
export interface ProcessingError {
  record: NormalizedRecord;
  error: Error;
  timestamp: Date;
}

// Type pour les options de traitement
export interface ProcessingOptions {
  batchSize?: number;
  validateData?: boolean;
  skipDuplicates?: boolean;
  maxErrors?: number;
} 