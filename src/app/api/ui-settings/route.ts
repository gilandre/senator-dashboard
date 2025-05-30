import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

// Schéma de validation pour les paramètres d'interface
const uiSettingSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
  type: z.enum(["string", "json", "boolean", "number"]).default("string"),
  scope: z.enum(["global", "user", "role", "module"]).default("global"),
  module: z.string().optional(),
  user_id: z.number().optional()
});

/**
 * GET /api/ui-settings - Récupérer les paramètres d'interface
 */
export async function GET(req: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Récupérer les paramètres de la requête
    const url = new URL(req.url);
    const key = url.searchParams.get('key');
    const scope = url.searchParams.get('scope');
    const module = url.searchParams.get('module');
    const userId = url.searchParams.get('user_id');

    // Construire la requête
    const where: any = {};
    if (key) where.key = key;
    if (scope) where.scope = scope;
    if (module) where.module = module;
    if (userId) where.user_id = parseInt(userId);

    // Récupérer les paramètres pour l'utilisateur actuel si scope=user et user_id non spécifié
    if (scope === 'user' && !userId) {
      where.user_id = parseInt(session.user.id);
    }

    // Récupérer les paramètres
    const settings = await prisma.ui_settings.findMany({
      where,
      orderBy: { key: 'asc' }
    });

    // Transformer les valeurs en fonction du type
    const formattedSettings = settings.map(setting => {
      let parsedValue = setting.value;
      
      if (setting.type === 'json') {
        try {
          parsedValue = JSON.parse(setting.value);
        } catch (e) {
          console.error(`Erreur lors du parsing de la valeur JSON pour ${setting.key}:`, e);
        }
      } else if (setting.type === 'boolean') {
        parsedValue = setting.value === 'true';
      } else if (setting.type === 'number') {
        parsedValue = Number(setting.value);
      }
      
      return {
        ...setting,
        value: parsedValue
      };
    });

    return NextResponse.json(formattedSettings);
  } catch (error) {
    console.error("Erreur lors de la récupération des paramètres d'interface:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des paramètres d'interface" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ui-settings - Créer ou mettre à jour un paramètre d'interface
 */
export async function POST(req: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Récupérer les données du corps de la requête
    const body = await req.json();
    
    // Valider les données
    const validationResult = uiSettingSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const { key, value, type, scope, module, user_id } = validationResult.data;
    
    // Vérifier les permissions pour les paramètres globaux
    if (scope === 'global' && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: "Seuls les administrateurs peuvent modifier les paramètres globaux" },
        { status: 403 }
      );
    }
    
    // Pour les paramètres utilisateur, s'assurer que l'utilisateur modifie ses propres paramètres
    // ou qu'il est administrateur
    if (scope === 'user' && user_id && user_id !== parseInt(session.user.id) && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: "Vous ne pouvez pas modifier les paramètres d'un autre utilisateur" },
        { status: 403 }
      );
    }
    
    // Formater la valeur selon le type
    let stringValue = value;
    if (typeof value !== 'string') {
      if (type === 'json') {
        stringValue = JSON.stringify(value);
      } else {
        stringValue = String(value);
      }
    }
    
    // Créer ou mettre à jour le paramètre
    const finalUserId = scope === 'user' ? (user_id || parseInt(session.user.id)) : null;
    
    const setting = await prisma.ui_settings.upsert({
      where: {
        unique_setting: {
          user_id: finalUserId,
          key,
          scope,
          module: module || null
        }
      },
      update: {
        value: stringValue,
        type,
        updated_at: new Date()
      },
      create: {
        user_id: finalUserId,
        key,
        value: stringValue,
        type,
        scope,
        module: module || null
      }
    });

    return NextResponse.json({
      message: "Paramètre d'interface enregistré avec succès",
      setting
    });
  } catch (error) {
    console.error("Erreur lors de l'enregistrement du paramètre d'interface:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement du paramètre d'interface" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/ui-settings - Supprimer un paramètre d'interface
 */
export async function DELETE(req: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Récupérer les paramètres de la requête
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: "ID du paramètre requis" }, { status: 400 });
    }
    
    // Récupérer le paramètre pour vérifier les permissions
    const setting = await prisma.ui_settings.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!setting) {
      return NextResponse.json({ error: "Paramètre non trouvé" }, { status: 404 });
    }
    
    // Vérifier les permissions
    if (setting.scope === 'global' && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: "Seuls les administrateurs peuvent supprimer les paramètres globaux" },
        { status: 403 }
      );
    }
    
    // Pour les paramètres utilisateur, s'assurer que l'utilisateur supprime ses propres paramètres
    if (setting.scope === 'user' && setting.user_id !== parseInt(session.user.id) && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: "Vous ne pouvez pas supprimer les paramètres d'un autre utilisateur" },
        { status: 403 }
      );
    }
    
    // Supprimer le paramètre
    await prisma.ui_settings.delete({
      where: { id: parseInt(id) }
    });

    return NextResponse.json({
      message: "Paramètre d'interface supprimé avec succès"
    });
  } catch (error) {
    console.error("Erreur lors de la suppression du paramètre d'interface:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du paramètre d'interface" },
      { status: 500 }
    );
  }
} 