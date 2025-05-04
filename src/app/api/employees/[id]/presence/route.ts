import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database';
import AccessLog from '@/models/AccessLog';
import Employee from '@/models/Employee';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Vérifier que l'employé existe
    await connectToDatabase();
    const employee = await Employee.findOne({ badgeNumber: params.id });
    
    if (!employee) {
      return NextResponse.json(
        { error: 'Employé non trouvé' },
        { status: 404 }
      );
    }

    // Récupérer tous les logs d'accès de l'employé
    const accessLogs = await AccessLog.find({ badgeNumber: params.id })
      .sort({ eventDate: 1, eventTime: 1 });

    // Grouper les logs par jour
    const dailyLogs: { [key: string]: any[] } = {};
    accessLogs.forEach(log => {
      const dateStr = log.eventDate.toISOString().split('T')[0];
      if (!dailyLogs[dateStr]) {
        dailyLogs[dateStr] = [];
      }
      dailyLogs[dateStr].push(log);
    });

    // Calculer les statistiques de présence pour chaque jour
    const presenceData = Object.entries(dailyLogs).map(([date, logs]) => {
      // Trier les logs par heure
      logs.sort((a, b) => a.eventTime.localeCompare(b.eventTime));

      // Premier et dernier badge de la journée
      const firstBadge = logs[0];
      const lastBadge = logs[logs.length - 1];

      // Calculer le temps total
      const firstTime = new Date(`${date}T${firstBadge.eventTime}`);
      const lastTime = new Date(`${date}T${lastBadge.eventTime}`);
      const totalHours = (lastTime.getTime() - firstTime.getTime()) / (1000 * 60 * 60);

      // Déterminer le statut
      let status: 'PRESENT' | 'ABSENT' | 'EN_RETARD' | 'PARTI_TOT' = 'PRESENT';
      
      // Vérifier si l'employé est en retard (premier badge après 9h)
      const firstBadgeTime = new Date(`${date}T${firstBadge.eventTime}`);
      if (firstBadgeTime.getHours() >= 9) {
        status = 'EN_RETARD';
      }

      // Vérifier si l'employé est parti tôt (dernier badge avant 17h)
      const lastBadgeTime = new Date(`${date}T${lastBadge.eventTime}`);
      if (lastBadgeTime.getHours() < 17) {
        status = 'PARTI_TOT';
      }

      return {
        date,
        firstBadge: {
          time: firstBadge.eventTime,
          reader: firstBadge.reader,
          type: firstBadge.eventType.includes('ENTREE') ? 'ENTREE' : 'SORTIE'
        },
        lastBadge: {
          time: lastBadge.eventTime,
          reader: lastBadge.reader,
          type: lastBadge.eventType.includes('ENTREE') ? 'ENTREE' : 'SORTIE'
        },
        totalHours,
        status
      };
    });

    return NextResponse.json(presenceData);
  } catch (error) {
    console.error('Error fetching employee presence data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employee presence data' },
      { status: 500 }
    );
  }
} 