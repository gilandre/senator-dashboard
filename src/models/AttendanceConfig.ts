import mongoose from 'mongoose';

// Définir l'interface pour la configuration de présence
export interface IAttendanceConfig extends mongoose.Document {
  // Heures de travail
  startHour: string;
  endHour: string;
  dailyHours: number;
  countWeekends: boolean;
  countHolidays: boolean;
  
  // Paramètres de pause
  lunchBreak: boolean;
  lunchBreakDuration: number;
  lunchBreakStart: string;
  lunchBreakEnd: string;
  allowOtherBreaks: boolean;
  maxBreakTime: number;

  // Dates limites
  absenceRequestDeadline: number; // Jours avant pour demander une absence
  overtimeRequestDeadline: number; // Jours après pour déclarer des heures sup

  // Paramètres d'arrondi
  roundAttendanceTime: boolean;
  roundingInterval: number; // Minutes (5, 10, 15, etc.)
  roundingDirection: 'up' | 'down' | 'nearest';

  // Métadonnées
  lastUpdated: Date;
  updatedBy: string;
}

// Définir le schéma du modèle
const attendanceConfigSchema = new mongoose.Schema({
  // Heures de travail
  startHour: {
    type: String,
    required: true,
    default: '08:00'
  },
  endHour: {
    type: String,
    required: true,
    default: '17:00'
  },
  dailyHours: {
    type: Number,
    required: true,
    default: 8
  },
  countWeekends: {
    type: Boolean,
    default: false
  },
  countHolidays: {
    type: Boolean,
    default: false
  },
  
  // Paramètres de pause
  lunchBreak: {
    type: Boolean,
    default: true
  },
  lunchBreakDuration: {
    type: Number,
    default: 60
  },
  lunchBreakStart: {
    type: String,
    default: '12:00'
  },
  lunchBreakEnd: {
    type: String,
    default: '13:00'
  },
  allowOtherBreaks: {
    type: Boolean,
    default: true
  },
  maxBreakTime: {
    type: Number,
    default: 30
  },

  // Dates limites
  absenceRequestDeadline: {
    type: Number,
    default: 3
  },
  overtimeRequestDeadline: {
    type: Number,
    default: 5
  },

  // Paramètres d'arrondi
  roundAttendanceTime: {
    type: Boolean,
    default: false
  },
  roundingInterval: {
    type: Number,
    default: 15
  },
  roundingDirection: {
    type: String,
    enum: ['up', 'down', 'nearest'],
    default: 'nearest'
  },

  // Métadonnées
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: String,
    default: 'system'
  }
});

// Vérifier si le modèle existe déjà pour éviter les erreurs lors du rechargement à chaud
const AttendanceConfig = mongoose.models.AttendanceConfig || 
  mongoose.model<IAttendanceConfig>('AttendanceConfig', attendanceConfigSchema);

export default AttendanceConfig; 