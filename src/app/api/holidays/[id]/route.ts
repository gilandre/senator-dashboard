import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Holiday from '@/models/Holiday';
import { connectToDatabase } from '@/lib/mongodb';

// DELETE /api/holidays/[id] - Supprimer un jour férié par ID
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'ID invalide' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Rechercher et supprimer le jour férié
    const result = await Holiday.findByIdAndDelete(id);
    
    if (!result) {
      return NextResponse.json(
        { error: 'Jour férié non trouvé' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur lors de la suppression du jour férié:', error);
    
    if (error instanceof mongoose.Error || error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Une erreur s\'est produite lors de la suppression du jour férié' },
      { status: 500 }
    );
  }
} 