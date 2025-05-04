import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { promises as fs } from 'fs';
import path from 'path';
import { parseCSVString } from '@/lib/csv-parser';

/**
 * GET /api/csv-analysis
 * Analyser les données du fichier CSV d'exportation
 */
export async function GET(req: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }
    
    // Chemin vers le fichier CSV
    const filePath = path.join(process.cwd(), 'Exportation 1.csv');
    
    // Lecture du fichier
    const fileContent = await fs.readFile(filePath, 'utf-8');
    
    // Analyse du CSV
    const records = await parseCSVString(fileContent);
    
    // 1. Répartition par lecteur
    const readerStats = records.reduce((acc, record) => {
      const reader = record.reader;
      if (!reader) return acc;
      
      if (!acc[reader]) {
        acc[reader] = 0;
      }
      
      acc[reader]++;
      return acc;
    }, {} as Record<string, number>);
    
    // 2. Répartition par type d'évènement
    const eventTypeStats = records.reduce((acc, record) => {
      const eventType = record.eventType;
      if (!eventType) return acc;
      
      if (!acc[eventType]) {
        acc[eventType] = 0;
      }
      
      acc[eventType]++;
      return acc;
    }, {} as Record<string, number>);
    
    // 3. Répartition par groupe (département)
    const groupStats = records.reduce((acc, record) => {
      const group = record.group;
      if (!group) return acc;
      
      if (!acc[group]) {
        acc[group] = 0;
      }
      
      acc[group]++;
      return acc;
    }, {} as Record<string, number>);
    
    // 4. Répartition des événements par heure
    const hourlyStats = records.reduce((acc, record) => {
      if (!record.eventTime) return acc;
      
      // Extraire l'heure du format HH:MM:SS
      const hour = parseInt(record.eventTime.split(':')[0], 10);
      
      if (!acc[hour]) {
        acc[hour] = 0;
      }
      
      acc[hour]++;
      return acc;
    }, {} as Record<string, number>);
    
    // 5. Répartition des lecteurs par centrale
    const centralReaderStats = records.reduce((acc, record) => {
      const central = record.central;
      const reader = record.reader;
      
      if (!central || !reader) return acc;
      
      if (!acc[central]) {
        acc[central] = {};
      }
      
      if (!acc[central][reader]) {
        acc[central][reader] = 0;
      }
      
      acc[central][reader]++;
      return acc;
    }, {} as Record<string, Record<string, number>>);
    
    // Transformer les résultats pour les rendre plus faciles à utiliser dans les graphiques
    const formattedReaderStats = Object.keys(readerStats).map(reader => ({
      reader,
      count: readerStats[reader]
    })).sort((a, b) => b.count - a.count);
    
    const formattedEventTypeStats = Object.keys(eventTypeStats).map(type => ({
      type,
      count: eventTypeStats[type]
    })).sort((a, b) => b.count - a.count);
    
    const formattedGroupStats = Object.keys(groupStats).map(group => ({
      group,
      count: groupStats[group]
    })).sort((a, b) => b.count - a.count);
    
    const formattedHourlyStats = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: hourlyStats[i] || 0
    }));
    
    const formattedCentralReaderStats = Object.keys(centralReaderStats).map(central => {
      const readers = Object.keys(centralReaderStats[central]).map(reader => ({
        reader,
        count: centralReaderStats[central][reader]
      })).sort((a, b) => b.count - a.count);
      
      return {
        central,
        readers,
        total: readers.reduce((sum, r) => sum + r.count, 0)
      };
    }).sort((a, b) => b.total - a.total);
    
    return NextResponse.json({
      readerStats: formattedReaderStats,
      eventTypeStats: formattedEventTypeStats,
      groupStats: formattedGroupStats,
      hourlyStats: formattedHourlyStats,
      centralReaderStats: formattedCentralReaderStats,
      totalEvents: records.length
    });
    
  } catch (error) {
    console.error('Erreur lors de l\'analyse du fichier CSV:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'analyse du fichier CSV' },
      { status: 500 }
    );
  }
} 