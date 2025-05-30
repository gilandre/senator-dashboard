import { prisma } from './prisma';
import { defaultPermissions } from './permissions/defaults';

// Définition des interfaces pour les types
interface ResourceInfo {
  name: string;
  description: string;
}

interface ActionInfo {
  name: string;
  description: string;
}

interface RoleInfo {
  name: string;
  description: string;
}

interface DefaultPermissions {
  resources: Record<string, ResourceInfo>;
  actions: Record<string, ActionInfo>;
  roles: Record<string, RoleInfo>;
  permissions: Record<string, string[]>;
}

// Structure des modules et fonctions de l'application
const appStructure = [
  {
    name: 'Tableau de bord',
    code: 'dashboard',
    isModule: true,
    functions: []
  },
  {
    name: 'Assiduité',
    code: 'attendance',
    isModule: true,
    functions: [
      {
        name: 'Liste des présences',
        code: 'attendance_list',
        description: 'Accès à la liste des présences'
      },
      {
        name: 'Détail des présences',
        code: 'attendance_detail',
        description: 'Affichage détaillé des présences'
      },
      {
        name: 'Importation CSV',
        code: 'attendance_import',
        description: 'Importation des données depuis un fichier CSV'
      },
      {
        name: 'Exportation Excel',
        code: 'attendance_export',
        description: 'Exportation des données vers Excel'
      }
    ]
  },
  {
    name: 'Accès',
    code: 'access',
    isModule: true,
    functions: [
      {
        name: 'Logs d\'accès',
        code: 'access_logs',
        description: 'Consultation des logs d\'accès'
      },
      {
        name: 'Monitoring',
        code: 'access_monitoring',
        description: 'Surveillance des accès en temps réel'
      }
    ]
  },
  {
    name: 'Paramètres',
    code: 'settings',
    isModule: true,
    functions: [
      {
        name: 'Utilisateurs',
        code: 'users',
        description: 'Gestion des utilisateurs'
      },
      {
        name: 'Contrôle d\'accès',
        code: 'access_control',
        description: 'Configuration du contrôle d\'accès',
        subFunctions: [
          {
            name: 'Profils',
            code: 'profiles',
            description: 'Gestion des profils utilisateurs'
          },
          {
            name: 'Permissions',
            code: 'permissions',
            description: 'Configuration des permissions'
          }
        ]
      },
      {
        name: 'Calendrier de travail',
        code: 'work_calendar',
        description: 'Configuration du calendrier de travail'
      },
      {
        name: 'Sécurité',
        code: 'security',
        description: 'Paramètres de sécurité'
      }
    ]
  }
];

// Définition des profils par défaut
const defaultProfiles = [
  {
    name: 'Administrateur',
    description: 'Accès complet à toutes les fonctionnalités du système',
    isAdmin: true,
    accessLevel: 'Complet',
    status: 'Actif',
    permissions: { 
      all: 'Complet'  // Toutes les permissions avec accès complet
    }
  },
  {
    name: 'Gestionnaire',
    description: 'Gestion quotidienne et supervision des activités',
    isAdmin: false,
    accessLevel: 'Élevé',
    status: 'Actif',
    permissions: {
      'dashboard': 'Lecture',
      'attendance': 'Complet',
      'access': 'Lecture',
      'settings': {
        default: 'Lecture',
        'work_calendar': 'Écriture',
        'users': 'Lecture'
      }
    }
  },
  {
    name: 'Opérateur',
    description: 'Gestion quotidienne des accès et de l\'assiduité',
    isAdmin: false,
    accessLevel: 'Moyen',
    status: 'Actif',
    permissions: {
      'dashboard': 'Lecture',
      'attendance': 'Écriture',
      'access': 'Lecture',
      'settings': {
        'work_calendar': 'Lecture'
      }
    }
  },
  {
    name: 'Consultant',
    description: 'Consultation des rapports et statistiques uniquement',
    isAdmin: false,
    accessLevel: 'Faible',
    status: 'Actif',
    permissions: {
      'dashboard': 'Lecture',
      'attendance': 'Lecture',
      'access': 'Lecture'
    }
  }
];

