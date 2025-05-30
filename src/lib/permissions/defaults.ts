// Structure par défaut des permissions du système
export const defaultPermissions = {
  // Ressources disponibles dans le système
  resources: {
    'dashboard': {
      name: 'Tableau de bord',
      description: 'Tableau de bord principal'
    },
    'access_logs': {
      name: 'Logs d\'accès',
      description: 'Journaux d\'entrées et sorties'
    },
    'users': {
      name: 'Utilisateurs',
      description: 'Gestion des utilisateurs'
    },
    'reports': {
      name: 'Rapports',
      description: 'Génération et gestion des rapports'
    },
    'settings': {
      name: 'Paramètres',
      description: 'Configuration du système'
    }
  },
  
  // Actions possibles sur les ressources
  actions: {
    'view': {
      name: 'Visualiser',
      description: 'Consulter la ressource'
    },
    'create': {
      name: 'Créer',
      description: 'Créer une nouvelle ressource'
    },
    'edit': {
      name: 'Modifier',
      description: 'Modifier une ressource existante'
    },
    'delete': {
      name: 'Supprimer',
      description: 'Supprimer une ressource existante'
    },
    'export': {
      name: 'Exporter',
      description: 'Exporter les données'
    }
  },
  
  // Rôles dans le système
  roles: {
    'admin': {
      name: 'Administrateur',
      description: 'Accès complet au système'
    },
    'manager': {
      name: 'Gestionnaire',
      description: 'Gestion des accès et rapports'
    },
    'user': {
      name: 'Utilisateur',
      description: 'Accès limité aux fonctionnalités de base'
    },
    'viewer': {
      name: 'Observateur',
      description: 'Accès en lecture seule'
    }
  },
  
  // Définition des permissions par rôle
  permissions: {
    'admin': [
      'dashboard.view',
      'dashboard.create',
      'dashboard.edit',
      'access_logs.view',
      'access_logs.create',
      'access_logs.edit',
      'access_logs.delete',
      'access_logs.export',
      'users.view',
      'users.create',
      'users.edit',
      'users.delete',
      'reports.view',
      'reports.create',
      'reports.edit',
      'reports.delete',
      'reports.export',
      'settings.view',
      'settings.edit'
    ],
    'manager': [
      'dashboard.view',
      'access_logs.view',
      'access_logs.create',
      'access_logs.edit',
      'access_logs.export',
      'users.view',
      'reports.view',
      'reports.create',
      'reports.export',
      'settings.view'
    ],
    'user': [
      'dashboard.view',
      'access_logs.view',
      'reports.view',
      'reports.create'
    ],
    'viewer': [
      'dashboard.view',
      'access_logs.view',
      'reports.view'
    ]
  }
}; 