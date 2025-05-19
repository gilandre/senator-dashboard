import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Type pour les fonctions d'un module
interface IModuleFunction {
  name: string;
  description: string;
}

// GET /api/modules - Récupérer tous les modules
export async function GET() {
  try {
    const modules = await prisma.modules.findMany({
      orderBy: { order: 'asc' }
    });
    
    // Convertir les dates et les fonctions pour la sérialisation JSON
    const formattedModules = modules.map((module) => ({
      id: module.id.toString(),
      name: module.name,
      description: module.description,
      functions: module.functions ? JSON.parse(module.functions.toString()) as IModuleFunction[] : [],
      order: module.order,
      createdAt: module.created_at ? module.created_at.toISOString() : null,
      updatedAt: module.updated_at ? module.updated_at.toISOString() : null
    }));
    
    return NextResponse.json(formattedModules);
  } catch (error) {
    console.error('Erreur lors de la récupération des modules:', error);
    
    return NextResponse.json(
      { error: 'Une erreur s\'est produite lors de la récupération des modules' },
      { status: 500 }
    );
  }
}

// POST /api/modules - Créer un nouveau module
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Valider les données reçues
    if (!body.name || !body.description) {
      return NextResponse.json(
        { error: 'Les champs nom et description sont requis' },
        { status: 400 }
      );
    }
    
    // Vérifier si le nom existe déjà
    const existingModule = await prisma.modules.findUnique({
      where: { name: body.name }
    });
    
    if (existingModule) {
      return NextResponse.json(
        { error: 'Un module avec ce nom existe déjà' },
        { status: 409 }
      );
    }
    
    // Déterminer l'ordre (à la fin par défaut)
    const maxOrderModule = await prisma.modules.findFirst({
      orderBy: { order: 'desc' }
    });
    
    const nextOrder = maxOrderModule ? maxOrderModule.order + 1 : 0;
    
    // Créer un nouveau module
    const newModule = await prisma.modules.create({
      data: {
        name: body.name,
        description: body.description,
        functions: body.functions ? JSON.stringify(body.functions) : '[]',
        order: body.order !== undefined ? body.order : nextOrder,
        created_at: new Date(),
        updated_at: new Date()
      }
    });
    
    return NextResponse.json(
      { 
        id: newModule.id.toString(),
        name: newModule.name,
        description: newModule.description,
        functions: newModule.functions ? JSON.parse(newModule.functions.toString()) : [],
        order: newModule.order,
        createdAt: newModule.created_at ? newModule.created_at.toISOString() : new Date().toISOString(),
        updatedAt: newModule.updated_at ? newModule.updated_at.toISOString() : new Date().toISOString()
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erreur lors de la création du module:', error);
    
    return NextResponse.json(
      { error: 'Une erreur s\'est produite lors de la création du module' },
      { status: 500 }
    );
  }
}