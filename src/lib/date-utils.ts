import { format, parse, isValid, formatDistanceToNow, differenceInDays, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Formats de date standardisés pour l'application
 */
export const DATE_FORMATS = {
  // Formats d'affichage
  DISPLAY: 'dd/MM/yyyy',
  DISPLAY_WITH_TIME: 'dd/MM/yyyy HH:mm',
  DISPLAY_WITH_SECONDS: 'dd/MM/yyyy HH:mm:ss',
  DISPLAY_SHORT: 'd MMM yyyy',
  DISPLAY_SHORT_WITH_TIME: 'd MMM yyyy HH:mm',
  DISPLAY_MONTH_YEAR: 'MMMM yyyy',
  DISPLAY_TIME: 'HH:mm',
  DISPLAY_TIME_WITH_SECONDS: 'HH:mm:ss',
  
  // Formats API
  API: 'yyyy-MM-dd',
  API_WITH_TIME: 'yyyy-MM-dd HH:mm:ss',
  API_ISO: "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
  
  // Formats spécifiques
  FILENAME: 'yyyyMMdd_HHmmss',
} as const;

/**
 * Formater une date selon un format spécifique
 * @param date Date à formater ou chaîne de caractères
 * @param formatStr Format souhaité (utiliser les constantes DATE_FORMATS)
 * @param useLocale Utiliser la locale française (par défaut: true)
 * @returns Chaîne de caractères formatée
 */
export function formatDate(
  date: Date | string | number | null | undefined,
  formatStr: string = DATE_FORMATS.DISPLAY,
  useLocale: boolean = true
): string {
  if (!date) return '';
  
  const dateObj = date instanceof Date ? date : new Date(date);
  
  if (!isValid(dateObj)) {
    console.error(`Date invalide: ${date}`);
    return '';
  }
  
  try {
    return format(dateObj, formatStr, useLocale ? { locale: fr } : undefined);
  } catch (error) {
    console.error(`Erreur lors du formatage de la date: ${error}`);
    return '';
  }
}

/**
 * Analyser une chaîne de caractères en date
 * @param dateStr Chaîne de caractères à analyser
 * @param formatStr Format de la chaîne (utiliser les constantes DATE_FORMATS)
 * @returns Objet Date ou null si la chaîne est invalide
 */
export function parseDate(
  dateStr: string,
  formatStr: string = DATE_FORMATS.DISPLAY
): Date | null {
  if (!dateStr) return null;
  
  try {
    const parsedDate = parse(dateStr, formatStr, new Date());
    return isValid(parsedDate) ? parsedDate : null;
  } catch (error) {
    console.error(`Erreur lors de l'analyse de la date: ${error}`);
    return null;
  }
}

/**
 * Vérifier si une chaîne de caractères est une date valide
 * @param dateStr Chaîne de caractères à vérifier
 * @param formatStr Format attendu (utiliser les constantes DATE_FORMATS)
 * @returns true si la date est valide, false sinon
 */
export function isValidDate(
  dateStr: string,
  formatStr: string = DATE_FORMATS.DISPLAY
): boolean {
  if (!dateStr) return false;
  
  try {
    const parsedDate = parse(dateStr, formatStr, new Date());
    return isValid(parsedDate);
  } catch (error) {
    return false;
  }
}

/**
 * Obtenir une date relative (il y a X jours, etc.)
 * @param date Date à formater
 * @param addSuffix Ajouter un suffixe (il y a / dans) (par défaut: true)
 * @returns Chaîne formatée (ex: "il y a 2 jours")
 */
export function getRelativeDate(
  date: Date | string | number,
  addSuffix: boolean = true
): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  
  if (!isValid(dateObj)) {
    console.error(`Date invalide: ${date}`);
    return '';
  }
  
  try {
    return formatDistanceToNow(dateObj, {
      addSuffix,
      locale: fr
    });
  } catch (error) {
    console.error(`Erreur lors du calcul de la date relative: ${error}`);
    return '';
  }
}

/**
 * Calculer la différence en jours entre deux dates
 * @param startDate Date de début
 * @param endDate Date de fin
 * @returns Nombre de jours de différence (positif si endDate > startDate)
 */
export function getDaysDifference(
  startDate: Date | string | number,
  endDate: Date | string | number = new Date()
): number {
  const start = startDate instanceof Date ? startDate : new Date(startDate);
  const end = endDate instanceof Date ? endDate : new Date(endDate);
  
  if (!isValid(start) || !isValid(end)) {
    console.error(`Dates invalides: ${startDate}, ${endDate}`);
    return 0;
  }
  
  return differenceInDays(end, start);
}

/**
 * Ajouter des jours à une date
 * @param date Date de base
 * @param days Nombre de jours à ajouter (peut être négatif)
 * @returns Nouvelle date
 */
export function addDaysToDate(
  date: Date | string | number,
  days: number
): Date {
  const dateObj = date instanceof Date ? date : new Date(date);
  
  if (!isValid(dateObj)) {
    console.error(`Date invalide: ${date}`);
    return new Date();
  }
  
  return addDays(dateObj, days);
}

/**
 * Formater une date pour l'affichage dans un nom de fichier
 * @param date Date à formater
 * @returns Chaîne formatée (ex: "20250530_142533")
 */
export function formatDateForFilename(date: Date | string | number = new Date()): string {
  return formatDate(date, DATE_FORMATS.FILENAME, false);
}

/**
 * Combiner une date et une heure en un seul objet Date
 * @param date Date (peut être un objet Date ou une chaîne au format DATE_FORMATS.API)
 * @param time Heure (chaîne au format HH:mm ou HH:mm:ss)
 * @returns Objet Date combiné
 */
export function combineDateAndTime(
  date: Date | string,
  time: string
): Date {
  // Convertir la date en objet Date si nécessaire
  const dateObj = date instanceof Date ? date : parseDate(date, DATE_FORMATS.API) || new Date();
  
  // Extraire les composants de l'heure
  const [hours, minutes, seconds] = time.split(':').map(Number);
  
  // Créer une nouvelle date avec les composants de l'heure
  const result = new Date(dateObj);
  result.setHours(hours || 0, minutes || 0, seconds || 0, 0);
  
  return result;
}

/**
 * Extraire les composants d'une date (jour, mois, année)
 * @param date Date à analyser
 * @returns Objet contenant les composants (jour, mois, année)
 */
export function getDateComponents(date: Date | string | number): {
  day: number;
  month: number;
  year: number;
} {
  const dateObj = date instanceof Date ? date : new Date(date);
  
  if (!isValid(dateObj)) {
    console.error(`Date invalide: ${date}`);
    return { day: 0, month: 0, year: 0 };
  }
  
  return {
    day: dateObj.getDate(),
    month: dateObj.getMonth() + 1, // Les mois commencent à 0
    year: dateObj.getFullYear()
  };
}

/**
 * Calculer l'âge à partir d'une date de naissance
 * @param birthDate Date de naissance
 * @returns Âge en années
 */
export function calculateAge(birthDate: Date | string | number): number {
  const birth = birthDate instanceof Date ? birthDate : new Date(birthDate);
  
  if (!isValid(birth)) {
    console.error(`Date de naissance invalide: ${birthDate}`);
    return 0;
  }
  
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  
  // Si le mois actuel est avant le mois de naissance ou si nous sommes dans le même mois
  // mais que le jour actuel est avant le jour de naissance, alors nous n'avons pas encore
  // atteint l'anniversaire cette année
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
} 