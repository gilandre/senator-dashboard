import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // Récupérer les profils
    const profiles = await prisma.profile.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        user_profiles: {
          select: {
            user_id: true,
          },
        },
      },
    });

    // Récupérer quelques utilisateurs pour vérifier les relations
    const users = await prisma.users.findMany({
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        user_profiles: {
          select: {
            profile_id: true,
            profile: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // Récupérer directement le nombre d'entrées dans la table user_profiles
    const userProfilesCount = await prisma.userProfile.count();

    // Récupérer quelques entrées de la table user_profiles
    const userProfiles = await prisma.userProfile.findMany({
      take: 10,
    });

    return NextResponse.json({
      profiles,
      users,
      userProfilesCount,
      userProfiles,
      databaseUrl: process.env.DATABASE_URL ? 'Set' : 'Not set',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Erreur lors du débogage:", error);
    
    let errorMessage = "Erreur lors du débogage";
    let errorDetails: string | null = null;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || null;
    }
    
    return NextResponse.json(
      { error: errorMessage, details: errorDetails },
      { status: 500 }
    );
  }
} 