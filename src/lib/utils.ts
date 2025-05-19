import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combine multiple class names with Tailwind utility classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
} 