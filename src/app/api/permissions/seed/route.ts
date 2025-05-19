import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isAdmin, CustomSession } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Permission from '@/models/Permission';

// Définition de la structure de navigation pour le système de permissions
const navigationStructure = [
  {
    name: 'Tableau de bord',
    code: 'dashboard',
    isModule: true,
    isFunction: false,
  },
  {
    name: 'Assiduité',
    code: 'attendance',
    isModule: true,
    isFunction: false,
    children: [
      {
        name: 'Liste des présences',
        code: 'attendance_list',
        isModule: false,
        isFunction: true,
      },
      {
        name: 'Importation CSV',
        code: 'attendance_import',
        isModule: false,
        isFunction: true,
      },
      {
        name: 'Exportation Excel',
        code: 'attendance_export',
        isModule: false,
        isFunction: true,
      }
    ]
  },
  {
    name: 'Accès',
    code: 'access',
    isModule: true,
    isFunction: false,
    children: [
      {
        name: 'Logs d\'accès',
        code: 'access_logs',
        isModule: false,
        isFunction: true,
      }
    ]
  },
  {
    name: 'Paramètres',
    code: 'settings',
    isModule: true,
    isFunction: false,
    children: [
      {
        name: 'Utilisateurs',
        code: 'users',
        isModule: false,
        isFunction: true,
      },
      {
        name: 'Contrôle d\'accès',
        code: 'access_control',
        isModule: false,
        isFunction: true,
        children: [
          {
            name: 'Profils',
            code: 'profiles',
            isModule: false,
            isFunction: true,
          },
          {
            name: 'Permissions',
            code: 'permissions',
            isModule: false,
            isFunction: true,
          }
        ]
      },
      {
        name: 'Calendrier de travail',
        code: 'work_calendar',
        isModule: false,
        isFunction: true,
      }
    ]
  }
];

// Fonction pour traiter la structure de navigation récursivement
async function processNavItem(item: any, parentModule?: string) {
  try {
    // Vérifier si la permission existe déjà
    const existingPermission = await Permission.findOne({ code: item.code });
    
    if (existingPermission) {
      return { status: 'skipped', code: item.code };
    } else {
      // Créer la permission
      const permissionData = {
        name: item.name,
        code: item.code,
        isModule: item.isModule,
        isFunction: item.isFunction,
        parentModule: parentModule || '',
        canView: true,
        canCreate: !item.isModule,
        canEdit: !item.isModule,
        canDelete: !item.isModule,
        canApprove: false,
        canExport: false
      };
      
      await Permission.create(permissionData);
      return { status: 'created', code: item.code };
    }
  } catch (error) {
    console.error(`Erreur lors du traitement de ${item.code}:`, error);
    return { status: 'error', code: item.code, error: error instanceof Error ? error.message : 'Erreur inconnue' };
  }
}

// Fonction récursive pour traiter tous les éléments et leurs enfants
async function processStructure(items: any[], created: string[], skipped: string[], errors: string[], results: any[], parentModule?: string) {
  for (const item of items) {
    const result = await processNavItem(item, parentModule);
    results.push(result);
    
    if (result.status === 'created') {
      created.push(item.code);
    } else if (result.status === 'skipped') {
      skipped.push(item.code);
    } else if (result.status === 'error') {
      errors.push(`${item.code}: ${result.error}`);
    }
    
    // Traiter les enfants si présents
    if (item.children && item.children.length > 0) {
      const parent = item.isModule ? item.name : parentModule;
      await processStructure(item.children, created, skipped, errors, results, parent);
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    // Vérifier l'authentification et les droits d'administrateur
    const session = await getServerSession(authOptions) as CustomSession;
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    // Récupérer les options de l'initialisation
    const { clearExisting } = await req.json();

    // Connexion à la base de données
    await connectToDatabase();

    // Si demandé, supprimer toutes les permissions existantes
    if (clearExisting) {
      await Permission.deleteMany({});
    }

    const created: string[] = [];
    const skipped: string[] = [];
    const errors: string[] = [];
    const results: any[] = [];

    // Traiter tous les éléments de navigation
    await processStructure(navigationStructure, created, skipped, errors, results);

    return NextResponse.json({
      success: true,
      stats: {
        created: created.length,
        skipped: skipped.length,
        errors: errors.length
      },
      details: {
        created,
        skipped,
        errors
      }
    });
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des permissions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Une erreur interne est survenue' },
      { status: 500 }
    );
  }
}