import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

/**
 * GET /api/reference-data - Récupérer les données de référence
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
    const type = url.searchParams.get('type');
    const module = url.searchParams.get('module');
    const feature = url.searchParams.get('feature');
    const active = url.searchParams.get('active') === 'true';
    
    console.log("GET /api/reference-data - Paramètres:", { type, module, feature, active });

    // Vérifier si la demande concerne les mots de passe par défaut
    if (type === 'default_password' && module === 'security') {
      // Récupérer les mots de passe par défaut depuis reference_data
      const defaultPasswords = await prisma.$queryRawUnsafe(`
        SELECT 
          id, code, value, display_name, description, type, module, feature,
          is_active, sort_order, color_code, icon_name, created_at, updated_at
        FROM reference_data
        WHERE type = 'default_password' AND module = 'security'
        ORDER BY sort_order ASC
      `);
      
      // Si aucun mot de passe par défaut n'existe, récupérer depuis security_settings
      if (!Array.isArray(defaultPasswords) || defaultPasswords.length === 0) {
        const securitySettings = await prisma.$queryRawUnsafe(`
          SELECT default_password FROM security_settings ORDER BY updated_at DESC LIMIT 1
        `);
        
        if (Array.isArray(securitySettings) && securitySettings.length > 0 && securitySettings[0].default_password) {
          // Créer une entrée dans reference_data
          await prisma.$executeRawUnsafe(`
            INSERT INTO reference_data 
            (code, value, display_name, description, type, module, is_active, sort_order, created_at, updated_at)
            VALUES 
            ('default', ?, 'Mot de passe par défaut', 'Mot de passe par défaut utilisé pour les nouveaux utilisateurs et réinitialisations', 'default_password', 'security', 1, 1, NOW(), NOW())
          `, securitySettings[0].default_password);
          
          // Récupérer à nouveau après la création
          const newDefaultPasswords = await prisma.$queryRawUnsafe(`
            SELECT 
              id, code, value, display_name, description, type, module, feature,
              is_active, sort_order, color_code, icon_name, created_at, updated_at
            FROM reference_data
            WHERE type = 'default_password' AND module = 'security'
            ORDER BY sort_order ASC
          `);
          
          return NextResponse.json(newDefaultPasswords);
        }
      }
      
      return NextResponse.json(defaultPasswords);
    }
    
    // Exécuter la requête SQL manuellement pour contourner les limitations de prisma
    let query = `
      SELECT 
        id, code, value, display_name, description, type, module, feature,
        is_active, sort_order, color_code, icon_name, created_at, updated_at
      FROM reference_data
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (type) {
      query += ` AND type = ?`;
      params.push(type);
    }
    
    if (module) {
      query += ` AND module = ?`;
      params.push(module);
    }
    
    if (feature) {
      query += ` AND feature = ?`;
      params.push(feature);
    }
    
    if (active !== undefined) {
      query += ` AND is_active = ?`;
      params.push(active);
    }
    
    query += ` ORDER BY type, module, sort_order ASC`;
    
    console.log("GET /api/reference-data - Requête SQL:", query);
    console.log("GET /api/reference-data - Paramètres SQL:", params);
    
    const referenceData = await prisma.$queryRawUnsafe(query, ...params);
    
    // Log des données de rôle pour déboguer
    if (type && type.includes('role')) {
      const roleData = Array.isArray(referenceData) 
        ? referenceData.filter((item: any) => item.type === 'role')
        : [];
      console.log("GET /api/reference-data - Données de rôle trouvées:", roleData);
    }

    return NextResponse.json({ 
      reference_data: referenceData 
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des données de référence:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des données de référence" },
      { status: 500 }
    );
  }
}

// Schéma de validation pour les données de référence
const referenceDataSchema = z.object({
  id: z.number().optional(),
  code: z.string().min(1).max(100),
  value: z.string().min(1).max(255),
  display_name: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  type: z.string().min(1).max(100),
  module: z.string().min(1).max(100),
  feature: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
  sort_order: z.number().default(0),
  color_code: z.string().optional().nullable(),
  icon_name: z.string().optional().nullable(),
});

/**
 * POST /api/reference-data - Créer une nouvelle donnée de référence
 */
