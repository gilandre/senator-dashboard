import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PresenceRecord, PresenceStatus, PresenceStats } from '@/types/presence';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Vérifier que l'employé existe
    const employee = await prisma.employees.findUnique({
      where: { badge_number: params.id }
    });
    
    if (!employee) {
      return NextResponse.json(
        { error: 'Employé non trouvé' },
        { status: 404 }
      );
    }

    // Récupérer les logs d'accès avec les filtres de date
    const accessLogs = await prisma.access_logs.findMany({
      where: { 
        badge_number: params.id,
        person_type: 'employee',
        ...(startDate && endDate ? {
          event_date: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        } : {})
      },
      orderBy: [
        { event_date: 'asc' },
        { event_time: 'asc' }
      ]
    });

    // Récupérer les pauses déjeuner
    const lunchBreaks = await prisma.lunch_breaks.findMany({
      where: {
        employee_id: employee.id,
        ...(startDate && endDate ? {
          date: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        } : {})
      }
    });

    // Récupérer les jours fériés
    const holidays = await prisma.holidays.findMany({
      where: {
        date: {
          gte: startDate ? new Date(startDate) : undefined,
          lte: endDate ? new Date(endDate) : undefined
        }
      }
    });

    // Grouper les logs par jour
    const dailyLogs: { [key: string]: any[] } = {};
    accessLogs.forEach(log => {
      const dateStr = log.event_date.toISOString().split('T')[0];
      if (!dailyLogs[dateStr]) {
        dailyLogs[dateStr] = [];
      }
      dailyLogs[dateStr].push(log);
    });

    // Calculer les statistiques de présence pour chaque jour
    const presenceData: PresenceRecord[] = Object.entries(dailyLogs).map(([date, logs]) => {
      // Premier et dernier badge de la journée
      const firstBadge = logs[0];
      const lastBadge = logs[logs.length - 1];

      // Vérifier si c'est un jour férié
      const isHoliday = holidays.some(holiday => {
        const holidayDate = holiday.date;
        const currentDate = new Date(date);
        return holidayDate.getMonth() === currentDate.getMonth() &&
               holidayDate.getDate() === currentDate.getDate();
      });

      if (isHoliday) {
        return {
          date,
          firstBadge: {
            time: '--:--:--',
            reader: 'Jour férié',
            type: 'ENTREE'
          },
          lastBadge: {
            time: '--:--:--',
            reader: 'Jour férié',
            type: 'SORTIE'
          },
          totalHours: 0,
          status: 'JOUR_FERIE'
        };
      }

      // Calculer le temps total en tenant compte de la pause déjeuner
      const firstTime = new Date(`${date}T${firstBadge.event_time.toTimeString()}`);
      const lastTime = new Date(`${date}T${lastBadge.event_time.toTimeString()}`);
      let totalHours = (lastTime.getTime() - firstTime.getTime()) / (1000 * 60 * 60);

      // Soustraire la durée de la pause déjeuner si elle existe
      const lunchBreak = lunchBreaks.find(break_ => 
        break_.date.toISOString().split('T')[0] === date
      );

      if (lunchBreak) {
        totalHours -= lunchBreak.duration / 60; // Convertir les minutes en heures
      }

      // Déterminer le statut
      let status: PresenceStatus = 'PRESENT';
      
      // Vérifier si l'employé est en retard (premier badge après 9h)
      const firstBadgeTime = new Date(`${date}T${firstBadge.event_time.toTimeString()}`);
      if (firstBadgeTime.getHours() >= 9) {
        status = 'EN_RETARD';
      }

      // Vérifier si l'employé est parti tôt (dernier badge avant 17h)
      const lastBadgeTime = new Date(`${date}T${lastBadge.event_time.toTimeString()}`);
      if (lastBadgeTime.getHours() < 17) {
        status = 'PARTI_TOT';
      }

      // Vérifier si c'est une journée continue (plus de 6 heures sans badge)
      const hasLongBreak = logs.some((log, index) => {
        if (index === logs.length - 1) return false;
        const currentTime = new Date(`${date}T${log.event_time.toTimeString()}`);
        const nextTime = new Date(`${date}T${logs[index + 1].event_time.toTimeString()}`);
        const breakHours = (nextTime.getTime() - currentTime.getTime()) / (1000 * 60 * 60);
        return breakHours > 6;
      });

      if (hasLongBreak) {
        status = 'JOURNEE_CONTINUE';
      }

      return {
        date,
        firstBadge: {
          time: firstBadge.event_time.toTimeString().substring(0, 8),
          reader: firstBadge.reader || 'Inconnu',
          type: firstBadge.event_type === 'entry' ? 'ENTREE' : 'SORTIE'
        },
        lastBadge: {
          time: lastBadge.event_time.toTimeString().substring(0, 8),
          reader: lastBadge.reader || 'Inconnu',
          type: lastBadge.event_type === 'entry' ? 'ENTREE' : 'SORTIE'
        },
        totalHours,
        status
      };
    });

    // Calculer les statistiques hebdomadaires
    const weeklyStats = presenceData.reduce((acc: { [key: string]: { totalHours: number; count: number } }, record) => {
      const date = parseISO(record.date);
      const weekStart = format(startOfWeek(date, { locale: fr }), 'yyyy-MM-dd');
      
      if (!acc[weekStart]) {
        acc[weekStart] = { totalHours: 0, count: 0 };
      }
      
      if (record.status === 'PRESENT' || record.status === 'JOURNEE_CONTINUE') {
        acc[weekStart].totalHours += record.totalHours;
        acc[weekStart].count += 1;
      }
      
      return acc;
    }, {});

    // Calculer les statistiques mensuelles
    const monthlyStats = presenceData.reduce((acc: { [key: string]: { totalHours: number; count: number } }, record) => {
      const date = parseISO(record.date);
      const monthStart = format(startOfMonth(date), 'yyyy-MM');
      
      if (!acc[monthStart]) {
        acc[monthStart] = { totalHours: 0, count: 0 };
      }
      
      if (record.status === 'PRESENT' || record.status === 'JOURNEE_CONTINUE') {
        acc[monthStart].totalHours += record.totalHours;
        acc[monthStart].count += 1;
      }
      
      return acc;
    }, {});

    // Formater les statistiques pour la réponse
    const stats: PresenceStats = {
      daily: presenceData,
      weekly: Object.entries(weeklyStats).map(([week, data]) => ({
        day: format(parseISO(week), 'dd/MM/yyyy', { locale: fr }),
        avgDuration: data.count > 0 ? data.totalHours / data.count : 0,
        count: data.count
      })),
      monthly: Object.entries(monthlyStats).map(([month, data]) => ({
        week: format(parseISO(month + '-01'), 'MMMM yyyy', { locale: fr }),
        avgDuration: data.count > 0 ? data.totalHours / data.count : 0,
        count: data.count
      })),
      yearly: [] // À implémenter si nécessaire
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching employee presence data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employee presence data' },
      { status: 500 }
    );
  }
} 