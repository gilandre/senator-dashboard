import Profile from '@/models/Profile';
import Module from '@/models/Module';
import Permission from '@/models/Permission';
import { connectToDatabase } from './mongodb';

const defaultProfiles = [
  {
    name: "Administrateur",
    description: "Profil avec tous les accès au système",
    isAdmin: true,
    isDefault: false
  },
  {
    name: "Superviseur",
    description: "Profil pour les gestionnaires de l'application",
    isAdmin: false,
    isDefault: false
  },
  {
    name: "Opérateur",
    description: "Profil pour les utilisateurs standards",
    isAdmin: false,
    isDefault: true
  },
  {
    name: "Consultant",
    description: "Profil pour les utilisateurs en lecture seule",
    isAdmin: false,
    isDefault: false
  }
];

export async function initProfiles() {
  try {
    await connectToDatabase();
    
    console.log('Vérification des profils existants...');
    
    let profilesCreated = 0;
    
    // Parcourir les profils par défaut
    for (const profileData of defaultProfiles) {
      // Vérifier si le profil existe déjà
      const existingProfile = await Profile.findOne({ name: profileData.name });
      
      if (!existingProfile) {
        // Créer le profil s'il n'existe pas
        const newProfile = await Profile.create(profileData);
        profilesCreated++;
        console.log(`Profil "${profileData.name}" créé avec succès`);
        
        // Récupérer tous les modules pour créer les permissions
        const modules = await Module.find({});
        
        for (const moduleItem of modules) {
          const isAdmin = profileData.name === "Administrateur";
          const isConsultant = profileData.name === "Consultant";
          
          // Définir les permissions par défaut selon le profil
          const permission = {
            profileId: newProfile._id,
            moduleName: moduleItem.name,
            view: true,
            create: isAdmin || (profileData.name === "Superviseur" && !isConsultant),
            update: isAdmin || (profileData.name === "Superviseur" && !isConsultant),
            delete: isAdmin
          };
          
          // Si c'est un consultant, limiter aux droits de lecture uniquement
          if (isConsultant) {
            permission.create = false;
            permission.update = false;
            permission.delete = false;
          }
          
          // Créer la permission
          await Permission.create(permission);
          console.log(`Permission pour le module "${moduleItem.name}" créée pour le profil "${profileData.name}"`);
        }
      } else {
        console.log(`Profil "${profileData.name}" existe déjà`);
      }
    }
    
    console.log(`Initialisation terminée: ${profilesCreated} profils créés`);
    
    return { success: true, profilesCreated };
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des profils:', error);
    throw error;
  }
} 