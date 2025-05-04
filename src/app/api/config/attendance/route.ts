import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import AttendanceConfig, { IAttendanceConfig } from '@/models/AttendanceConfig';
import { connectToDatabase } from '@/lib/mongodb';

// GET /api/config/attendance - Récupérer la configuration d'assiduité
export async function GET() {
  try {
    await connectToDatabase();
    
    // Récupérer la configuration d'assiduité (toujours une seule entrée)
    let config = await AttendanceConfig.findOne().lean() as any;
    
    // Si aucune configuration n'existe, créer une configuration par défaut
    if (!config) {
      const defaultConfig = new AttendanceConfig();
      await defaultConfig.save();
      config = defaultConfig.toObject();
    }
    
    // Formater les données pour l'API
    return NextResponse.json({
      id: config._id.toString(),
      startHour: config.startHour,
      endHour: config.endHour,
      dailyHours: config.dailyHours,
      countWeekends: config.countWeekends,
      countHolidays: config.countHolidays,
      lunchBreak: config.lunchBreak,
      lunchBreakDuration: config.lunchBreakDuration,
      lunchBreakStart: config.lunchBreakStart,
      lunchBreakEnd: config.lunchBreakEnd,
      allowOtherBreaks: config.allowOtherBreaks,
      maxBreakTime: config.maxBreakTime,
      absenceRequestDeadline: config.absenceRequestDeadline,
      overtimeRequestDeadline: config.overtimeRequestDeadline,
      roundAttendanceTime: config.roundAttendanceTime,
      roundingInterval: config.roundingInterval,
      roundingDirection: config.roundingDirection,
      lastUpdated: config.lastUpdated,
      updatedBy: config.updatedBy
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la configuration:', error);
    
    if (error instanceof mongoose.Error || error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Une erreur s\'est produite lors de la récupération de la configuration' },
      { status: 500 }
    );
  }
}

// PUT /api/config/attendance - Mettre à jour la configuration d'assiduité
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
    
    await connectToDatabase();
    
    // Trouver la configuration existante ou en créer une nouvelle
    let config = await AttendanceConfig.findOne();
    if (!config) {
      config = new AttendanceConfig();
    }
    
    // Mettre à jour les champs avec les nouvelles valeurs
    // Heures de travail
    config.startHour = body.startHour;
    config.endHour = body.endHour;
    config.dailyHours = body.dailyHours;
    config.countWeekends = body.countWeekends ?? config.countWeekends;
    config.countHolidays = body.countHolidays ?? config.countHolidays;
    
    // Paramètres de pause
    config.lunchBreak = body.lunchBreak ?? config.lunchBreak;
    config.lunchBreakDuration = body.lunchBreakDuration ?? config.lunchBreakDuration;
    config.lunchBreakStart = body.lunchBreakStart ?? config.lunchBreakStart;
    config.lunchBreakEnd = body.lunchBreakEnd ?? config.lunchBreakEnd;
    config.allowOtherBreaks = body.allowOtherBreaks ?? config.allowOtherBreaks;
    config.maxBreakTime = body.maxBreakTime ?? config.maxBreakTime;
    
    // Dates limites
    config.absenceRequestDeadline = body.absenceRequestDeadline ?? config.absenceRequestDeadline;
    config.overtimeRequestDeadline = body.overtimeRequestDeadline ?? config.overtimeRequestDeadline;
    
    // Paramètres d'arrondi
    config.roundAttendanceTime = body.roundAttendanceTime ?? config.roundAttendanceTime;
    config.roundingInterval = body.roundingInterval ?? config.roundingInterval;
    config.roundingDirection = body.roundingDirection ?? config.roundingDirection;
    
    // Métadonnées
    config.lastUpdated = new Date();
    config.updatedBy = body.updatedBy || 'system';
    
    // Sauvegarder les modifications
    await config.save();
    
    return NextResponse.json({
      id: config._id.toString(),
      message: 'Configuration mise à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la configuration:', error);
    
    if (error instanceof mongoose.Error || error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Une erreur s\'est produite lors de la mise à jour de la configuration' },
      { status: 500 }
    );
  }
} 