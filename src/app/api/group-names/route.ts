import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // Bypass d'authentification pour les tests en développement
    const bypassAuth = process.env.NODE_ENV === 'development' && 
                      req.headers.get('x-test-bypass-auth') === 'admin';
    
    if (!bypassAuth) {
      const session = await getServerSession(authOptions);
      
      if (!session) {
        return NextResponse.json(
          { error: "Non autorisé" },
          { status: 401 }
        );
      }
    }
    
    // Récupérer les groupes depuis la base de données
    const groups = await prisma.$queryRaw<{id: number, name: string}[]>`
      SELECT id, name FROM group_name ORDER BY name
    `;
    
    return NextResponse.json(groups);
  } catch (error) {
    console.error("[API] Error fetching group names:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des noms de groupes" },
      { status: 500 }
    );
  }
} 