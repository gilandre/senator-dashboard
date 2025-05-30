import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * API pour importer les visiteurs à partir des access_logs
 * POST /api/batch/import-visitors
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

    console.log('Démarrage de l\'importation des visiteurs...');
    
    // 1. PURGER LES EMPLOYÉS DE LA TABLE VISITORS
    // Récupérer tous les badges de la table employés
    const employeeBadges = await prisma.employees.findMany({
      select: { badge_number: true }
    });
    
    const employeeBadgeNumbers = employeeBadges.map(e => e.badge_number);
    
    // Supprimer tous les visiteurs dont le badge_number correspond à un employé
    if (employeeBadgeNumbers.length > 0) {
      const purgeResult = await prisma.visitors.deleteMany({
        where: {
          badge_number: {
            in: employeeBadgeNumbers
          }
        }
      });
      
      console.log(`Purge des employés de la table visitors: ${purgeResult.count} entrées supprimées`);
    }
    
    // 2. Récupérer tous les logs d'accès avec person_type = 'visitor' ou group_name contenant "visitor/visiteur"
    console.log('Récupération des logs de visiteurs...');
    const accessLogs = await prisma.access_logs.findMany({
      where: {
        OR: [
          { person_type: 'visitor' },
          { 
            group_name: {
              contains: 'visit'
            }
          }
        ]
      },
      distinct: ['badge_number'],
      orderBy: { event_date: 'desc' }
    });

    console.log(`Trouvé ${accessLogs.length} badges visiteurs uniques dans les logs d'accès`);

    // 3. Récupérer les visiteurs existants
    const existingVisitors = await prisma.visitors.findMany({
      select: { badge_number: true }
    });
    
    const existingBadgeNumbers = existingVisitors.map(v => v.badge_number);
    console.log(`${existingVisitors.length} visiteurs déjà dans la base de données`);

    // 4. Filtrer pour ne garder que les nouveaux visiteurs et s'assurer qu'ils ne sont pas des employés
    const newVisitors = accessLogs.filter(log => 
      !existingBadgeNumbers.includes(log.badge_number) && 
      !employeeBadgeNumbers.includes(log.badge_number)
    );
    
    console.log(`${newVisitors.length} nouveaux visiteurs à ajouter`);

    // 5. Insérer les nouveaux visiteurs
    const addedVisitors: { badge_number: string; first_name: string; last_name: string }[] = [];
    
    for (const log of newVisitors) {
      // Extraire le prénom et le nom du full_name si disponible
      let firstName = 'Visiteur';
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
        const visitor = await prisma.visitors.create({
          data: {
            badge_number: log.badge_number,
            first_name: firstName,
            last_name: lastName,
            company: log.group_name || 'Externe',
            reason: 'Visite',
            status: 'active',
            access_count: 1,
            first_seen: log.event_date,
            last_seen: log.event_date
          }
        });
        
        addedVisitors.push({
          badge_number: visitor.badge_number,
          first_name: visitor.first_name,
          last_name: visitor.last_name
        });
      } catch (error) {
        console.error(`Erreur lors de l'ajout du visiteur ${log.badge_number}:`, error);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `${addedVisitors.length} nouveaux visiteurs importés avec succès. ${employeeBadgeNumbers.length > 0 ? `${employeeBadgeNumbers.length} employés purgés de la table visitors.` : ''}`,
      visitorsAdded: addedVisitors.length,
      employeesPurged: employeeBadgeNumbers.length
    });
    
  } catch (error) {
    console.error('Erreur lors de l\'importation des visiteurs:', error);
    return NextResponse.json({ error: 'Erreur lors de l\'importation des visiteurs' }, { status: 500 });
  }
} 