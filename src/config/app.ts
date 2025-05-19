export const APP_CONFIG = {
  name: 'EMERAUDE DASHI',
  version: '1.0.0',
  colors: {
    primary: '#0078D4', // Bleu Microsoft
    secondary: '#106EBE', // Bleu Microsoft foncé
    accent: '#2B88D8', // Bleu Microsoft clair
    background: '#F5F5F5', // Gris très clair
    text: '#333333', // Gris foncé
    white: '#FFFFFF',
    error: '#D32F2F',
    warning: '#FFA000',
    success: '#388E3C',
    info: '#1976D2'
  },
  theme: {
    header: {
      background: '#0078D4', // Bleu Microsoft
      text: '#FFFFFF',
      hover: '#106EBE' // Bleu Microsoft foncé
    }
  }
} as const;

// Type pour TypeScript
export type AppConfig = typeof APP_CONFIG; 