export async function POST(req: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Vérifier si l'utilisateur est administrateur
    if (!isAdmin(session as any)) {
      return NextResponse.json(
        { error: "Accès réservé aux administrateurs" },
        { status: 403 }
      );
    }

    // Extraire et valider les données
    const body = await req.json();
    const validationResult = referenceDataSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const data = validationResult.data;
    const { id, ...createData } = data;

    // Vérifier si c'est un mot de passe par défaut
    const isDefaultPassword = data.type === 'default_password' && data.module === 'security';
    
    // Déterminer s'il s'agit d'une création ou d'une mise à jour
    if (id) {
      // Mise à jour
      const updatedItem = await prisma.$executeRawUnsafe(
        `UPDATE reference_data 
         SET code = ?, value = ?, display_name = ?, description = ?, 
             type = ?, module = ?, feature = ?, is_active = ?, 
             sort_order = ?, color_code = ?, icon_name = ?, updated_at = NOW()
         WHERE id = ?`,
        createData.code,
        createData.value,
        createData.display_name,
        createData.description,
        createData.type,
        createData.module,
        createData.feature,
        createData.is_active,
        createData.sort_order,
        createData.color_code,
        createData.icon_name,
        id
      );
      
      // Si c'est un mot de passe par défaut et qu'il est actif, mettre à jour security_settings
      if (isDefaultPassword && createData.is_active && createData.code === 'default') {
        await prisma.$executeRawUnsafe(
          `UPDATE security_settings SET default_password = ?, updated_at = NOW()`,
          createData.value
        );
      }
      
      // Récupérer l'élément mis à jour
      const updatedData = await prisma.$queryRawUnsafe(
        `SELECT * FROM reference_data WHERE id = ?`,
        id
      );
      
      return NextResponse.json(Array.isArray(updatedData) ? updatedData[0] : {});
    } else {
      // Création
      // Vérifier si un élément avec le même code, type et module existe déjà
      const existingItem = await prisma.$queryRawUnsafe(
        `SELECT id FROM reference_data WHERE code = ? AND type = ? AND module = ?`,
        createData.code,
        createData.type,
        createData.module
      );
      
      if (Array.isArray(existingItem) && existingItem.length > 0) {
        return NextResponse.json(
          { error: "Un élément avec ce code, type et module existe déjà" },
          { status: 409 }
        );
      }
      
      // Créer le nouvel élément
      const insertResult = await prisma.$executeRawUnsafe(
        `INSERT INTO reference_data 
         (code, value, display_name, description, type, module, feature, is_active, sort_order, color_code, icon_name, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        createData.code,
        createData.value,
        createData.display_name,
        createData.description,
        createData.type,
        createData.module,
        createData.feature,
        createData.is_active,
        createData.sort_order,
        createData.color_code,
        createData.icon_name
      );
      
      // Si c'est un mot de passe par défaut et qu'il est actif, mettre à jour security_settings
      if (isDefaultPassword && createData.is_active && createData.code === 'default') {
        await prisma.$executeRawUnsafe(
          `UPDATE security_settings SET default_password = ?, updated_at = NOW()`,
          createData.value
        );
      }
      
      // Récupérer l'ID du nouvel élément
      const lastInsertId = await prisma.$queryRawUnsafe(
        `SELECT LAST_INSERT_ID() as id`
      );
      
      const newId = Array.isArray(lastInsertId) && lastInsertId.length > 0 ? lastInsertId[0].id : null;
      
      if (newId) {
        // Récupérer l'élément créé
        const newData = await prisma.$queryRawUnsafe(
          `SELECT * FROM reference_data WHERE id = ?`,
          newId
        );
        
        return NextResponse.json(Array.isArray(newData) ? newData[0] : {});
      }
      
      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error("Erreur lors de la création/mise à jour des données de référence:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création/mise à jour des données de référence" },
      { status: 500 }
    );
  }
} 