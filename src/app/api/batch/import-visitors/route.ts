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

    // Démarrer l'importation
    console.log('Démarrage de l\'importation des visiteurs depuis les logs d\'accès...');
    
    const startTime = Date.now();
    
    // 1. Récupérer tous les logs d'accès avec group_name contenant 'Visiteurs' et qui ont un nom complet
    console.log('Recherche des logs avec group_name contenant "Visiteurs"...');
    
    // D'abord, récupérons quelques exemples de group_name pour vérifier
    const groupNameSamples = await prisma.access_logs.findMany({
      select: {
        group_name: true
      },
      distinct: ['group_name'],
      take: 10
    });
    
    console.log('Exemples de group_name disponibles:', groupNameSamples.map(g => g.group_name));
    
    const uniqueVisitorLogs = await prisma.access_logs.findMany({
      where: {
        group_name: {
          contains: 'Visiteurs'
        },
        full_name: {
          not: '',
        },
        badge_number: {
          not: '',
        },
      },
      distinct: ['badge_number'],
      orderBy: {
        event_date: 'desc',
      },
    });

    console.log(`Trouvé ${uniqueVisitorLogs.length} visiteurs uniques dans les logs d'accès.`);
    
    // Si nous ne trouvons pas de visiteurs, essayons avec un texte différent
    if (uniqueVisitorLogs.length === 0) {
      console.log('Aucun visiteur trouvé avec "Visiteurs". Essai avec "Visiteur"...');
      const uniqueVisitorLogsAlt = await prisma.access_logs.findMany({
        where: {
          group_name: {
            contains: 'Visiteur'
          },
          full_name: {
            not: '',
          },
          badge_number: {
            not: '',
          },
        },
        distinct: ['badge_number'],
        take: 5
      });
      
      console.log(`Trouvé ${uniqueVisitorLogsAlt.length} visiteurs avec "Visiteur" au singulier.`);
      console.log('Exemples:', uniqueVisitorLogsAlt.map(v => ({ 
        badge: v.badge_number, 
        name: v.full_name,
        group: v.group_name
      })));
    }

    let created = 0;
    let skipped = 0;
    let errors = 0;
    let updated = 0;

    // 2. Pour chaque log unique, vérifier si le visiteur existe déjà
    for (const log of uniqueVisitorLogs) {
      try {
        const { badge_number, full_name } = log;
        
        // Ignorer les entrées sans nom complet ou badge
        if (!full_name || !badge_number) {
          continue;
        }
        
        // Vérifier si le visiteur existe déjà
        const existingVisitor = await prisma.visitors.findUnique({
          where: {
            badge_number,
          },
        });

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

        // Obtenir la première et dernière fois où ce badge a été vu
        const firstSeen = await prisma.access_logs.findFirst({
          where: {
            badge_number,
            group_name: {
              contains: 'Visiteurs'
            }
          },
          orderBy: {
            event_date: 'asc'
          },
          select: {
            event_date: true
          }
        });

        const lastSeen = await prisma.access_logs.findFirst({
          where: {
            badge_number,
            group_name: {
              contains: 'Visiteurs'
            }
          },
          orderBy: {
            event_date: 'desc'
          },
          select: {
            event_date: true
          }
        });

        // Compter le nombre d'accès
        const accessCount = await prisma.access_logs.count({
          where: {
            badge_number,
            group_name: {
              contains: 'Visiteurs'
            }
          }
        });

        if (existingVisitor) {
          // Mettre à jour le visiteur existant
          await prisma.visitors.update({
            where: {
              badge_number,
            },
            data: {
              access_count: accessCount,
              first_seen: firstSeen?.event_date,
              last_seen: lastSeen?.event_date,
              updated_at: new Date()
            },
          });
          updated++;
          continue;
        }

        // Créer le visiteur
        await prisma.visitors.create({
          data: {
            badge_number,
            first_name: firstName,
            last_name: lastName,
            company: 'Inconnu', // Valeur par défaut
            status: 'active',
            access_count: accessCount,
            first_seen: firstSeen?.event_date,
            last_seen: lastSeen?.event_date,
            created_at: new Date(),
            updated_at: new Date(),
          },
        });

        created++;
      } catch (error) {
        console.error('Erreur lors de la création d\'un visiteur:', error);
        errors++;
      }
    }

    const duration = (Date.now() - startTime) / 1000;

    // Créer un enregistrement d'activité pour cette importation
    await prisma.user_activities.create({
      data: {
        user_id: parseInt(session.user.id),
        action: 'IMPORT_VISITORS_BATCH',
        details: JSON.stringify({
          total: uniqueVisitorLogs.length,
          created,
          updated,
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
        total: uniqueVisitorLogs.length,
        created,
        updated,
        skipped,
        errors,
        duration: `${duration.toFixed(2)} secondes`
      }
    });
  } catch (error) {
    console.error('Erreur lors de l\'importation des visiteurs:', error);
    return NextResponse.json({ 
      error: 'Erreur lors de l\'importation des visiteurs',
      details: (error as Error).message
    }, { status: 500 });
  }
} 