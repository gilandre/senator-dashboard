import Module from '@/models/Module';
import { connectToDatabase } from './mongodb';

const defaultModules = [
  {
    name: "Tableau de bord",
    description: "Accès au tableau de bord de l'application",
    order: 1,
    functions: [
      {
        name: "Statistiques générales",
        description: "Visualisation des statistiques générales"
      },
      {
        name: "Tendances d'accès",
        description: "Visualisation des tendances d'accès"
      },
      {
        name: "Alertes",
        description: "Gestion des alertes"
      }
    ]
  },
  {
    name: "Accès",
    description: "Gestion des accès au système",
    order: 2,
    functions: [
      {
        name: "Gestion des accès",
        description: "Création et modification des accès"
      },
      {
        name: "Historique des accès",
        description: "Consultation de l'historique des accès"
      },
      {
        name: "Anomalies d'accès",
        description: "Gestion des anomalies d'accès"
      }
    ]
  },
  {
    name: "Rapports",
    description: "Gestion des rapports",
    order: 3,
    functions: [
      {
        name: "Génération de rapports",
        description: "Création de rapports personnalisés"
      },
      {
        name: "Exportation de données",
        description: "Exportation des données vers différents formats"
      },
      {
        name: "Planification de rapports",
        description: "Planification de rapports récurrents"
      }
    ]
  },
  {
    name: "Utilisateurs",
    description: "Gestion des utilisateurs",
    order: 4,
    functions: [
      {
        name: "Gestion des utilisateurs",
        description: "Création et modification des utilisateurs"
      },
      {
        name: "Réinitialisation de mot de passe",
        description: "Réinitialisation des mots de passe utilisateurs"
      },
      {
        name: "Audit utilisateurs",
        description: "Suivi des activités utilisateurs"
      }
    ]
  },
  {
    name: "Configuration",
    description: "Configuration du système",
    order: 5,
    functions: [
      {
        name: "Paramètres généraux",
        description: "Configuration des paramètres généraux"
      },
      {
        name: "Profils et permissions",
        description: "Gestion des profils et permissions"
      },
      {
        name: "Données de référence",
        description: "Gestion des données de référence"
      },
      {
        name: "Calendrier de travail",
        description: "Configuration du calendrier de travail"
      }
    ]
  }
];

export async function initModules() {
  try {
    await connectToDatabase();
    
    console.log('Vérification des modules existants...');
    
    let modulesCreated = 0;
    
    // Parcourir les modules par défaut
    for (const moduleData of defaultModules) {
      // Vérifier si le module existe déjà
      const existingModule = await Module.findOne({ name: moduleData.name });
      
      if (!existingModule) {
        // Créer le module s'il n'existe pas
        await Module.create(moduleData);
        modulesCreated++;
        console.log(`Module "${moduleData.name}" créé avec succès`);
      } else {
        console.log(`Module "${moduleData.name}" existe déjà`);
      }
    }
    
    console.log(`Initialisation terminée: ${modulesCreated} modules créés`);
    
    return { success: true, modulesCreated };
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des modules:', error);
    throw error;
  }
} 