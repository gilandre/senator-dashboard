import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/permissions/:id - Récupérer une permission spécifique
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID de permission invalide' }, { status: 400 });
    }
    
    const permission = await prisma.permission.findUnique({
      where: { id }
    });
    
    if (!permission) {
      return NextResponse.json({ error: 'Permission non trouvée' }, { status: 404 });
    }
    
    return NextResponse.json(permission);
  } catch (error) {
    console.error('Erreur lors de la récupération de la permission:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT /api/permissions/:id - Mettre à jour une permission
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    
    // Vérifier si l'utilisateur est un administrateur
    const user = await prisma.user.findUnique({
      where: { email: session.user?.email || '' }
    });
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès restreint. Permissions administrateur requises.' }, { status: 403 });
    }
    
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID de permission invalide' }, { status: 400 });
    }
    
    // Vérifier si la permission existe
    const existingPermission = await prisma.permission.findUnique({
      where: { id }
    });
    
    if (!existingPermission) {
      return NextResponse.json({ error: 'Permission non trouvée' }, { status: 404 });
    }
    
    const data = await request.json();
    
    // Valider les champs requis
    if (!data.name) {
      return NextResponse.json({ error: 'Nom de permission requis' }, { status: 400 });
    }
    
    // Mettre à jour la permission
    const updatedPermission = await prisma.permission.update({
      where: { id },
      data: {
        name: data.name,
        updated_at: new Date()
      }
    });
    
    return NextResponse.json({ 
      permission: updatedPermission,
      message: 'Permission mise à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la permission:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE /api/permissions/:id - Supprimer une permission
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    
    // Vérifier si l'utilisateur est un administrateur
    const user = await prisma.user.findUnique({
      where: { email: session.user?.email || '' }
    });
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès restreint. Permissions administrateur requises.' }, { status: 403 });
    }
    
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID de permission invalide' }, { status: 400 });
    }
    
    // Vérifier si la permission existe
    const existingPermission = await prisma.permission.findUnique({
      where: { id }
    });
    
    if (!existingPermission) {
      return NextResponse.json({ error: 'Permission non trouvée' }, { status: 404 });
    }
    
    // Vérifier si la permission est utilisée par des profils
    const profilePermissionCount = await prisma.profilePermission.count({
      where: { permission_id: id }
    });
    
    if (profilePermissionCount > 0) {
      return NextResponse.json({ 
        error: 'Cette permission est utilisée par un ou plusieurs profils',
        count: profilePermissionCount
      }, { status: 409 });
    }
    
    // Supprimer la permission
    await prisma.permission.delete({
      where: { id }
    });
    
    return NextResponse.json({ 
      success: true,
      message: 'Permission supprimée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de la permission:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
} 