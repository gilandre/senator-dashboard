import { connectToDatabase } from './mongodb';
import mongoose from 'mongoose';
import Permission from '@/models/Permission';
import Profile from '@/models/Profile';

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

// Fonction pour s'assurer que les index problématiques sont supprimés
async function cleanupIndexes() {
  try {
    // Vérifier que le schéma de la collection est à jour
    const collections = await mongoose.connection.db?.listCollections({ name: 'permissions' }).toArray();
    
    if (collections && collections.length > 0) {
      // Récupérer les index existants
      const indexes = await mongoose.connection.db?.collection('permissions').indexes();
      
      if (indexes) {
        // Identifier les index problématiques
        const problematicIndexes = indexes.filter(i => 
          i.name === 'module_1_action_1' || 
          (i.key && i.key.module && i.key.action));
        
        // Supprimer chaque index problématique
        for (const index of problematicIndexes) {
          if (index.name) {
            console.log('Suppression de l\'index problématique:', index.name);
            await mongoose.connection.db?.collection('permissions').dropIndex(index.name);
          }
        }
      }
    }
  } catch (error) {
    console.warn('Erreur lors de la vérification des index:', error);
  }
}

// Fonction pour créer une permission
async function createPermission(data: any, parentModule?: string) {
  try {
    // Vérifier si la permission existe déjà
    const existingPermission = await Permission.findOne({ code: data.code });
    
    if (existingPermission) {
      console.log(`Permission '${data.code}' existe déjà, mise à jour...`);
      
      // Mettre à jour la permission existante
      await Permission.updateOne(
        { code: data.code },
        { 
          $set: {
            name: data.name,
            description: data.description || `Permission pour ${data.name}`,
            isModule: data.isModule || false,
            isFunction: !data.isModule,
            module: data.module || (data.isModule ? data.name : parentModule || 'default'),
            parentModule: parentModule || null,
            view: true,
            create: !data.isModule,
            edit: !data.isModule,
            delete: !data.isModule,
            approve: false,
            export: data.code.includes('export')
          } 
        }
      );
      
      return existingPermission;
    } else {
      // Créer une nouvelle permission
      const permissionData = {
        name: data.name,
        code: data.code,
        description: data.description || `Permission pour ${data.name}`,
        isModule: data.isModule || false,
        isFunction: !data.isModule,
        module: data.module || (data.isModule ? data.name : parentModule || 'default'),
        parentModule: parentModule || null,
        view: true,
        create: !data.isModule,
        edit: !data.isModule,
        delete: !data.isModule,
        approve: false,
        export: data.code.includes('export')
      };
      
      const newPermission = new Permission(permissionData);
      await newPermission.save();
      
      console.log(`Permission '${data.code}' créée avec succès`);
      return newPermission;
    }
  } catch (error) {
    console.error(`Erreur lors de la création/mise à jour de la permission '${data.code}':`, error);
    throw error;
  }
}

