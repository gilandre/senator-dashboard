import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const company = searchParams.get('company') || '';
    const status = searchParams.get('status') || '';
    const badge = searchParams.get('badge') || '';

    const skip = (page - 1) * limit;

    // Obtenir tous les badges identifiés comme visiteurs dans access_logs
    const visitorBadges = await prisma.access_logs.findMany({
      where: {
        person_type: 'visitor'
      },
      select: {
        badge_number: true
      },
      distinct: ['badge_number']
    });

    // Extraire les numéros de badges
    const validVisitorBadges = visitorBadges.map(b => b.badge_number);

    // Construire les conditions de filtrage
    const where: any = {
      // Filtre principal: seulement les badges identifiés comme visiteurs
      badge_number: { in: validVisitorBadges }
    };
    
    if (search) {
      where.OR = [
        { first_name: { contains: search, mode: 'insensitive' } },
        { last_name: { contains: search, mode: 'insensitive' } },
        { badge_number: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (company) {
      where.company = company;
    }
    if (status) {
      where.status = status;
    }
    if (badge) {
      where.badge_number = badge;
    }

    // Récupérer les visiteurs avec pagination
    const [visitors, total] = await Promise.all([
      prisma.visitors.findMany({
        where,
        skip,
        take: limit,
        orderBy: { last_seen: 'desc' },
      }),
      prisma.visitors.count({ where }),
    ]);

    // Pour chaque badge, vérifier s'il est partagé et récupérer l'historique
    const badgeNumbers = Array.from(new Set(visitors.map(v => v.badge_number)));
    const badgeHistories = await Promise.all(
      badgeNumbers.map(async (badge_number) => {
        const history = await prisma.visitors.findMany({
          where: { badge_number },
          orderBy: { last_seen: 'desc' },
        });
        
        // Si le badge est utilisé par plusieurs visiteurs,
        // marquer le premier (le plus récent) comme actif, les autres comme inactifs
        if (history.length > 1) {
          const [mostRecent, ...others] = history;
          
          // Mettre à jour le statut dans la base de données si nécessaire
          if (mostRecent.status !== 'active') {
            await prisma.visitors.update({
              where: { id: mostRecent.id },
              data: { status: 'active' }
            });
          }
          
          // Mettre à jour les statuts des autres utilisateurs du badge
          for (const other of others) {
            if (other.status !== 'inactive') {
              await prisma.visitors.update({
                where: { id: other.id },
                data: { status: 'inactive' }
              });
            }
          }
          
          return {
            badge_number,
            isShared: true,
            history: [
              { ...mostRecent, status: 'active' },
              ...others.map(o => ({ ...o, status: 'inactive' }))
            ]
          };
        }
        
        return {
          badge_number,
          isShared: false,
          history: history
        };
      })
    );

    // Structurer les données pour intégrer l'historique des badges
    const enrichedVisitors = visitors.map(visitor => {
      const badgeInfo = badgeHistories.find(bh => bh.badge_number === visitor.badge_number);
      return {
        ...visitor,
        isSharedBadge: badgeInfo?.isShared || false,
        badgeHistory: badgeInfo?.history || []
      };
    });

    // Récupérer les entreprises uniques pour le filtre
    const companies = await prisma.visitors.findMany({
      select: { company: true },
      distinct: ['company'],
      orderBy: { company: 'asc' },
    });

    return NextResponse.json({
      visitors: enrichedVisitors,
      badgeHistories,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      companies: companies.map(c => c.company),
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des visiteurs:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des visiteurs' },
      { status: 500 }
    );
  }
} 