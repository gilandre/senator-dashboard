import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/role-utils";

/**
 * POST /api/reference-data/sync - Synchroniser les rôles avec les données de référence
 */
export async function POST(req: NextRequest) {
  try {
    // Vérifier l'authentification et les permissions
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Vérifier si l'utilisateur est admin
    if (!isAdmin(session.user as any)) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
    }

    // Récupérer les rôles depuis la table roles
    const roles = await prisma.roles.findMany({
      where: { is_active: true }
    });

    console.log("Synchronisation des rôles - Rôles trouvés:", roles);

    // Pour chaque rôle, vérifier s'il existe dans reference_data
    let created = 0;
    let updated = 0;

    // Exécuter dans une transaction pour garantir la cohérence des données
    await prisma.$transaction(async (tx) => {
      for (const role of roles) {
        // Vérifier si le rôle existe déjà dans reference_data avec SQL brut
        const existingRefData = await tx.$queryRaw`
          SELECT id FROM reference_data 
          WHERE type = 'role' AND code = ${role.name} AND module = 'users'
          LIMIT 1
        `;

        if (Array.isArray(existingRefData) && existingRefData.length > 0) {
          // Mettre à jour l'entrée existante avec SQL brut
          await tx.$executeRaw`
            UPDATE reference_data 
            SET 
              value = ${role.name},
              display_name = ${role.name.charAt(0).toUpperCase() + role.name.slice(1)},
              description = ${role.description || null},
              is_active = ${role.is_active || true}
            WHERE id = ${(existingRefData[0] as any).id}
          `;
          updated++;
        } else {
          // Créer une nouvelle entrée avec SQL brut
          const colorCode = role.name === 'admin' 
            ? 'bg-blue-100 text-blue-800' 
            : (role.name === 'user' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800');
          
          const iconName = role.name === 'admin'
            ? 'Shield'
            : (role.name === 'user' ? 'User' : 'CircleUser');
          
          await tx.$executeRaw`
            INSERT INTO reference_data (
              type, code, value, display_name, description, module, 
              is_active, sort_order, color_code, icon_name, created_at
            ) VALUES (
              'role', ${role.name}, ${role.name}, 
              ${role.name.charAt(0).toUpperCase() + role.name.slice(1)},
              ${role.description || null}, 'users', 
              ${role.is_active || true}, 0, ${colorCode}, ${iconName}, NOW()
            )
          `;
          created++;
        }
      }

      // Synchronisation inverse: vérifier si des données de référence ne sont pas synchronisées avec les rôles
      const refDataRoles = await tx.$queryRaw`
        SELECT id, code, display_name, description, is_active
        FROM reference_data
        WHERE type = 'role' AND module = 'users' AND is_active = 1
      `;

      if (Array.isArray(refDataRoles)) {
        for (const refDataRole of refDataRoles) {
          // Vérifier si le rôle existe
          const existingRole = await tx.$queryRaw`
            SELECT id FROM roles WHERE name = ${refDataRole.code} LIMIT 1
          `;

          if (!Array.isArray(existingRole) || existingRole.length === 0) {
            // Créer un nouveau rôle à partir des données de référence
            await tx.$executeRaw`
              INSERT INTO roles (name, description, is_active)
              VALUES (
                ${refDataRole.code},
                ${refDataRole.description || refDataRole.display_name},
                ${refDataRole.is_active || true}
              )
            `;
            created++;
          }
        }
      }

      // Synchroniser les utilisateurs: mettre à jour le champ role basé sur role_id
      const usersWithRoleId = await tx.$queryRaw`
        SELECT u.id, u.role, r.name as role_name
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.role_id IS NOT NULL
      `;

      if (Array.isArray(usersWithRoleId)) {
        for (const user of usersWithRoleId) {
          if (user.role !== user.role_name) {
            try {
              // Mettre à jour le champ enum role pour correspondre au role_id
              await tx.$executeRaw`
                UPDATE users 
                SET role = ${user.role_name}
                WHERE id = ${user.id}
              `;
            } catch (err) {
              console.error(`Erreur lors de la mise à jour du rôle pour l'utilisateur ${user.id}:`, err);
            }
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `Synchronisation terminée: ${created} éléments créés, ${updated} éléments mis à jour`,
      created,
      updated
    });
  } catch (error) {
    console.error("Erreur lors de la synchronisation des rôles:", error);
    return NextResponse.json(
      { error: "Erreur lors de la synchronisation des rôles" },
      { status: 500 }
    );
  }
} 