// Fonction pour initialiser les permissions
export async function initializePermissions(force = false) {
  try {
    await connectToDatabase();
    
    // Nettoyer les index problématiques
    await cleanupIndexes();
    
    // Récupérer les profils qui sont attribués à des utilisateurs
    const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
      profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile' }
    }));
    
    const usersWithProfiles = await User.distinct('profileId');
    const profileIdsInUse = usersWithProfiles.map(id => id.toString());
    
    // Récupérer les permissions qui sont utilisées par ces profils
    const ProfilePermission = mongoose.models.ProfilePermission || 
      mongoose.model('ProfilePermission', new mongoose.Schema({
        profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile' },
        permissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Permission' }
      }));
    
    const permissionsInUse = await (ProfilePermission as any).find({
      profileId: { $in: profileIdsInUse }
    }).distinct('permissionId');
    
    const permissionIdsInUse = permissionsInUse.map(id => id.toString());
    console.log(`${permissionIdsInUse.length} permissions sont utilisées par des profils assignés à des utilisateurs`);
    
    // Si force est à true, supprimer toutes les permissions non utilisées
    if (force) {
      console.log('Suppression des permissions non utilisées...');
      
      // Récupérer toutes les permissions existantes
      const existingPermissions = await Permission.find({});
      
      // Filtrer les permissions à supprimer (celles qui ne sont pas utilisées par des profils assignés à des utilisateurs)
      const permissionsToDelete = existingPermissions.filter(permission => {
        const permissionId = permission._id ? String(permission._id) : '';
        return !permissionIdsInUse.includes(permissionId);
      });
      
      if (permissionsToDelete.length > 0) {
        // Archiver les permissions avant suppression
        const PermissionArchive = mongoose.models.PermissionArchive || mongoose.model('PermissionArchive', new mongoose.Schema({
          originalId: { type: String, required: true },
          name: { type: String, required: true },
          code: { type: String, required: true },
          description: { type: String },
          isModule: { type: Boolean },
          isFunction: { type: Boolean },
          module: { type: String },
          parentModule: { type: String },
          view: { type: Boolean },
          create: { type: Boolean },
          edit: { type: Boolean },
          delete: { type: Boolean },
          approve: { type: Boolean },
          export: { type: Boolean },
          archivedAt: { type: Date, default: Date.now },
          archivedBy: { type: String, default: 'Système (Init)' },
          originalCreatedAt: { type: Date }
        }));
        
        // Archiver chaque permission
        for (const permission of permissionsToDelete) {
          await new PermissionArchive({
            originalId: permission._id ? String(permission._id) : '',
            name: permission.name,
            code: permission.code,
            description: permission.description,
            isModule: permission.isModule,
            isFunction: permission.isFunction,
            module: permission.module,
            parentModule: permission.parentModule,
            view: permission.view,
            create: permission.create,
            edit: permission.edit,
            delete: permission.delete,
            approve: permission.approve,
            export: permission.export,
            originalCreatedAt: permission.createdAt
          }).save();
        }
        
        // Supprimer les permissions non utilisées
        await Permission.deleteMany({
          _id: { $in: permissionsToDelete.map(p => p._id) }
        });
        
        console.log(`${permissionsToDelete.length} permissions non utilisées ont été supprimées et archivées`);
      } else {
        console.log('Aucune permission non utilisée à supprimer');
      }
      
      // Supprimer les associations profile-permission inutilisées
      if (mongoose.models.ProfilePermission) {
        await (ProfilePermission as any).deleteMany({
          permissionId: { $in: permissionsToDelete.map(p => p._id) },
          profileId: { $nin: profileIdsInUse }
        });
      }
    }
    
    console.log('Initialisation des permissions...');
    
    // 1. Créer les permissions pour les modules et fonctions
    for (const moduleItem of appStructure) {
      // Créer la permission pour le module parent
      await createPermission({
        name: moduleItem.name,
        code: moduleItem.code,
        isModule: true,
        description: `Module ${moduleItem.name}`
      });
      
      // Créer les fonctions associées
      for (const func of moduleItem.functions) {
        const funcPermission = await createPermission({
          name: func.name,
          code: func.code,
          description: func.description,
          module: moduleItem.name
        }, moduleItem.name);
        
        // Traiter les sous-fonctions si elles existent
        if (func.subFunctions && Array.isArray(func.subFunctions)) {
          for (const subFunc of func.subFunctions) {
            await createPermission({
              name: subFunc.name,
              code: subFunc.code,
              description: subFunc.description,
              module: moduleItem.name
            }, moduleItem.name);
          }
        }
      }
    }
    
    console.log('Initialisation des permissions terminée avec succès');
    return { success: true };
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des permissions:', error);
    return { success: false, error };
  }
}

