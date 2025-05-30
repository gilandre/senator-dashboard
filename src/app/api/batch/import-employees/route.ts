import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * API pour importer les employés à partir des access_logs
 * POST /api/batch/import-employees
 */
export async function POST(req: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Vérifier si l'utilisateur est un administrateur
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Permissions insuffisantes' }, { status: 403 });
    }

    console.log('Démarrage de l\'importation des employés...');
    
    // 1. PURGER LES VISITEURS DE LA TABLE EMPLOYEES
    // Récupérer tous les badges de la table visiteurs
    const visitorBadges = await prisma.visitors.findMany({
      select: { badge_number: true }
    });
    
    const visitorBadgeNumbers = visitorBadges.map(v => v.badge_number);
    
    // Supprimer tous les employés dont le badge_number correspond à un visiteur
    if (visitorBadgeNumbers.length > 0) {
      const purgeResult = await prisma.employees.deleteMany({
        where: {
          badge_number: {
            in: visitorBadgeNumbers
          }
        }
      });
      
      console.log(`Purge des visiteurs de la table employees: ${purgeResult.count} entrées supprimées`);
    }
    
    // 2. Récupérer tous les logs d'accès avec person_type = 'employee'
    console.log('Récupération des logs avec person_type = employee...');
    const accessLogs = await prisma.access_logs.findMany({
      where: {
        person_type: 'employee',
        // S'assurer que ce ne sont pas des visiteurs (par le groupe)
        NOT: {
          group_name: {
            contains: 'visit'
          }
        }
      },
      distinct: ['badge_number'],
      orderBy: { event_date: 'desc' }
    });

    console.log(`Trouvé ${accessLogs.length} badges employés uniques dans les logs d'accès`);

    // 3. Récupérer les employés existants
    const existingEmployees = await prisma.employees.findMany({
      select: { badge_number: true }
    });
    
    const existingBadgeNumbers = existingEmployees.map(e => e.badge_number);
    console.log(`${existingEmployees.length} employés déjà dans la base de données`);

    // 4. Filtrer pour ne garder que les nouveaux employés
    const newEmployees = accessLogs.filter(log => !existingBadgeNumbers.includes(log.badge_number));
    console.log(`${newEmployees.length} nouveaux employés à ajouter`);

    // 5. Insérer les nouveaux employés
    const addedEmployees: { badge_number: string; first_name: string; last_name: string }[] = [];
    
    for (const log of newEmployees) {
      // Extraire le prénom et le nom du full_name si disponible
      let firstName = 'Employé';
      let lastName = log.badge_number;
      
      if (log.full_name) {
        const nameParts = log.full_name.split(' ');
        if (nameParts.length >= 2) {
          firstName = nameParts[0];
          lastName = nameParts.slice(1).join(' ');
        } else {
          firstName = log.full_name;
        }
      }
      
      try {
        const employee = await prisma.employees.create({
          data: {
            badge_number: log.badge_number,
            employee_id: `E${log.badge_number}`,
            first_name: firstName,
            last_name: lastName,
            department: log.group_name || 'Non spécifié',
            email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
            position: 'Non spécifié',
            status: 'active'
          }
        });
        
        addedEmployees.push({
          badge_number: employee.badge_number,
          first_name: employee.first_name,
          last_name: employee.last_name
        });
      } catch (error) {
        console.error(`Erreur lors de l'ajout de l'employé ${log.badge_number}:`, error);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `${addedEmployees.length} nouveaux employés importés avec succès. ${visitorBadgeNumbers.length > 0 ? `${visitorBadgeNumbers.length} visiteurs purgés de la table employees.` : ''}`,
      employeesAdded: addedEmployees.length,
      visitorsPurged: visitorBadgeNumbers.length
    });
    
  } catch (error) {
    console.error('Erreur lors de l\'importation des employés:', error);
    return NextResponse.json({ error: 'Erreur lors de l\'importation des employés' }, { status: 500 });
  }
} 