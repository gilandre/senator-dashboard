import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/profiles/:id - Récupérer un profil spécifique
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`GET /api/profiles/${params.id} - Récupération d'un profil spécifique`);
    
    const session = await getServerSession(authOptions);
    if (!session) {
      console.log(`GET /api/profiles/${params.id} - Non autorisé (pas de session)`);
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      console.log(`GET /api/profiles/${params.id} - ID invalide`);
      return NextResponse.json({ error: 'ID de profil invalide' }, { status: 400 });
    }

    console.log(`GET /api/profiles/${id} - Recherche du profil`);
    
    // Récupérer le profil avec ses permissions
    try {
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
      
      console.log(`GET /api/profiles/${id} - Résultat:`, profile ? "Trouvé" : "Non trouvé");

      if (!profile) {
        // Tenter une recherche avec SQL brut
        console.log(`GET /api/profiles/${id} - Tentative avec SQL brut`);
        
        try {
          const rawProfile = await prisma.$queryRaw`
            SELECT id, name, description
            FROM profiles
            WHERE id = ${id}
          `;
          
          if (Array.isArray(rawProfile) && rawProfile.length > 0) {
            console.log(`GET /api/profiles/${id} - Profil trouvé via SQL brut`);
            return NextResponse.json({ profile: rawProfile[0] });
          }
          
          console.log(`GET /api/profiles/${id} - Profil non trouvé même via SQL brut`);
          return NextResponse.json({ error: 'Profil non trouvé' }, { status: 404 });
        } catch (sqlError) {
          console.error(`GET /api/profiles/${id} - Erreur SQL:`, sqlError);
          return NextResponse.json({ error: 'Profil non trouvé' }, { status: 404 });
        }
      }

      return NextResponse.json({ profile });
    } catch (prismaError) {
      console.error(`GET /api/profiles/${id} - Erreur Prisma:`, prismaError);
      
      // Créer un profil par défaut pour le développement
      if (process.env.NODE_ENV === 'development') {
        const defaultProfile = {
          id,
          name: id === 1 ? "Administrateur" : id === 2 ? "Opérateur" : "Utilisateur",
          description: "Profil par défaut généré suite à une erreur",
          profile_permissions: []
        };
        
        console.log(`GET /api/profiles/${id} - Renvoi d'un profil par défaut`);
        return NextResponse.json({ profile: defaultProfile });
      }
      
      throw prismaError;
    }
  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du profil' },
      { status: 500 }
    );
  }
}

// PUT /api/profiles/:id - Mettre à jour un profil
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  return NextResponse.json({
    error: "Fonctionnalité en cours d'implémentation",
    message: "Cette route est en cours de migration de MongoDB vers Prisma/MySQL"
  }, { status: 501 }); // 501 Not Implemented
}

// DELETE /api/profiles/:id - Supprimer un profil
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  return NextResponse.json({
    error: "Fonctionnalité en cours d'implémentation",
    message: "Cette route est en cours de migration de MongoDB vers Prisma/MySQL"
  }, { status: 501 }); // 501 Not Implemented
} 