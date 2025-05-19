import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// DELETE /api/holidays/[id] - Supprimer un jour férié par ID
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID invalide' },
        { status: 400 }
      );
    }
    
    // Vérifier si le jour férié existe
    const holiday = await prisma.holidays.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!holiday) {
      return NextResponse.json(
        { error: 'Jour férié non trouvé' },
        { status: 404 }
      );
    }
    
    // Supprimer le jour férié
    await prisma.holidays.delete({
      where: { id: parseInt(id) }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur lors de la suppression du jour férié:', error);
    
    return NextResponse.json(
      { error: 'Une erreur s\'est produite lors de la suppression du jour férié' },
      { status: 500 }
    );
  }
} 