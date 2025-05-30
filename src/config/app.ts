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
  },
  // Configuration de l'export de documents
  export: {
    // Logo par défaut (base64) à utiliser dans les exports PDF si aucun logo n'est fourni
    defaultLogo: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjUwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjx0ZXh0IHg9IjEwIiB5PSIzMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjI0IiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0iIzAwNzhENCI+RW1lcmF1ZGUgRGFzaGk8L3RleHQ+PC9zdmc+',
    // Configuration du format des fichiers exportés
    formats: {
      csv: {
        delimiter: ',',
        includeHeaders: true,
        addBOM: true
      },
      excel: {
        defaultSheetName: 'Données',
        autoWidth: true,
        defaultDateFormat: 'dd/mm/yyyy'
      },
      pdf: {
        pageSize: 'A4',
        defaultMargins: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm'
        }
      }
    }
  }
} as const;

// Type pour TypeScript
export type AppConfig = typeof APP_CONFIG; 