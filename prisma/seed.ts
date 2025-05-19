import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Nettoyer la base de données
  await prisma.$transaction([
    prisma.userProfile.deleteMany(),
    prisma.profilePermission.deleteMany(),
    prisma.securityIncident.deleteMany(),
    prisma.anomalies.deleteMany(),
    prisma.holidays.deleteMany(),
    prisma.report_history.deleteMany(),
    prisma.report_schedule.deleteMany(),
    prisma.report_templates.deleteMany(),
    prisma.user_activities.deleteMany(),
    prisma.password_history.deleteMany(),
    prisma.attendance_config.deleteMany(),
    prisma.security_settings.deleteMany(),
    prisma.profile.deleteMany(),
    prisma.permission.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  // Créer les permissions de base
  const permissions = await Promise.all([
    prisma.permission.create({
      data: {
        name: 'dashboard.view',
        description: 'Voir le tableau de bord',
        module: 'dashboard',
        action: 'view',
      },
    }),
    prisma.permission.create({
      data: {
        name: 'employees.manage',
        description: 'Gérer les employés',
        module: 'employees',
        action: 'manage',
      },
    }),
    prisma.permission.create({
      data: {
        name: 'visitors.manage',
        description: 'Gérer les visiteurs',
        module: 'visitors',
        action: 'manage',
      },
    }),
    prisma.permission.create({
      data: {
        name: 'reports.generate',
        description: 'Générer des rapports',
        module: 'reports',
        action: 'generate',
      },
    }),
    prisma.permission.create({
      data: {
        name: 'settings.manage',
        description: 'Gérer les paramètres',
        module: 'settings',
        action: 'manage',
      },
    }),
  ]);

  // Créer les profils de base
  const adminProfile = await prisma.profile.create({
    data: {
      name: 'Administrateur',
      description: 'Profil administrateur avec tous les droits',
      profile_permissions: {
        create: permissions.map(permission => ({
          permission_id: permission.id,
        })),
      },
    },
  });

  const userProfile = await prisma.profile.create({
    data: {
      name: 'Utilisateur',
      description: 'Profil utilisateur standard',
      profile_permissions: {
        create: [
          { permission_id: permissions[0].id }, // dashboard.view
          { permission_id: permissions[3].id }, // reports.generate
        ],
      },
    },
  });

  // Créer l'utilisateur administrateur
  const adminPassword = await hash('Admin@123', 12);
  const adminUser = await prisma.user.create({
    data: {
      name: 'Administrateur',
      email: 'admin@senator.com',
      password: adminPassword,
      role: 'admin',
      first_login: false,
      status: 'active',
      user_profiles: {
        create: {
          profile_id: adminProfile.id,
        },
      },
    },
  });

  // Créer un utilisateur standard
  const userPassword = await hash('User@123', 12);
  const standardUser = await prisma.user.create({
    data: {
      name: 'Utilisateur Standard',
      email: 'user@senator.com',
      password: userPassword,
      role: 'user',
      first_login: false,
      status: 'active',
      user_profiles: {
        create: {
          profile_id: userProfile.id,
        },
      },
    },
  });

  // Créer les paramètres de sécurité de base
  await prisma.security_settings.create({
    data: {
      min_password_length: 8,
      require_special_chars: true,
      require_numbers: true,
      require_uppercase: true,
      password_history_count: 3,
      max_login_attempts: 5,
      lock_duration_minutes: 30,
      two_factor_auth_enabled: false,
      updated_by: adminUser.id,
    },
  });

  // Créer la configuration de présence par défaut
  await prisma.attendance_config.create({
    data: {
      work_start_time: new Date('1970-01-01T09:00:00'),
      work_end_time: new Date('1970-01-01T17:00:00'),
      lunch_start_time: new Date('1970-01-01T12:00:00'),
      lunch_end_time: new Date('1970-01-01T13:00:00'),
      work_days: '1,2,3,4,5',
      updated_by: adminUser.id,
    },
  });

  // Créer quelques jours fériés de base
  const currentYear = new Date().getFullYear();
  await Promise.all([
    prisma.holidays.create({
      data: {
        date: new Date(`${currentYear}-01-01`),
        name: 'Jour de l\'an',
        description: 'Premier jour de l\'année',
        type: 'legal',
        repeats_yearly: true,
        created_by: adminUser.id,
      },
    }),
    prisma.holidays.create({
      data: {
        date: new Date(`${currentYear}-05-01`),
        name: 'Fête du Travail',
        description: 'Jour férié national',
        type: 'legal',
        repeats_yearly: true,
        created_by: adminUser.id,
      },
    }),
    prisma.holidays.create({
      data: {
        date: new Date(`${currentYear}-07-14`),
        name: 'Fête Nationale',
        description: 'Jour férié national',
        type: 'legal',
        repeats_yearly: true,
        created_by: adminUser.id,
      },
    }),
  ]);

  console.log('Base de données initialisée avec succès !');
  console.log('Comptes créés :');
  console.log('Admin : admin@senator.com / Admin@123');
  console.log('User : user@senator.com / User@123');
}

main()
  .catch((e) => {
    console.error('Erreur lors de l\'initialisation de la base de données :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 