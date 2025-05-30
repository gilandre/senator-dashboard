import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/backup/config/attendance:
 *   get:
 *     summary: Get attendance configuration (Backup)
 *     description: Retrieve current attendance parameters from backup system
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             example:
 *               id: 1
 *               startHour: '08:00'
 *               endHour: '17:00'
 *               dailyHours: 8.0
 *       500:
 *         description: Server error
 */
export async function GET() {
  try {
    // Récupérer les paramètres d'assiduité (toujours une seule entrée - on prend la première)
    let parameters = await prisma.attendance_parameters.findFirst();
    
    // Si aucun paramètre n'existe, créer des paramètres par défaut
    if (!parameters) {
      parameters = await prisma.attendance_parameters.create({
        data: {
          // Les valeurs par défaut sont définies dans le schéma Prisma
        }
      });
    }
    
    // Formater les données pour l'API
    return NextResponse.json({
      id: parameters.id,
      startHour: parameters.start_hour,
      endHour: parameters.end_hour,
      dailyHours: parameters.daily_hours,
      countWeekends: parameters.count_weekends,
      countHolidays: parameters.count_holidays,
      lunchBreak: parameters.lunch_break,
      lunchBreakDuration: parameters.lunch_break_duration,
      lunchBreakStart: parameters.lunch_break_start,
      lunchBreakEnd: parameters.lunch_break_end,
      allowOtherBreaks: parameters.allow_other_breaks,
      maxBreakTime: parameters.max_break_time,
      absenceRequestDeadline: parameters.absence_request_deadline,
      overtimeRequestDeadline: parameters.overtime_request_deadline,
      roundAttendanceTime: parameters.round_attendance_time,
      roundingInterval: parameters.rounding_interval,
      roundingDirection: parameters.rounding_direction,
      lastUpdated: parameters.last_updated,
      updatedBy: parameters.updated_by
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des paramètres:', error);
    
    return NextResponse.json(
      { error: 'Une erreur s\'est produite lors de la récupération des paramètres' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/backup/config/attendance:
 *   put:
 *     summary: Update attendance configuration (Backup)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startHour:
 *                 type: string
 *                 example: '08:00'
 *               endHour:
 *                 type: string
 *                 example: '17:00'
 *               dailyHours:
 *                 type: number
 *                 example: 8.5
 *     responses:
 *       200:
 *         description: Configuration updated
 *       400:
 *         description: Invalid parameters
 *       500:
 *         description: Server error
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    
    // Valider les données minimales requises
    if (!body.startHour || !body.endHour || !body.dailyHours) {
      return NextResponse.json(
        { error: 'Les champs startHour, endHour et dailyHours sont requis' },
        { status: 400 }
      );
    }
    
    // Trouver les paramètres existants ou en créer des nouveaux
    const existingParameters = await prisma.attendance_parameters.findFirst();
    
    const parameters = await prisma.attendance_parameters.upsert({
      where: {
        id: existingParameters?.id || 1, // Utilise l'ID existant ou 1 par défaut
      },
      update: {
        // Heures de travail
        start_hour: body.startHour,
        end_hour: body.endHour,
        daily_hours: parseFloat(body.dailyHours),
        count_weekends: body.countWeekends !== undefined ? body.countWeekends : undefined,
        count_holidays: body.countHolidays !== undefined ? body.countHolidays : undefined,
        
        // Paramètres de pause
        lunch_break: body.lunchBreak !== undefined ? body.lunchBreak : undefined,
        lunch_break_duration: body.lunchBreakDuration !== undefined ? body.lunchBreakDuration : undefined,
        lunch_break_start: body.lunchBreakStart || undefined,
        lunch_break_end: body.lunchBreakEnd || undefined,
        allow_other_breaks: body.allowOtherBreaks !== undefined ? body.allowOtherBreaks : undefined,
        max_break_time: body.maxBreakTime !== undefined ? body.maxBreakTime : undefined,
        
        // Dates limites
        absence_request_deadline: body.absenceRequestDeadline !== undefined ? body.absenceRequestDeadline : undefined,
        overtime_request_deadline: body.overtimeRequestDeadline !== undefined ? body.overtimeRequestDeadline : undefined,
        
        // Paramètres d'arrondi
        round_attendance_time: body.roundAttendanceTime !== undefined ? body.roundAttendanceTime : undefined,
        rounding_interval: body.roundingInterval !== undefined ? body.roundingInterval : undefined,
        rounding_direction: body.roundingDirection || undefined,
        
        // Métadonnées
        last_updated: new Date(),
        updated_by: body.updatedBy || 'system',
      },
      create: {
        // Heures de travail
        start_hour: body.startHour,
        end_hour: body.endHour,
        daily_hours: parseFloat(body.dailyHours),
        count_weekends: body.countWeekends || false,
        count_holidays: body.countHolidays || false,
        
        // Paramètres de pause
        lunch_break: body.lunchBreak || true,
        lunch_break_duration: body.lunchBreakDuration || 60,
        lunch_break_start: body.lunchBreakStart || '12:00',
        lunch_break_end: body.lunchBreakEnd || '13:00',
        allow_other_breaks: body.allowOtherBreaks || true,
        max_break_time: body.maxBreakTime || 30,
        
        // Dates limites
        absence_request_deadline: body.absenceRequestDeadline || 3,
        overtime_request_deadline: body.overtimeRequestDeadline || 5,
        
        // Paramètres d'arrondi
        round_attendance_time: body.roundAttendanceTime || false,
        rounding_interval: body.roundingInterval || 15,
        rounding_direction: body.roundingDirection || 'nearest',
        
        // Métadonnées
        last_updated: new Date(),
        updated_by: body.updatedBy || 'system',
      }
    });
    
    return NextResponse.json({
      id: parameters.id,
      message: 'Paramètres mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des paramètres:', error);
    
    return NextResponse.json(
      { error: 'Une erreur s\'est produite lors de la mise à jour des paramètres' },
      { status: 500 }
    );
  }
}