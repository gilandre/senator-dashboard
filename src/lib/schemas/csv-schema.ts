import { z } from 'zod';

// Schéma de base pour les enregistrements CSV
export const csvRecordSchema = z.object({
  // Champs obligatoires avec variations de noms
  'Numéro de badge': z.string().optional(),
  'Date évènements': z.string().optional(),
  'Heure évènements': z.string().optional(),
  'Centrale': z.string().optional(),
  'Lecteur': z.string().optional(),
  'Nature Evenement': z.string().optional(),
  'Nom': z.string().optional(),
  'Prénom': z.string().optional(),
  'Statut': z.string().optional(),
  'Groupe': z.string().optional(),
  'Date de début de validité': z.string().optional(),
  'Date de création': z.string().optional(),
}).refine(
  (data) => {
    // Vérifier que les champs obligatoires sont présents
    const hasBadge = data['Numéro de badge'];
    const hasDate = data['Date évènements'];
    const hasTime = data['Heure évènements'];
    
    return hasBadge && hasDate && hasTime;
  },
  {
    message: "Les champs obligatoires (Numéro de badge, Date évènements, Heure évènements) sont manquants",
    path: ["Numéro de badge"]
  }
);

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