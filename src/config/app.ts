export const APP_CONFIG = {
  name: 'EMERAUDE DASHI',
  version: '1.0.0',
  colors: {
    primary: '#2E7D32', // Vert émeraude
    secondary: '#1B5E20', // Vert émeraude foncé
    accent: '#81C784', // Vert émeraude clair
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
      background: '#2E7D32', // Vert émeraude
      text: '#FFFFFF',
      hover: '#1B5E20' // Vert émeraude foncé
    }
  }
} as const;

// Type pour TypeScript
export type AppConfig = typeof APP_CONFIG; 