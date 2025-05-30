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

    const configs = await prisma.syncConfig.findMany({
      orderBy: { sync_type: 'asc' },
    });

    return NextResponse.json(configs);
  } catch (error) {
    console.error('Erreur lors de la récupération de la configuration:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la configuration' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const data = await request.json();
    const { sync_type, cron_expression, is_active } = data;

    // Vérifier si la configuration existe déjà
    const existingConfig = await prisma.syncConfig.findUnique({
      where: { sync_type },
    });

    let config;
    if (existingConfig) {
      // Mise à jour
      config = await prisma.syncConfig.update({
        where: { sync_type },
        data: {
          cron_expression,
          is_active,
          updated_by: session.user?.email,
        },
      });
    } else {
      // Création
      config = await prisma.syncConfig.create({
        data: {
          sync_type,
          cron_expression,
          is_active,
          created_by: session.user?.email,
          updated_by: session.user?.email,
        },
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la configuration:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la configuration' },
      { status: 500 }
    );
  }
} 