import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions, isAdmin, CustomSession } from '@/lib/auth';
import mongoose from 'mongoose';
import { Session } from 'next-auth';
import Profile from '@/models/Profile';

// Get the Permission model from mongoose models or define it
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
  updatedAt: { type: Date, default: Date.now }
});

// Use or create model
const Permission = mongoose.models.Permission || mongoose.model('Permission', permissionSchema);

// GET /api/permissions/:id - Récupérer une permission spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions) as CustomSession;
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    
    if (!params.id) {
      return NextResponse.json({ error: 'ID de permission requis' }, { status: 400 });
    }
    
    await connectToDatabase();
    
    const permission = await Permission.findById(params.id).lean();
    
    if (!permission) {
      return NextResponse.json({ error: 'Permission non trouvée' }, { status: 404 });
    }
    
    const permissionObj = permission as any;
    
    return NextResponse.json({ 
      permission: {
        id: permissionObj._id.toString(),
        name: permissionObj.name,
        code: permissionObj.code,
        isModule: permissionObj.isModule,
        isFunction: permissionObj.isFunction,
        parentModule: permissionObj.parentModule,
        view: permissionObj.view,
        create: permissionObj.create,
        edit: permissionObj.edit,
        delete: permissionObj.delete,
        approve: permissionObj.approve,
        export: permissionObj.export
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la permission:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT /api/permissions/:id - Mettre à jour une permission
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions) as CustomSession;
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    
    // Check admin permissions
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Accès restreint. Permissions administrateur requises.' }, { status: 403 });
    }
    
    if (!params.id) {
      return NextResponse.json({ error: 'ID de permission requis' }, { status: 400 });
    }
    
    await connectToDatabase();
    
    // Verify permission exists
    const existingPermission = await Permission.findById(params.id);
    if (!existingPermission) {
      return NextResponse.json({ error: 'Permission non trouvée' }, { status: 404 });
    }
    
    const data = await request.json();
    
    // Validate required fields
    if (!data.name) {
      return NextResponse.json({ error: 'Nom de permission requis' }, { status: 400 });
    }
    
    // Prevent changing the code which is used as an identifier
    delete data.code;
    
    // Only update allowed fields
    const updatedPermission = await Permission.findByIdAndUpdate(
      params.id,
      {
        $set: {
          name: data.name,
          isModule: Boolean(data.isModule),
          isFunction: Boolean(data.isFunction),
          parentModule: data.parentModule || null,
          view: Boolean(data.view),
          create: Boolean(data.create),
          edit: Boolean(data.edit),
          delete: Boolean(data.delete),
          approve: Boolean(data.approve),
          export: Boolean(data.export),
          updatedAt: new Date()
        }
      },
      { new: true }
    ).lean();
    
    const updatedPermissionObj = updatedPermission as any;
    
    return NextResponse.json({ 
      permission: {
        id: updatedPermissionObj._id.toString(),
        name: updatedPermissionObj.name,
        code: updatedPermissionObj.code,
        isModule: updatedPermissionObj.isModule,
        isFunction: updatedPermissionObj.isFunction,
        parentModule: updatedPermissionObj.parentModule,
        view: updatedPermissionObj.view,
        create: updatedPermissionObj.create,
        edit: updatedPermissionObj.edit,
        delete: updatedPermissionObj.delete,
        approve: updatedPermissionObj.approve,
        export: updatedPermissionObj.export
      },
      message: 'Permission mise à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la permission:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE /api/permissions/:id - Supprimer une permission
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions) as CustomSession;
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    
    // Check admin permissions
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Accès restreint. Permissions administrateur requises.' }, { status: 403 });
    }
    
    if (!params.id) {
      return NextResponse.json({ error: 'ID de permission requis' }, { status: 400 });
    }
    
    await connectToDatabase();
    
    // Récupérer les modèles
    const Permission = mongoose.models.Permission;
    const ProfilePermission = mongoose.models.ProfilePermission;
    const User = mongoose.models.User;
    
    if (!Permission || !ProfilePermission || !User) {
      return NextResponse.json({ error: 'Modèles non disponibles' }, { status: 500 });
    }
    
    // Vérifier si la permission existe
    const permission = await Permission.findById(params.id);
    if (!permission) {
      return NextResponse.json({ error: 'Permission non trouvée' }, { status: 404 });
    }
    
    // Récupérer les profils qui utilisent cette permission
    const profilePermissions = await ProfilePermission.find({ 
      permissionId: params.id 
    });
    
    if (profilePermissions.length > 0) {
      // Récupérer les IDs de profils qui utilisent cette permission
      const profileIds = profilePermissions.map(pp => pp.profileId);
      
      // Vérifier si ces profils sont assignés à des utilisateurs
      const usersWithProfiles = await User.countDocuments({
        profileId: { $in: profileIds }
      });
      
      if (usersWithProfiles > 0) {
        return NextResponse.json({ 
          error: 'Impossible de supprimer cette permission car elle est utilisée par des profils assignés à des utilisateurs',
          profilesCount: profileIds.length,
          usersCount: usersWithProfiles
        }, { status: 409 });
      }
    }
    
    // Archiver la permission avant suppression
    const PermissionArchive = mongoose.models.PermissionArchive || mongoose.model('PermissionArchive', new mongoose.Schema({
      originalId: { type: String, required: true },
      name: { type: String, required: true },
      code: { type: String, required: true },
      description: { type: String },
      isModule: { type: Boolean },
      isFunction: { type: Boolean },
      module: { type: String },
      parentModule: { type: String },
      view: { type: Boolean },
      create: { type: Boolean },
      edit: { type: Boolean },
      delete: { type: Boolean },
      approve: { type: Boolean },
      export: { type: Boolean },
      archivedAt: { type: Date, default: Date.now },
      archivedBy: { type: String },
      originalCreatedAt: { type: Date }
    }));
    
    await new PermissionArchive({
      originalId: permission._id.toString(),
      name: permission.name,
      code: permission.code,
      description: permission.description,
      isModule: permission.isModule,
      isFunction: permission.isFunction,
      module: permission.module,
      parentModule: permission.parentModule,
      view: permission.view,
      create: permission.create,
      edit: permission.edit,
      delete: permission.delete,
      approve: permission.approve,
      export: permission.export,
      archivedBy: session.user.name || session.user.email,
      originalCreatedAt: permission.createdAt
    }).save();
    
    // Supprimer les associations profil-permission
    await ProfilePermission.deleteMany({ permissionId: params.id });
    
    // Supprimer la permission
    await Permission.findByIdAndDelete(params.id);
    
    return NextResponse.json({ 
      success: true,
      message: 'Permission supprimée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de la permission:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
} 