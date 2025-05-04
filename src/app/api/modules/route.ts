import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Module, { IModule } from '@/models/Module';
import { connectToDatabase } from '@/lib/mongodb';

// GET /api/modules - Récupérer tous les modules
export async function GET() {
  try {
    await connectToDatabase();
    
    const modules = await (Module as any).find().sort({ order: 1 }).lean();
    
    // Convertir les dates en format ISO pour la sérialisation JSON
    const formattedModules = modules.map((module: any) => ({
      id: module._id.toString(),
      name: module.name,
      description: module.description,
      functions: module.functions.map((fn: any) => ({
        name: fn.name,
        description: fn.description
      })),
      order: module.order,
      createdAt: module.createdAt ? module.createdAt.toISOString() : null,
      updatedAt: module.updatedAt ? module.updatedAt.toISOString() : null
    }));
    
    return NextResponse.json(formattedModules);
  } catch (error) {
    console.error('Erreur lors de la récupération des modules:', error);
    
    if (error instanceof mongoose.Error || error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
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
    
    await connectToDatabase();
    
    // Vérifier si le nom existe déjà
    const existingModule = await (Module as any).findOne({ name: body.name });
    
    if (existingModule) {
      return NextResponse.json(
        { error: 'Un module avec ce nom existe déjà' },
        { status: 409 }
      );
    }
    
    // Déterminer l'ordre (à la fin par défaut)
    const maxOrderModule = await (Module as any).findOne().sort({ order: -1 }).lean();
    const maxOrderObj = maxOrderModule as any;
    const nextOrder = maxOrderObj ? (maxOrderObj.order || 0) + 1 : 0;
    
    // Créer un nouveau module
    const newModule = new Module({
      name: body.name,
      description: body.description,
      functions: body.functions || [],
      order: body.order !== undefined ? body.order : nextOrder,
    });
    
    // Sauvegarder dans la base de données
    await newModule.save();
    
    return NextResponse.json(
      { 
        id: String(newModule._id),
        name: newModule.name,
        description: newModule.description,
        functions: newModule.functions.map((fn: any) => ({
          name: fn.name,
          description: fn.description
        })),
        order: newModule.order,
        createdAt: newModule.createdAt ? newModule.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: newModule.updatedAt ? newModule.updatedAt.toISOString() : new Date().toISOString()
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erreur lors de la création du module:', error);
    
    if (error instanceof mongoose.Error || error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Une erreur s\'est produite lors de la création du module' },
      { status: 500 }
    );
  }
} 