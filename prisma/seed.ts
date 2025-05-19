import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Créer les permissions de base
  const permissions = await Promise.all([
    prisma.permission.create({
      data: {
        name: 'manage_users',
        description: 'Gérer les utilisateurs',
        module: 'users',
        action: 'manage'
      }
    }),
    prisma.permission.create({
      data: {
        name: 'view_dashboard',
        description: 'Voir le tableau de bord',
        module: 'dashboard',
        action: 'view'
      }
    }),
    prisma.permission.create({
      data: {
        name: 'manage_attendance',
        description: 'Gérer les présences',
        module: 'attendance',
        action: 'manage'
      }
    })
  ]);

  // Créer le profil administrateur
  const adminProfile = await prisma.profile.create({
    data: {
      name: 'Administrateur',
      description: 'Profil avec tous les droits',
      profile_permissions: {
        create: permissions.map(permission => ({
          permission_id: permission.id
        }))
      }
    }
  });

  // Créer l'utilisateur administrateur
  const hashedPassword = await bcrypt.hash('P@ssw0rd', 10);
  const adminUser = await prisma.user.create({
    data: {
      name: 'Administrateur',
      email: 'admin@senator.com',
      password: hashedPassword,
      role: 'admin',
      status: 'active',
      first_login: true,
      user_profiles: {
        create: {
          profile_id: adminProfile.id
        }
      }
    }
  });

  console.log('Base de données initialisée avec succès !');
  console.log('Utilisateur admin créé :', adminUser.email);
}

main()
  .catch((e) => {
    console.error('Erreur lors de l\'initialisation de la base de données:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 