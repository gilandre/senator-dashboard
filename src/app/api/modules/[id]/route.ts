import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Module, { IModule } from '@/models/Module';
import Permission from '@/models/Permission';
import { connectToDatabase } from '@/lib/mongodb';

// GET /api/modules/[id] - Récupérer un module par ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { error: 'ID de module invalide' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Conversion du type pour éviter les erreurs TypeScript
    const moduleData = await (Module as any).findById(id).lean();
    
    if (!moduleData) {
      return NextResponse.json(
        { error: 'Module non trouvé' },
        { status: 404 }
      );
    }
    
    // Utiliser un cast explicite pour id
    const moduleObj = moduleData as any;
    
    return NextResponse.json({
      id: moduleObj._id.toString(),
      name: moduleObj.name,
      description: moduleObj.description,
      functions: moduleObj.functions.map((fn: any) => ({
        name: fn.name,
        description: fn.description
      })),
      order: moduleObj.order,
      createdAt: moduleObj.createdAt ? moduleObj.createdAt.toISOString() : null,
      updatedAt: moduleObj.updatedAt ? moduleObj.updatedAt.toISOString() : null
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du module:', error);
    
    if (error instanceof mongoose.Error || error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Une erreur s\'est produite lors de la récupération du module' },
      { status: 500 }
    );
  }
}

// PUT /api/modules/[id] - Mettre à jour un module
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { error: 'ID de module invalide' },
        { status: 400 }
      );
    }
    
    // Valider les données reçues
    if (!body.name && !body.description && !body.functions && body.order === undefined) {
      return NextResponse.json(
        { error: 'Aucune donnée fournie pour la mise à jour' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Vérifier si le module existe
    const existingModule = await (Module as any).findById(id);
    
    if (!existingModule) {
      return NextResponse.json(
        { error: 'Module non trouvé' },
        { status: 404 }
      );
    }
    
    // Vérifier si le nouveau nom n'est pas déjà utilisé par un autre module
    if (body.name && body.name !== existingModule.name) {
      const moduleWithSameName = await (Module as any).findOne({ 
        name: body.name,
        _id: { $ne: id }
      });
      
      if (moduleWithSameName) {
        return NextResponse.json(
          { error: 'Un module avec ce nom existe déjà' },
          { status: 409 }
        );
      }
    }
    
    // Mettre à jour le module
    const updatedFields: any = {};
    
    if (body.name) updatedFields.name = body.name;
    if (body.description) updatedFields.description = body.description;
    if (body.functions) updatedFields.functions = body.functions;
    if (body.order !== undefined) updatedFields.order = body.order;
    
    const updatedModule = await (Module as any).findByIdAndUpdate(
      id,
      { $set: updatedFields },
      { new: true, runValidators: true }
    ).lean();
    
    if (!updatedModule) {
      return NextResponse.json(
        { error: 'Échec de la mise à jour du module' },
        { status: 500 }
      );
    }
    
    // Cast explicite pour éviter les erreurs TypeScript
    const moduleObj = updatedModule as any;
    
    return NextResponse.json({
      id: moduleObj._id.toString(),
      name: moduleObj.name,
      description: moduleObj.description,
      functions: moduleObj.functions.map((fn: any) => ({
        name: fn.name,
        description: fn.description
      })),
      order: moduleObj.order,
      createdAt: moduleObj.createdAt ? moduleObj.createdAt.toISOString() : null,
      updatedAt: moduleObj.updatedAt ? moduleObj.updatedAt.toISOString() : null
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du module:', error);
    
    if (error instanceof mongoose.Error || error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Une erreur s\'est produite lors de la mise à jour du module' },
      { status: 500 }
    );
  }
}

// DELETE /api/modules/[id] - Supprimer un module
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { error: 'ID de module invalide' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Vérifier si le module existe
    const moduleItem = await (Module as any).findById(id);
    
    if (!moduleItem) {
      return NextResponse.json(
        { error: 'Module non trouvé' },
        { status: 404 }
      );
    }
    
    // Vérifier si des permissions font référence à ce module
    const permissionsWithModule = await (Permission as any).countDocuments({ moduleName: moduleItem.name });
    
    if (permissionsWithModule > 0) {
      return NextResponse.json(
        { error: 'Ce module est référencé par des permissions et ne peut pas être supprimé' },
        { status: 400 }
      );
    }
    
    // Supprimer le module
    await (Module as any).findByIdAndDelete(id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur lors de la suppression du module:', error);
    
    if (error instanceof mongoose.Error || error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Une erreur s\'est produite lors de la suppression du module' },
      { status: 500 }
    );
  }
} 