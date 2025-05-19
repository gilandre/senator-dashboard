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

    // Démarrer l'importation
    console.log('Démarrage de l\'importation des employés depuis les logs d\'accès...');
    
    const startTime = Date.now();
    
    // 1. Récupérer tous les logs d'accès avec person_type = 'employee' et qui ont un nom complet
    const uniqueEmployeeLogs = await prisma.access_logs.findMany({
      where: {
        person_type: 'employee',
        full_name: {
          not: '',
        },
        badge_number: {
          not: '',
        },
        // Version améliorée pour exclure les visiteurs (avec variations d'orthographe)
        AND: [
          {
            group_name: {
              not: { contains: 'visiteur' }
            }
          },
          {
            group_name: {
              not: { contains: 'Visiteur' }
            }
          },
          {
            group_name: {
              not: { contains: 'visiteurs' }
            }
          },
          {
            group_name: {
              not: { contains: 'Visiteurs' }
            }
          },
          {
            group_name: {
              not: { contains: 'VISITEUR' }
            }
          },
          {
            group_name: {
              not: { contains: 'VISITEURS' }
            }
          }
        ]
      },
      distinct: ['badge_number'],
      orderBy: {
        event_date: 'desc',
      },
    });

    console.log(`Trouvé ${uniqueEmployeeLogs.length} employés uniques dans les logs d'accès.`);

    let created = 0;
    let skipped = 0;
    let errors = 0;

    // 2. Pour chaque log unique, vérifier si l'employé existe déjà
    for (const log of uniqueEmployeeLogs) {
      try {
        const { badge_number, full_name, group_name } = log;
        
        // Ignorer les entrées sans nom complet ou badge
        if (!full_name || !badge_number) {
          continue;
        }
        
        // Vérifier si l'employé existe déjà
        const existingEmployee = await prisma.employees.findUnique({
          where: {
            badge_number,
          },
        });

        if (existingEmployee) {
          skipped++;
          continue;
        }

        // Extraire le prénom et le nom du full_name
        let firstName = '';
        let lastName = '';

        if (full_name) {
          const nameParts = full_name.trim().split(' ');
          if (nameParts.length >= 2) {
            firstName = nameParts[0];
            lastName = nameParts.slice(1).join(' ');
          } else {
            firstName = full_name;
            lastName = '';
          }
        }

        // Créer l'employé
        await prisma.employees.create({
          data: {
            badge_number,
            first_name: firstName,
            last_name: lastName,
            department: group_name || null,
            status: 'active',
            created_at: new Date(),
            updated_at: new Date(),
          },
        });

        created++;
      } catch (error) {
        console.error('Erreur lors de la création d\'un employé:', error);
        errors++;
      }
    }

    const duration = (Date.now() - startTime) / 1000;

    // Créer un enregistrement d'activité pour cette importation
    await prisma.user_activities.create({
      data: {
        user_id: parseInt(session.user.id),
        action: 'IMPORT_EMPLOYEES_BATCH',
        details: JSON.stringify({
          total: uniqueEmployeeLogs.length,
          created,
          skipped,
          errors,
          duration: `${duration.toFixed(2)} secondes`
        }),
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
        timestamp: new Date()
      }
    });

    // Retourner les résultats
    return NextResponse.json({
      success: true,
      stats: {
        total: uniqueEmployeeLogs.length,
        created,
        skipped,
        errors,
        duration: `${duration.toFixed(2)} secondes`
      }
    });
  } catch (error) {
    console.error('Erreur lors de l\'importation des employés:', error);
    return NextResponse.json({ 
      error: 'Erreur lors de l\'importation des employés',
      details: (error as Error).message
    }, { status: 500 });
  }
} 