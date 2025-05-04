import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { authOptions, isAdmin, CustomSession } from '@/lib/auth';

// Define models
const permissionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  isModule: { type: Boolean, default: false },
  isFunction: { type: Boolean, default: false },
  parentModule: { type: String, default: null },
  view: { type: Boolean, default: false },
  create: { type: Boolean, default: false },
  edit: { type: Boolean, default: false },
  delete: { type: Boolean, default: false },
  approve: { type: Boolean, default: false },
  export: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  module: { type: String, default: 'default' },
  description: { type: String, default: '' }
});

// Use or create model
const Permission = mongoose.models.Permission || mongoose.model('Permission', permissionSchema);

// GET /api/permissions - Récupérer la liste des permissions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as CustomSession;
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const moduleFilter = searchParams.get('module');
    const search = searchParams.get('search');
    const profileId = searchParams.get('profileId');
    
    await connectToDatabase();
    
    let query: any = {};
    
    // Filter by module if specified
    if (moduleFilter) {
      query.parentModule = moduleFilter;
    }
    
    // Search by name if specified
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    // If profileId is provided, we would query profile-specific permissions
    // This would likely require a different model or a join operation
    // For now, we'll just fetch the base permissions
    
    const permissions = await Permission.find(query).sort({ isModule: -1, name: 1 }).lean();
    
    return NextResponse.json({ 
      permissions: permissions.map((p: any) => ({
        id: p._id.toString(),
        name: p.name,
        code: p.code,
        isModule: p.isModule,
        isFunction: p.isFunction,
        parentModule: p.parentModule,
        view: p.view,
        create: p.create,
        edit: p.edit,
        delete: p.delete,
        approve: p.approve,
        export: p.export
      })) 
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des permissions:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/permissions - Créer une nouvelle permission
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as CustomSession;
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    
    // Check admin permissions
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Accès restreint. Permissions administrateur requises.' }, { status: 403 });
    }
    
    const data = await request.json();
    
    // Validate required fields
    if (!data.name || !data.code) {
      return NextResponse.json({ error: 'Nom et code de permission requis' }, { status: 400 });
    }
    
    await connectToDatabase();
    
    // Check if permission with this code already exists
    const existingPermission = await Permission.findOne({ code: data.code });
    if (existingPermission) {
      return NextResponse.json({ error: 'Une permission avec ce code existe déjà' }, { status: 409 });
    }

    // Vérifier que le schéma de la collection est à jour
    if (mongoose.connection.db) {
      const collections = await mongoose.connection.db.listCollections({ name: 'permissions' }).toArray();
      if (collections.length > 0) {
        try {
          // Supprimer les index problématiques si nécessaire
          const indexes = await mongoose.connection.db.collection('permissions').indexes();
          const problematicIndex = indexes.find(i => 
            i.name === 'module_1_action_1' || 
            (i.key && i.key.module && i.key.action));
          
          if (problematicIndex && problematicIndex.name) {
            console.log('Suppression de l\'index problématique:', problematicIndex.name);
            await mongoose.connection.db.collection('permissions').dropIndex(problematicIndex.name);
          }
        } catch (error) {
          console.warn('Erreur lors de la vérification des index:', error);
        }
      }
    }
    
    // Create new permission
    const newPermission = new Permission({
      name: data.name,
      code: data.code,
      isModule: data.isModule || false,
      isFunction: data.isFunction || false,
      module: data.module || (data.isModule ? data.name : 'default'),
      parentModule: data.parentModule || null,
      view: data.view !== undefined ? data.view : false,
      create: data.create !== undefined ? data.create : false,
      edit: data.edit !== undefined ? data.edit : false,
      delete: data.delete !== undefined ? data.delete : false,
      approve: data.approve !== undefined ? data.approve : false,
      export: data.export !== undefined ? data.export : false,
      description: data.description || `Permission pour ${data.name}`
    });
    
    await newPermission.save();
    
    return NextResponse.json({ 
      permission: {
        id: newPermission._id.toString(),
        name: newPermission.name,
        code: newPermission.code,
        isModule: newPermission.isModule,
        isFunction: newPermission.isFunction,
        parentModule: newPermission.parentModule,
        view: newPermission.view,
        create: newPermission.create,
        edit: newPermission.edit,
        delete: newPermission.delete,
        approve: newPermission.approve,
        export: newPermission.export
      },
      message: 'Permission créée avec succès' 
    }, { status: 201 });
  } catch (error) {
    console.error('Erreur lors de la création de la permission:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
} 