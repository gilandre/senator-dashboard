import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    // Récupère la date maximale dans les logs d'accès
    const maxDateResult = await prisma.$queryRaw`
      SELECT MAX(event_date) as maxDate FROM access_logs
    `;
    
    // Récupère la date minimale dans les logs d'accès
    const minDateResult = await prisma.$queryRaw`
      SELECT MIN(event_date) as minDate FROM access_logs
    `;
    
    // Extrait les dates des résultats
    const maxDate = Array.isArray(maxDateResult) && maxDateResult.length > 0 && maxDateResult[0].maxDate
      ? new Date(maxDateResult[0].maxDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]; // Date actuelle par défaut
    
    const minDate = Array.isArray(minDateResult) && minDateResult.length > 0 && minDateResult[0].minDate
      ? new Date(minDateResult[0].minDate).toISOString().split('T')[0]
      : new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0]; // 1 an en arrière par défaut
    
    // Retourne les dates au format YYYY-MM-DD
    return NextResponse.json({ 
      maxDate, 
      minDate,
      count: await prisma.access_logs.count()
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des dates limites des logs d\'accès:', error);
    return NextResponse.json(
      { 
        error: 'Erreur lors de la récupération des dates limites des logs d\'accès',
        message: error instanceof Error ? error.message : 'Erreur inconnue',
        maxDate: new Date().toISOString().split('T')[0], // Fallback en cas d'erreur
        minDate: new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0]
      },
      { status: 500 }
    );
  }
} 