// Fonction pour définir les habilitations d'un profil
async function setProfilePermissions(profileId: string, permissionsConfig: any) {
  try {
    // Récupérer toutes les permissions
    const allPermissions = await Permission.find({});
    const permissionsByCode: {[key: string]: any} = {};
    
    // Créer un dictionnaire de permissions par code
    allPermissions.forEach(perm => {
      permissionsByCode[perm.code] = perm;
    });
    
    // Créer une collection ProfilePermission si elle n'existe pas déjà
    const ProfilePermission = mongoose.models.ProfilePermission || 
      mongoose.model('ProfilePermission', new mongoose.Schema({
        profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true },
        permissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Permission', required: true },
        view: { type: Boolean, default: false },
        create: { type: Boolean, default: false },
        edit: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
        approve: { type: Boolean, default: false },
        export: { type: Boolean, default: false },
        level: { type: String, enum: ['Complet', 'Écriture', 'Lecture', 'Aucun'], default: 'Aucun' }
      }, { timestamps: true }));
    
    // Indexation pour éviter les doublons
    if (!ProfilePermission.schema.indexes().some(idx => 
      idx[0].profileId && idx[0].permissionId && idx[1] && idx[1].unique)) {
      ProfilePermission.schema.index({ profileId: 1, permissionId: 1 }, { unique: true });
    }
    
    // Traiter chaque permission
    const permissionsToProcess: any[] = [];
    
    // Si "all" est défini, appliquer à toutes les permissions
    if (permissionsConfig.all) {
      allPermissions.forEach(perm => {
        permissionsToProcess.push({
          permId: perm._id,
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
              permId: permissionsByCode[code]._id,
              level: levelConfig
            });
            
            // Appliquer aussi aux fonctions de ce module
            const moduleFunctions = allPermissions.filter(p => 
              p.parentModule === permissionsByCode[code].name);
              
            moduleFunctions.forEach(func => {
              permissionsToProcess.push({
                permId: func._id,
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
              permId: permissionsByCode[code]._id,
              level: defaultLevel
            });
            
            // Pour chaque fonction spécifique du module
            const moduleFunctions = allPermissions.filter(p => 
              p.parentModule === permissionsByCode[code].name);
            
            // Appliquer le niveau par défaut, puis remplacer par les spécifiques
            moduleFunctions.forEach(func => {
              const funcLevel = configObj[func.code] || defaultLevel;
              permissionsToProcess.push({
                permId: func._id,
                level: funcLevel
              });
            });
          }
          
          // Traiter les fonctions spécifiques
          for (const [funcCode, funcLevel] of Object.entries(configObj)) {
            if (funcCode !== 'default' && permissionsByCode[funcCode]) {
              permissionsToProcess.push({
                permId: permissionsByCode[funcCode]._id,
                level: funcLevel
              });
            }
          }
        }
      }
    }
    
    // Maintenant, supprimer les anciennes permissions du profil
    await (ProfilePermission as any).deleteMany({ profileId });
    
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
      
      // Créer ou mettre à jour la permission du profil
      await (ProfilePermission as any).findOneAndUpdate(
        { profileId, permissionId: permId },
        { $set: { ...permissionRights } },
        { upsert: true, new: true }
      );
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
    await connectToDatabase();
    
    // Récupérer la liste des profils qui sont attribués à des utilisateurs
    const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
      profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile' }
    }));
    
    const usersWithProfiles = await User.distinct('profileId');
    const profileIdsInUse = usersWithProfiles.map(id => id.toString());
    
    console.log(`${profileIdsInUse.length} profils sont actuellement utilisés par des utilisateurs`);
    
    // Si force est à true, supprimer tous les profils existants qui ne sont pas utilisés
    if (force) {
      console.log('Suppression des profils non utilisés...');
      
      // Récupérer tous les profils existants
      const existingProfiles = await Profile.find({});
      
      // Filtrer les profils à supprimer (ceux qui ne sont pas utilisés)
      const profilesToDelete = existingProfiles.filter(profile => {
        const profileId = profile._id ? String(profile._id) : '';
        return !profileIdsInUse.includes(profileId);
      });
      
      if (profilesToDelete.length > 0) {
        // Archiver les profils avant suppression
        const ProfileArchive = mongoose.models.ProfileArchive || mongoose.model('ProfileArchive', new mongoose.Schema({
          originalId: { type: String, required: true },
          name: { type: String, required: true },
          description: { type: String },
          accessLevel: { type: String },
          status: { type: String },
          isAdmin: { type: Boolean },
          isDefault: { type: Boolean },
          archivedAt: { type: Date, default: Date.now },
          archivedBy: { type: String, default: 'Système (Init)' },
          originalCreatedAt: { type: Date }
        }));
        
        // Archiver chaque profil
        for (const profile of profilesToDelete) {
          const profileData = {
            name: profile.name,
            description: profile.description,
            accessLevel: (profile as any).accessLevel,
            status: (profile as any).status,
            isAdmin: (profile as any).isAdmin,
            isDefault: (profile as any).isDefault,
            originalCreatedAt: profile.createdAt
          };
          
          await new ProfileArchive(profileData).save();
        }
        
        // Supprimer les profils non utilisés
        await Profile.deleteMany({ 
          _id: { $in: profilesToDelete.map(p => p._id) } 
        });
        
        console.log(`${profilesToDelete.length} profils non utilisés ont été supprimés et archivés`);
      } else {
        console.log('Aucun profil non utilisé à supprimer');
      }
      
      // Supprimer les permissions de profils pour les profils supprimés
      if (mongoose.models.ProfilePermission) {
        await (mongoose.models.ProfilePermission as any).deleteMany({
          profileId: { $in: profilesToDelete.map(p => p._id) }
        });
      }
    }
    
    console.log('Initialisation des profils...');
    
    // Traiter chaque profil par défaut
    for (const profileData of defaultProfiles) {
      // Vérifier si le profil existe déjà
      let profile = await Profile.findOne({ name: profileData.name });
      
      if (!profile) {
        // Créer le profil s'il n'existe pas
        profile = new Profile({
          name: profileData.name,
          description: profileData.description,
          isAdmin: profileData.isAdmin,
          isDefault: profileData.name === 'Administrateur', // Le profil Administrateur est le profil par défaut
          accessLevel: profileData.accessLevel,
          status: profileData.status
        });
        
        await profile.save();
        console.log(`Profil '${profileData.name}' créé avec succès`);
      } else {
        console.log(`Profil '${profileData.name}' existe déjà`);
      }
      
      // Définir les habilitations pour ce profil
      await setProfilePermissions(String(profile._id), profileData.permissions);
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