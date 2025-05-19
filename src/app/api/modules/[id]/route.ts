import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Type pour les fonctions d'un module
interface IModuleFunction {
  name: string;
  description: string;
}

// GET /api/modules/[id] - Récupérer un module par ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Vérifier que l'ID est un nombre
    const moduleId = parseInt(id);
    if (isNaN(moduleId)) {
      return NextResponse.json(
        { error: 'ID de module invalide' },
        { status: 400 }
      );
    }
    
    // Récupérer le module
    const moduleData = await prisma.modules.findUnique({
      where: { id: moduleId }
    });
    
    if (!moduleData) {
      return NextResponse.json(
        { error: 'Module non trouvé' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      id: moduleData.id.toString(),
      name: moduleData.name,
      description: moduleData.description,
      functions: moduleData.functions ? JSON.parse(moduleData.functions.toString()) as IModuleFunction[] : [],
      order: moduleData.order,
      createdAt: moduleData.created_at ? moduleData.created_at.toISOString() : null,
      updatedAt: moduleData.updated_at ? moduleData.updated_at.toISOString() : null
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du module:', error);
    
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
    
    // Vérifier que l'ID est un nombre
    const moduleId = parseInt(id);
    if (isNaN(moduleId)) {
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
    
    // Vérifier si le module existe
    const existingModule = await prisma.modules.findUnique({
      where: { id: moduleId }
    });
    
    if (!existingModule) {
      return NextResponse.json(
        { error: 'Module non trouvé' },
        { status: 404 }
      );
    }
    
    // Vérifier si le nouveau nom n'est pas déjà utilisé par un autre module
    if (body.name && body.name !== existingModule.name) {
      const moduleWithSameName = await prisma.modules.findFirst({
        where: {
          name: body.name,
          id: { not: moduleId }
        }
      });
      
      if (moduleWithSameName) {
        return NextResponse.json(
          { error: 'Un module avec ce nom existe déjà' },
          { status: 409 }
        );
      }
    }
    
    // Mettre à jour le module
    const updatedModule = await prisma.modules.update({
      where: { id: moduleId },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.description && { description: body.description }),
        ...(body.functions && { functions: JSON.stringify(body.functions) }),
        ...(body.order !== undefined && { order: body.order }),
        updated_at: new Date()
      }
    });
    
    return NextResponse.json({
      id: updatedModule.id.toString(),
      name: updatedModule.name,
      description: updatedModule.description,
      functions: updatedModule.functions ? JSON.parse(updatedModule.functions.toString()) as IModuleFunction[] : [],
      order: updatedModule.order,
      createdAt: updatedModule.created_at ? updatedModule.created_at.toISOString() : null,
      updatedAt: updatedModule.updated_at ? updatedModule.updated_at.toISOString() : null
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du module:', error);
    
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
    
    // Vérifier que l'ID est un nombre
    const moduleId = parseInt(id);
    if (isNaN(moduleId)) {
      return NextResponse.json(
        { error: 'ID de module invalide' },
        { status: 400 }
      );
    }
    
    // Vérifier si le module existe
    const moduleItem = await prisma.modules.findUnique({
      where: { id: moduleId }
    });
    
    if (!moduleItem) {
      return NextResponse.json(
        { error: 'Module non trouvé' },
        { status: 404 }
      );
    }
    
    // Vérifier si des permissions font référence à ce module
    const permissionsWithModule = await prisma.permission.count({
      where: {
        module: moduleItem.name
      }
    });
    
    if (permissionsWithModule > 0) {
      return NextResponse.json(
        { 
          error: 'Ce module ne peut pas être supprimé car des permissions y font référence',
          permissionsCount: permissionsWithModule
        },
        { status: 400 }
      );
    }
    
    // Supprimer le module
    await prisma.modules.delete({
      where: { id: moduleId }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur lors de la suppression du module:', error);
    
    return NextResponse.json(
      { error: 'Une erreur s\'est produite lors de la suppression du module' },
      { status: 500 }
    );
  }
} 