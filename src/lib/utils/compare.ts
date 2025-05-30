import { isDeepStrictEqual } from 'util';

/**
 * Compare deux valeurs de manière profonde pour déterminer si elles sont équivalentes.
 * Remplace lodash.isequal qui est déprécié.
 * 
 * @param value Première valeur à comparer
 * @param other Seconde valeur à comparer
 * @returns true si les valeurs sont équivalentes, false sinon
 */
export function isEqual(value: any, other: any): boolean {
  return isDeepStrictEqual(value, other);
} 