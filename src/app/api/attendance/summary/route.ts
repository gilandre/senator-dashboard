import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AuthLogger } from '@/lib/security/authLogger';

/**
 * GET /api/attendance/summary - Récupérer le résumé des présences
 */
export async function GET(req: NextRequest) {
  try {
    // Vérification de l'authentification
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    // Récupérer les paramètres de la requête
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const department = searchParams.get('department');
    const groupBy = searchParams.get('groupBy') || 'day'; // day, week, month

    // Valider les dates
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Les dates de début et de fin sont requises" },
        { status: 400 }
      );
    }

    // Construire la requête de base
    const baseWhere = {
      date: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      },
      ...(department && {
        employee: {
          department: department
        }
      })
    };

    // Récupérer les données d'assiduité
    const attendance = await prisma.attendance.findMany({
      where: baseWhere,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employee_id: true,
            department: true
          }
        }
      },
      orderBy: {
        date: 'asc'
      }
    });

    // Calculer les statistiques selon le groupement demandé
    let summary;
    switch (groupBy) {
      case 'week':
        summary = await calculateWeeklySummary(attendance);
        break;
      case 'month':
        summary = await calculateMonthlySummary(attendance);
        break;
      default:
        summary = await calculateDailySummary(attendance);
    }

    // Calculer les statistiques globales
    const globalStats = await calculateGlobalStats(attendance);

    // Enregistrer l'activité
    await AuthLogger.logActivity(
      session.user.id,
      'attendance_summary_view',
      `Consultation du résumé des présences du ${startDate} au ${endDate}`
    );

    return NextResponse.json({
      summary,
      globalStats,
      period: {
        startDate,
        endDate,
        groupBy
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du résumé des présences:', error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du résumé des présences" },
      { status: 500 }
    );
  }
}

/**
 * Calculer le résumé quotidien
 */
async function calculateDailySummary(attendance: any[]) {
  const dailyStats = new Map();

  attendance.forEach(record => {
    const date = record.date.toISOString().split('T')[0];
    if (!dailyStats.has(date)) {
      dailyStats.set(date, {
        date,
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        departments: new Map()
      });
    }

    const stats = dailyStats.get(date);
    stats.total++;
    
    // Incrémenter le compteur selon le statut
    switch (record.status) {
      case 'present':
        stats.present++;
        break;
      case 'absent':
        stats.absent++;
        break;
      case 'late':
        stats.late++;
        break;
      case 'excused':
        stats.excused++;
        break;
    }

    // Statistiques par département
    const dept = record.employee.department;
    if (!stats.departments.has(dept)) {
      stats.departments.set(dept, {
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0
      });
    }

    const deptStats = stats.departments.get(dept);
    deptStats.total++;
    switch (record.status) {
      case 'present':
        deptStats.present++;
        break;
      case 'absent':
        deptStats.absent++;
        break;
      case 'late':
        deptStats.late++;
        break;
      case 'excused':
        deptStats.excused++;
        break;
    }
  });

  // Convertir les Map en objets pour le JSON
  return Array.from(dailyStats.values()).map(day => ({
    ...day,
    departments: Object.fromEntries(
      Array.from(day.departments.entries()).map(([dept, stats]) => [
        dept,
        {
          ...stats,
          presentRate: stats.total > 0 ? (stats.present / stats.total) * 100 : 0,
          absentRate: stats.total > 0 ? (stats.absent / stats.total) * 100 : 0,
          lateRate: stats.total > 0 ? (stats.late / stats.total) * 100 : 0,
          excusedRate: stats.total > 0 ? (stats.excused / stats.total) * 100 : 0
        }
      ])
    ),
    presentRate: day.total > 0 ? (day.present / day.total) * 100 : 0,
    absentRate: day.total > 0 ? (day.absent / day.total) * 100 : 0,
    lateRate: day.total > 0 ? (day.late / day.total) * 100 : 0,
    excusedRate: day.total > 0 ? (day.excused / day.total) * 100 : 0
  }));
}

/**
 * Calculer le résumé hebdomadaire
 */
