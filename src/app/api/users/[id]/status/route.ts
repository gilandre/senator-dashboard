import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AuthLogger } from "@/lib/auth-logger";
import * as z from "zod";

// Schéma de validation pour la mise à jour du statut
const statusUpdateSchema = z.object({
  status: z.enum(["active", "inactive", "suspended"]),
  reason: z.string().optional(),
});

/**
 * PUT /api/users/[id]/status - Mettre à jour le statut d'un utilisateur
 */
export async function PUT(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Vérifier si l'utilisateur connecté est administrateur
    const currentUser = await prisma.users.findUnique({
      where: { id: parseInt(session.user.id) },
      select: { role: true },
    });

    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json(
        { error: "Seuls les administrateurs peuvent modifier le statut des utilisateurs" },
        { status: 403 }
      );
    }

    // Utiliser params.id de manière sûre
    const params = context.params;
    const id = params.id;
    const userId = parseInt(id);
    
    if (isNaN(userId)) {
      return NextResponse.json({ error: "ID utilisateur invalide" }, { status: 400 });
    }

    // Vérifier si l'utilisateur existe
    const userExists = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
      },
    });

    if (!userExists) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // Empêcher la modification de son propre statut
    if (userId === parseInt(session.user.id)) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas modifier votre propre statut" },
        { status: 403 }
      );
    }

    // Extraire et valider les données
    const body = await req.json();
    const validationResult = statusUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { status, reason } = validationResult.data;

    // Si aucun changement de statut n'est nécessaire
    if (userExists.status === status) {
      return NextResponse.json({
        message: `L'utilisateur est déjà ${status === "active" ? "actif" : status === "inactive" ? "inactif" : "suspendu"}`,
        user: {
          id: userExists.id.toString(),
          name: userExists.name,
          email: userExists.email,
          status: userExists.status,
        },
      });
    }

    // Mettre à jour le statut de l'utilisateur
    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: { status },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
      },
    });

    // Créer un incident de sécurité pour la journalisation du changement de statut
    await prisma.securityIncident.create({
      data: {
        type: "user_status_change",
        description: `Statut de l'utilisateur ${userExists.name} (${userExists.email}) modifié de ${userExists.status} à ${status}${reason ? ` pour la raison: ${reason}` : ""}`,
        user_id: parseInt(session.user.id),
        status: "info",
        occurred_at: new Date(),
      },
    });

    // Journaliser l'action de changement de statut
    await AuthLogger.logUserStatusChange(
      parseInt(session.user.id),
      userId,
      status
    );

    return NextResponse.json({
      message: `Statut de l'utilisateur mis à jour avec succès`,
      user: {
        id: updatedUser.id.toString(),
        name: updatedUser.name,
        email: updatedUser.email,
        status: updatedUser.status,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du statut de l'utilisateur:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du statut de l'utilisateur" },
      { status: 500 }
    );
  }
} 