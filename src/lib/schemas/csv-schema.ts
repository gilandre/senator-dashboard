import { z } from 'zod';

// Schéma de base pour les enregistrements CSV
export const csvRecordSchema = z.object({
  // Champs obligatoires avec variations de noms
  'Numéro de badge': z.string().nonempty('Le numéro de badge est obligatoire'),
  'Date évènements': z.string().nonempty('La date de l\'événement est obligatoire'),
  'Heure évènements': z.string()
    .nonempty('L\'heure de l\'événement est obligatoire')
    .refine(
      (val) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/.test(val),
      { message: 'Format d\'heure invalide. Formats acceptés: HH:MM ou HH:MM:SS' }
    ),
  'Centrale': z.string().optional(),
  'Lecteur': z.string().nonempty('Le nom du lecteur est obligatoire'),
  'Nature Evenement': z.string().optional(),
  'Nom': z.string().optional(),
  'Prénom': z.string().optional(),
  'Statut': z.string().optional(),
  'Groupe': z.string().optional(),
  'Date de début de validité': z.string().optional(),
  'Date de création': z.string().optional(),
});

// Type dérivé du schéma
export type CSVRecord = z.infer<typeof csvRecordSchema>;

// Fonction de validation
export const validateCSVRecord = (record: unknown): CSVRecord => {
  return csvRecordSchema.parse(record);
};

// Fonction de validation en masse
export const validateCSVRecords = (records: unknown[]): CSVRecord[] => {
  return records.map(record => validateCSVRecord(record));
};