// Types simplifiés pour la compatibilité
type Resource = {
  id: string;
  name: string;
  description: string;
};

type Action = {
  id: string;
  name: string;
  description: string;
};

type Role = {
  id: string;
  name: string;
  description: string;
};

type Permission = {
  id: string;
  roleId: string;
  resourceId: string;
  actionId: string;
  conditions?: any;
};

/**
 * Initialisation des autorisations par défaut
 */
export async function initializePermissions(clearExisting: boolean = false) {
  console.log("Initialisation des permissions du système...");
  
  if (clearExisting) {
    console.log("Suppression des permissions existantes...");
    // Supprimer les permissions existantes
    await prisma.permissions.deleteMany({});
    await prisma.actions.deleteMany({});
    await prisma.resources.deleteMany({});
    console.log("Permissions existantes supprimées");
  }
  
  // Créer les ressources
  console.log("Création des ressources...");
  const resources: Resource[] = [];
  for (const [resourceId, resourceData] of Object.entries(defaultPermissions.resources || {})) {
    const resource = await prisma.resources.upsert({
      where: { id: resourceId },
      update: {
        name: resourceData.name || '',
        description: resourceData.description || ''
      },
      create: {
        id: resourceId,
        name: resourceData.name || '',
        description: resourceData.description || ''
      }
    });
    resources.push(resource);
  }
  console.log(`${resources.length} ressources créées/mises à jour`);
  
  // Créer les actions
  console.log("Création des actions...");
  const actions: Action[] = [];
  for (const [actionId, actionData] of Object.entries(defaultPermissions.actions || {})) {
    const action = await prisma.actions.upsert({
      where: { id: actionId },
      update: {
        name: actionData.name || '',
        description: actionData.description || ''
      },
      create: {
        id: actionId,
        name: actionData.name || '',
        description: actionData.description || ''
      }
    });
    actions.push(action);
  }
  console.log(`${actions.length} actions créées/mises à jour`);
  
  // Créer ou mettre à jour les rôles
  console.log("Création/mise à jour des rôles...");
  const roles: Role[] = [];
  for (const [roleId, roleData] of Object.entries(defaultPermissions.roles || {})) {
    const role = await prisma.roles.upsert({
      where: { id: roleId },
      update: {
        name: roleData.name || '',
        description: roleData.description || ''
      },
      create: {
        id: roleId,
        name: roleData.name || '',
        description: roleData.description || ''
      }
    });
    roles.push(role);
  }
  console.log(`${roles.length} rôles créés/mis à jour`);
  
  // Créer les permissions
  console.log("Attribution des permissions aux rôles...");
  const permissions: Permission[] = [];
  
  // Attribuer les permissions aux rôles
  for (const [roleId, rolePermissions] of Object.entries(defaultPermissions.permissions || {})) {
    console.log(`Attribution de permissions au rôle ${roleId}...`);
    
    if (!Array.isArray(rolePermissions)) continue;
    
    for (const permData of rolePermissions) {
      // Format: resource.action ou resource.action|condition
      const [actionString, conditionString] = permData.split('|');
      const [resourceId, actionId] = actionString.split('.');
      
      if (!resourceId || !actionId) {
        console.warn(`Format de permission invalide: ${permData}`);
        continue;
      }
      
      // Vérifier que la ressource et l'action existent
      const resourceExists = await prisma.resources.findUnique({ where: { id: resourceId } });
      const actionExists = await prisma.actions.findUnique({ where: { id: actionId } });
      
      if (!resourceExists) {
        console.warn(`Ressource inconnue: ${resourceId}`);
        continue;
      }
      
      if (!actionExists) {
        console.warn(`Action inconnue: ${actionId}`);
        continue;
      }
      
      // Créer la permission
      const permissionData: any = {
        roleId,
        resourceId,
        actionId
      };
      
      if (conditionString) {
        try {
          permissionData.conditions = JSON.parse(conditionString);
        } catch (error) {
          console.warn(`Condition invalide pour ${permData}: ${error}`);
        }
      }
      
      // Vérifier si la permission existe déjà
      const existingPermission = await prisma.permissions.findFirst({
        where: {
          roleId,
          resourceId,
          actionId
        }
      });
      
      if (existingPermission) {
        // Mettre à jour la permission existante
        const permission = await prisma.permissions.update({
          where: { id: existingPermission.id },
          data: {
            conditions: permissionData.conditions
          }
        });
        permissions.push(permission);
      } else {
        // Créer une nouvelle permission
        const permission = await prisma.permissions.create({
          data: permissionData
        });
        permissions.push(permission);
      }
    }
  }
  
  console.log(`${permissions.length} permissions créées/mises à jour`);
  console.log("Initialisation des permissions terminée");
  
  return {
    resources,
    actions,
    roles,
    permissions,
    success: true
  };
}

