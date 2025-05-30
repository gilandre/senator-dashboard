import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/visitors/:id - Récupérer un visiteur par ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
    }

    const visitor = await prisma.visitors.findUnique({
      where: { id }
    });

    if (!visitor) {
      return NextResponse.json({ error: 'Visiteur non trouvé' }, { status: 404 });
    }

    return NextResponse.json({
      id: visitor.id,
      badge_number: visitor.badge_number,
      first_name: visitor.first_name,
      last_name: visitor.last_name,
      company: visitor.company,
      reason: visitor.reason,
      status: visitor.status,
      access_count: visitor.access_count,
      first_seen: visitor.first_seen,
      last_seen: visitor.last_seen,
      created_at: visitor.created_at,
      updated_at: visitor.updated_at
    });
  } catch (error) {
    console.error('Error retrieving visitor:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT /api/visitors/:id - Mettre à jour un visiteur
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
    }

    const visitorData = await req.json();

    // Vérifier si le visiteur existe
    const existingVisitor = await prisma.visitors.findUnique({
      where: { id }
    });

    if (!existingVisitor) {
      return NextResponse.json({ error: 'Visiteur non trouvé' }, { status: 404 });
    }

    // Vérifier si le badge_number est déjà utilisé par un autre visiteur
    if (visitorData.badge_number !== existingVisitor.badge_number) {
      const badgeExists = await prisma.visitors.findFirst({
        where: {
          badge_number: visitorData.badge_number,
          id: { not: id }
        }
      });

      if (badgeExists) {
        return NextResponse.json(
          { error: 'Ce numéro de badge est déjà utilisé par un autre visiteur' },
          { status: 400 }
        );
      }
    }

    // Mettre à jour le visiteur
    const updatedVisitor = await prisma.visitors.update({
      where: { id },
      data: {
        badge_number: visitorData.badge_number,
        first_name: visitorData.first_name,
        last_name: visitorData.last_name,
        company: visitorData.company || null,
        reason: visitorData.reason || null,
        status: visitorData.status,
        updated_at: new Date()
      }
    });

    return NextResponse.json(updatedVisitor);
  } catch (error) {
    console.error('Error updating visitor:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE /api/visitors/:id - Supprimer un visiteur
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
    }

    // Vérifier si le visiteur existe
    const existingVisitor = await prisma.visitors.findUnique({
      where: { id }
    });

    if (!existingVisitor) {
      return NextResponse.json({ error: 'Visiteur non trouvé' }, { status: 404 });
    }

    // Supprimer le visiteur
    await prisma.visitors.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Visiteur supprimé avec succès' });
  } catch (error) {
    console.error('Error deleting visitor:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
} 