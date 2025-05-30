import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Données de référence - Statuts utilisateurs
  const userStatuses = [
    {
      code: 'active',
      value: 'active',
      display_name: 'Actif',
      description: 'Utilisateur actif pouvant se connecter',
      type: 'status',
      module: 'users',
      feature: 'user_management',
      is_active: true,
      sort_order: 1,
      color_code: 'bg-green-100 text-green-800',
      icon_name: 'CheckCircle',
    },
    {
      code: 'inactive',
      value: 'inactive',
      display_name: 'Inactif',
      description: 'Utilisateur désactivé ne pouvant pas se connecter',
      type: 'status',
      module: 'users',
      feature: 'user_management',
      is_active: true,
      sort_order: 2,
      color_code: 'bg-gray-100 text-gray-800',
      icon_name: 'XCircle',
    },
    {
      code: 'suspended',
      value: 'suspended',
      display_name: 'Suspendu',
      description: 'Utilisateur temporairement suspendu',
      type: 'status',
      module: 'users',
      feature: 'user_management',
      is_active: true,
      sort_order: 3,
      color_code: 'bg-amber-100 text-amber-800',
      icon_name: 'UserCheck',
    },
  ];

  // Données de référence - Rôles utilisateurs
  const userRoles = [
    {
      code: 'admin',
      value: 'admin',
      display_name: 'Administrateur',
      description: 'Accès complet à toutes les fonctionnalités',
      type: 'role',
      module: 'users',
      feature: 'user_management',
      is_active: true,
      sort_order: 1,
      color_code: 'bg-blue-100 text-blue-800',
    },
    {
      code: 'operator',
      value: 'operator',
      display_name: 'Opérateur',
      description: 'Accès à la plupart des fonctionnalités opérationnelles',
      type: 'role',
      module: 'users',
      feature: 'user_management',
      is_active: true,
      sort_order: 2,
      color_code: 'bg-green-100 text-green-800',
    },
    {
      code: 'viewer',
      value: 'viewer',
      display_name: 'Observateur',
      description: 'Accès en lecture seule',
      type: 'role',
      module: 'users',
      feature: 'user_management',
      is_active: true,
      sort_order: 3,
      color_code: 'bg-purple-100 text-purple-800',
    },
    {
      code: 'user',
      value: 'user',
      display_name: 'Utilisateur',
      description: 'Accès standard aux fonctionnalités de base',
      type: 'role',
      module: 'users',
      feature: 'user_management',
      is_active: true,
      sort_order: 4,
      color_code: 'bg-slate-100',
    },
  ];

  // Données de référence - Statuts employés
  const employeeStatuses = [
    {
      code: 'active',
      value: 'active',
      display_name: 'Actif',
      description: 'Employé actif',
      type: 'status',
      module: 'employees',
      feature: 'employee_management',
      is_active: true,
      sort_order: 1,
      color_code: 'bg-green-100 text-green-800',
    },
    {
      code: 'inactive',
      value: 'inactive',
      display_name: 'Inactif',
      description: 'Employé inactif',
      type: 'status',
      module: 'employees',
      feature: 'employee_management',
      is_active: true,
      sort_order: 2,
      color_code: 'bg-gray-100 text-gray-800',
    },
    {
      code: 'suspended',
      value: 'suspended',
      display_name: 'Suspendu',
      description: 'Employé temporairement suspendu',
      type: 'status',
      module: 'employees',
      feature: 'employee_management',
      is_active: true,
      sort_order: 3,
      color_code: 'bg-amber-100 text-amber-800',
    },
  ];

  // Insertion des données de référence
  console.log('Seeding reference data...');
  
  // Insérer les statuts utilisateurs
  for (const status of userStatuses) {
    await prisma.reference_data.upsert({
      where: {
        type_code_module: {
          type: status.type,
          code: status.code,
          module: status.module,
        },
      },
      update: status,
      create: status,
    });
  }

  // Insérer les rôles utilisateurs
  for (const role of userRoles) {
    await prisma.reference_data.upsert({
      where: {
        type_code_module: {
          type: role.type,
          code: role.code,
          module: role.module,
        },
      },
      update: role,
      create: role,
    });
  }

  // Insérer les statuts employés
  for (const status of employeeStatuses) {
    await prisma.reference_data.upsert({
      where: {
        type_code_module: {
          type: status.type,
          code: status.code,
          module: status.module,
        },
      },
      update: status,
      create: status,
    });
  }

  // Créer un utilisateur admin par défaut si nécessaire
  const adminEmail = 'admin@example.com';
  const adminUser = await prisma.users.findUnique({
    where: { email: adminEmail },
  });

  if (!adminUser) {
    // Trouver l'ID du statut actif
    const activeStatus = await prisma.reference_data.findFirst({
      where: { 
        type: 'status',
        code: 'active',
        module: 'users'
      }
    });

    // Trouver l'ID du rôle admin
    const adminRole = await prisma.roles.findUnique({
      where: { name: 'admin' }
    });

    // Créer l'utilisateur admin
    await prisma.users.create({
      data: {
        name: 'Administrateur',
        email: adminEmail,
        password: await hash('admin123', 10),
        role: 'admin',
        role_id: adminRole?.id,
        status: 'active',
        status_id: activeStatus?.id,
        first_login: true
      },
    });
    console.log('Admin user created');
  }

  console.log('Seeding completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 