// Fonction pour définir les habilitations d'un profil
async function setProfilePermissions(profileId: string, permissionsConfig: any) {
  try {
    // Récupérer toutes les permissions depuis Prisma
    const allPermissions = await prisma.app_permissions.findMany({});
    const permissionsByCode: {[key: string]: any} = {};
    
    // Créer un dictionnaire de permissions par code
    allPermissions.forEach(perm => {
      permissionsByCode[perm.code] = perm;
    });
    
    // Supprimer les anciennes permissions du profil
    await prisma.profile_permissions.deleteMany({
      where: { profileId: parseInt(profileId) }
    });
    
    // Tableau pour stocker les permissions à traiter
    const permissionsToProcess: any[] = [];
    
    // Si "all" est défini, appliquer à toutes les permissions
    if (permissionsConfig.all) {
      allPermissions.forEach(perm => {
        permissionsToProcess.push({
          permId: perm.id,
          level: permissionsConfig.all
        });
      });
    } else {
      // Pour chaque module ou fonction mentionné dans la configuration
      for (const [code, levelConfig] of Object.entries(permissionsConfig)) {
        if (typeof levelConfig === 'string') {
          // Si le code correspond à une permission, l'ajouter
          if (permissionsByCode[code]) {
            permissionsToProcess.push({
              permId: permissionsByCode[code].id,
              level: levelConfig
            });
            
            // Appliquer aussi aux fonctions de ce module
            const moduleFunctions = allPermissions.filter(p => 
              p.parentModule === permissionsByCode[code].name);
              
            moduleFunctions.forEach(func => {
              permissionsToProcess.push({
                permId: func.id,
                level: levelConfig
              });
            });
          }
        } else if (typeof levelConfig === 'object' && levelConfig !== null) {
          // Niveau par défaut pour le module
          const configObj = levelConfig as Record<string, string>;
          const defaultLevel = configObj.default || 'Aucun';
          
          // Si le code correspond à un module, appliquer le niveau par défaut
          if (permissionsByCode[code] && permissionsByCode[code].isModule) {
            permissionsToProcess.push({
              permId: permissionsByCode[code].id,
              level: defaultLevel
            });
            
            // Pour chaque fonction spécifique du module
            const moduleFunctions = allPermissions.filter(p => 
              p.parentModule === permissionsByCode[code].name);
            
            // Appliquer le niveau par défaut, puis remplacer par les spécifiques
            moduleFunctions.forEach(func => {
              const funcLevel = configObj[func.code] || defaultLevel;
              permissionsToProcess.push({
                permId: func.id,
                level: funcLevel
              });
            });
          }
          
          // Traiter les fonctions spécifiques
          for (const [funcCode, funcLevel] of Object.entries(configObj)) {
            if (funcCode !== 'default' && permissionsByCode[funcCode]) {
              permissionsToProcess.push({
                permId: permissionsByCode[funcCode].id,
                level: funcLevel
              });
            }
          }
        }
      }
    }
    
    // Créer des permissions avec les bons niveaux
    for (const { permId, level } of permissionsToProcess) {
      // Convertir le niveau en droits spécifiques
      const permissionRights = {
        view: level !== 'Aucun',
        create: level === 'Complet' || level === 'Écriture',
        edit: level === 'Complet' || level === 'Écriture',
        delete: level === 'Complet',
        approve: level === 'Complet',
        export: level === 'Complet' || level === 'Écriture',
        level
      };
      
      // Créer une nouvelle permission de profil
      await prisma.profile_permissions.create({
        data: {
          profileId: parseInt(profileId),
          permissionId: permId,
          ...permissionRights
        }
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Erreur lors de la définition des permissions du profil:', error);
    return { success: false, error };
  }
}

// Fonction pour initialiser les profils
export async function initializeProfiles(force = false) {
  try {
    // Récupérer la liste des profils qui sont attribués à des utilisateurs
    const usersWithProfiles = await prisma.users.findMany({
      where: {
        profileId: {
          not: null
        }
      },
      distinct: ['profileId'],
      select: {
        profileId: true
      }
    });
    
    const profileIdsInUse = usersWithProfiles
      .map(user => user.profileId)
      .filter(id => id !== null) as number[];
    
    console.log(`${profileIdsInUse.length} profils sont actuellement utilisés par des utilisateurs`);
    
    // Si force est à true, supprimer tous les profils existants qui ne sont pas utilisés
    if (force) {
      console.log('Suppression des profils non utilisés...');
      
      // Récupérer tous les profils existants
      const existingProfiles = await prisma.profiles.findMany();
      
      // Filtrer les profils à supprimer (ceux qui ne sont pas utilisés)
      const profilesToDelete = existingProfiles.filter(profile => 
        !profileIdsInUse.includes(profile.id)
      );
      
      if (profilesToDelete.length > 0) {
        // Archiver les profils avant suppression
        for (const profile of profilesToDelete) {
          await prisma.profile_archives.create({
            data: {
              originalId: profile.id.toString(),
              name: profile.name,
              description: profile.description || '',
              accessLevel: profile.accessLevel || '',
              status: profile.status || '',
              isAdmin: profile.isAdmin || false,
              isDefault: profile.isDefault || false,
              archivedAt: new Date(),
              archivedBy: 'Système (Init)',
              originalCreatedAt: profile.createdAt || new Date()
            }
          });
        }
        
        // Supprimer les permissions associées
        await prisma.profile_permissions.deleteMany({
          where: {
            profileId: {
              in: profilesToDelete.map(p => p.id)
            }
          }
        });
        
        // Supprimer les profils
        await prisma.profiles.deleteMany({
          where: {
            id: {
              in: profilesToDelete.map(p => p.id)
            }
          }
        });
        
        console.log(`${profilesToDelete.length} profils non utilisés ont été supprimés et archivés`);
      } else {
        console.log('Aucun profil non utilisé à supprimer');
      }
    }
    
    console.log('Initialisation des profils...');
    
    // Traiter chaque profil par défaut
    for (const profileData of defaultProfiles) {
      // Vérifier si le profil existe déjà
      let profile = await prisma.profiles.findFirst({
        where: { name: profileData.name }
      });
      
      if (!profile) {
        // Créer le profil s'il n'existe pas
        profile = await prisma.profiles.create({
          data: {
            name: profileData.name,
            description: profileData.description,
            isAdmin: profileData.isAdmin,
            isDefault: profileData.name === 'Administrateur', // Le profil Administrateur est le profil par défaut
            accessLevel: profileData.accessLevel,
            status: profileData.status
          }
        });
        console.log(`Profil '${profileData.name}' créé avec succès`);
      } else {
        console.log(`Profil '${profileData.name}' existe déjà`);
      }
      
      // Définir les habilitations pour ce profil
      await setProfilePermissions(String(profile.id), profileData.permissions);
    }
    
    console.log('Initialisation des profils terminée avec succès');
    return { success: true };
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des profils:', error);
    return { success: false, error };
  }
}

// Fonction principale d'initialisation
export async function initializeSystem(force = false) {
  try {
    // Initialiser les permissions
    const permissionsResult = await initializePermissions(force);
    
    // Initialiser les profils avec leurs habilitations
    const profilesResult = await initializeProfiles(force);
    
    return {
      success: permissionsResult.success && profilesResult.success,
      permissions: permissionsResult,
      profiles: profilesResult
    };
  } catch (error) {
    console.error('Erreur lors de l\'initialisation du système:', error);
    return { success: false, error };
  }
} 