async function calculateWeeklySummary(attendance: any[]) {
  const weeklyStats = new Map();

  attendance.forEach(record => {
    const date = new Date(record.date);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay()); // Début de la semaine (dimanche)
    const weekKey = weekStart.toISOString().split('T')[0];

    if (!weeklyStats.has(weekKey)) {
      weeklyStats.set(weekKey, {
        weekStart: weekKey,
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        departments: new Map()
      });
    }

    const stats = weeklyStats.get(weekKey);
    stats.total++;
    
    // Incrémenter les compteurs comme dans calculateDailySummary
    switch (record.status) {
      case 'present':
        stats.present++;
        break;
      case 'absent':
        stats.absent++;
        break;
      case 'late':
        stats.late++;
        break;
      case 'excused':
        stats.excused++;
        break;
    }

    // Statistiques par département
    const dept = record.employee.department;
    if (!stats.departments.has(dept)) {
      stats.departments.set(dept, {
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0
      });
    }

    const deptStats = stats.departments.get(dept);
    deptStats.total++;
    switch (record.status) {
      case 'present':
        deptStats.present++;
        break;
      case 'absent':
        deptStats.absent++;
        break;
      case 'late':
        deptStats.late++;
        break;
      case 'excused':
        deptStats.excused++;
        break;
    }
  });

  // Convertir les Map en objets pour le JSON
  return Array.from(weeklyStats.values()).map(week => ({
    ...week,
    departments: Object.fromEntries(
      Array.from(week.departments.entries()).map(([dept, stats]) => [
        dept,
        {
          ...stats,
          presentRate: stats.total > 0 ? (stats.present / stats.total) * 100 : 0,
          absentRate: stats.total > 0 ? (stats.absent / stats.total) * 100 : 0,
          lateRate: stats.total > 0 ? (stats.late / stats.total) * 100 : 0,
          excusedRate: stats.total > 0 ? (stats.excused / stats.total) * 100 : 0
        }
      ])
    ),
    presentRate: week.total > 0 ? (week.present / week.total) * 100 : 0,
    absentRate: week.total > 0 ? (week.absent / week.total) * 100 : 0,
    lateRate: week.total > 0 ? (week.late / week.total) * 100 : 0,
    excusedRate: week.total > 0 ? (week.excused / week.total) * 100 : 0
  }));
}

/**
 * Calculer le résumé mensuel
 */
async function calculateMonthlySummary(attendance: any[]) {
  const monthlyStats = new Map();

  attendance.forEach(record => {
    const date = new Date(record.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!monthlyStats.has(monthKey)) {
      monthlyStats.set(monthKey, {
        month: monthKey,
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        departments: new Map()
      });
    }

    const stats = monthlyStats.get(monthKey);
    stats.total++;
    
    // Incrémenter les compteurs comme dans calculateDailySummary
    switch (record.status) {
      case 'present':
        stats.present++;
        break;
      case 'absent':
        stats.absent++;
        break;
      case 'late':
        stats.late++;
        break;
      case 'excused':
        stats.excused++;
        break;
    }

    // Statistiques par département
    const dept = record.employee.department;
    if (!stats.departments.has(dept)) {
      stats.departments.set(dept, {
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0
      });
    }

    const deptStats = stats.departments.get(dept);
    deptStats.total++;
    switch (record.status) {
      case 'present':
        deptStats.present++;
        break;
      case 'absent':
        deptStats.absent++;
        break;
      case 'late':
        deptStats.late++;
        break;
      case 'excused':
        deptStats.excused++;
        break;
    }
  });

  // Convertir les Map en objets pour le JSON
  return Array.from(monthlyStats.values()).map(month => ({
    ...month,
    departments: Object.fromEntries(
      Array.from(month.departments.entries()).map(([dept, stats]) => [
        dept,
        {
          ...stats,
          presentRate: stats.total > 0 ? (stats.present / stats.total) * 100 : 0,
          absentRate: stats.total > 0 ? (stats.absent / stats.total) * 100 : 0,
          lateRate: stats.total > 0 ? (stats.late / stats.total) * 100 : 0,
          excusedRate: stats.total > 0 ? (stats.excused / stats.total) * 100 : 0
        }
      ])
    ),
    presentRate: month.total > 0 ? (month.present / month.total) * 100 : 0,
    absentRate: month.total > 0 ? (month.absent / month.total) * 100 : 0,
    lateRate: month.total > 0 ? (month.late / month.total) * 100 : 0,
    excusedRate: month.total > 0 ? (month.excused / month.total) * 100 : 0
  }));
}

/**
 * Calculer les statistiques globales
 */
async function calculateGlobalStats(attendance: any[]) {
  const total = attendance.length;
  const present = attendance.filter(a => a.status === 'present').length;
  const absent = attendance.filter(a => a.status === 'absent').length;
  const late = attendance.filter(a => a.status === 'late').length;
  const excused = attendance.filter(a => a.status === 'excused').length;

  // Statistiques par département
  const deptStats = new Map();
  attendance.forEach(record => {
    const dept = record.employee.department;
    if (!deptStats.has(dept)) {
      deptStats.set(dept, {
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0
      });
    }

    const stats = deptStats.get(dept);
    stats.total++;
    switch (record.status) {
      case 'present':
        stats.present++;
        break;
      case 'absent':
        stats.absent++;
        break;
      case 'late':
        stats.late++;
        break;
      case 'excused':
        stats.excused++;
        break;
    }
  });

  return {
    total,
    present,
    absent,
    late,
    excused,
    presentRate: total > 0 ? (present / total) * 100 : 0,
    absentRate: total > 0 ? (absent / total) * 100 : 0,
    lateRate: total > 0 ? (late / total) * 100 : 0,
    excusedRate: total > 0 ? (excused / total) * 100 : 0,
    departments: Object.fromEntries(
      Array.from(deptStats.entries()).map(([dept, stats]) => [
        dept,
        {
          ...stats,
          presentRate: stats.total > 0 ? (stats.present / stats.total) * 100 : 0,
          absentRate: stats.total > 0 ? (stats.absent / stats.total) * 100 : 0,
          lateRate: stats.total > 0 ? (stats.late / stats.total) * 100 : 0,
          excusedRate: stats.total > 0 ? (stats.excused / stats.total) * 100 : 0
        }
      ])
    )
  };
} 