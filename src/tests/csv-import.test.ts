import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { normalizeRecord, mapEventType } from '@/app/api/import/csv/process/route';
import { validateCSVRecord } from '@/lib/schemas/csv-schema';
import { access_logs_event_type } from '@prisma/client';

describe('CSV Import Processing', () => {
  describe('normalizeRecord', () => {
    it('should normalize a valid record', () => {
      const record = {
        'Numéro de badge': '12345',
        'Date': '01/01/2024',
        'Heure': '10:00:00',
        'Nature Evenement': 'Entrée',
        'Nom': 'Doe',
        'Prénom': 'John'
      };

      const normalized = normalizeRecord(record);
      expect(normalized.badgeNumber).toBe('12345');
      expect(normalized.eventDate).toBe('2024-01-01');
      expect(normalized.eventTime).toBe('10:00:00');
      expect(normalized.eventType).toBe('Entrée');
    });

    it('should handle missing optional fields', () => {
      const record = {
        'Numéro de badge': '12345',
        'Date': '01/01/2024',
        'Heure': '10:00:00'
      };

      const normalized = normalizeRecord(record);
      expect(normalized.badgeNumber).toBe('12345');
      expect(normalized.eventDate).toBe('2024-01-01');
      expect(normalized.eventTime).toBe('10:00:00');
      expect(normalized.eventType).toBe('unknown');
    });
  });

  describe('mapEventType', () => {
    it('should map French event types correctly', () => {
      expect(mapEventType('Entrée')).toBe(access_logs_event_type.entry);
      expect(mapEventType('Sortie')).toBe(access_logs_event_type.exit);
      expect(mapEventType('Accès refusé')).toBe(access_logs_event_type.access_denied);
    });

    it('should map English event types correctly', () => {
      expect(mapEventType('Entry')).toBe(access_logs_event_type.entry);
      expect(mapEventType('Exit')).toBe(access_logs_event_type.exit);
      expect(mapEventType('Access denied')).toBe(access_logs_event_type.access_denied);
    });

    it('should handle unknown event types', () => {
      expect(mapEventType('Unknown Type')).toBe(access_logs_event_type.unknown);
    });
  });

  describe('CSV Schema Validation', () => {
    it('should validate a correct record', () => {
      const record = {
        badgeNumber: '12345',
        eventDate: '01/01/2024',
        eventTime: '10:00:00'
      };

      const validated = validateCSVRecord(record);
      expect(validated).toEqual(record);
    });

    it('should reject time without seconds', () => {
      const record = {
        badgeNumber: '12345',
        eventDate: '01/01/2024',
        eventTime: '10:00'
      };
      expect(() => validateCSVRecord(record)).toThrow('Invalid time format');
    });

    it('should reject an invalid record', () => {
      const record = {
        badgeNumber: '',
        eventDate: 'invalid-date',
        eventTime: '10:00' // Changed from generic invalid-time
      };

      expect(() => validateCSVRecord(record)).toThrow();
    });
  });
});