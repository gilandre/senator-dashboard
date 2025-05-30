import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/profiles/:id/permissions - Récupérer les permissions d'un profil
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID de profil invalide" }, { status: 400 });
    }

    // Vérifier si le profil existe
    const profile = await prisma.profile.findUnique({
      where: { id },
      include: {
        profile_permissions: {
          include: {
            permission: true
          }
        }
      }
    });

    if (!profile) {
      return NextResponse.json({ error: "Profil non trouvé" }, { status: 404 });
    }

    // Extraire et formater les permissions
    const permissions = profile.profile_permissions.map(pp => pp.permission);

    return NextResponse.json(permissions);
  } catch (error) {
    console.error("Erreur lors de la récupération des permissions:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des permissions" },
      { status: 500 }
    );
  }
}

// POST /api/profiles/:id/permissions - Ajouter des permissions à un profil
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  return NextResponse.json({
    error: "Fonctionnalité en cours d'implémentation",
    message: "Cette route est en cours de migration de MongoDB vers Prisma/MySQL"
  }, { status: 501 }); // 501 Not Implemented
}

// DELETE /api/profiles/:id/permissions - Supprimer des permissions d'un profil
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  return NextResponse.json({
    error: "Fonctionnalité en cours d'implémentation",
    message: "Cette route est en cours de migration de MongoDB vers Prisma/MySQL"
  }, { status: 501 }); // 501 Not Implemented
} 