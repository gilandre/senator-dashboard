import mongoose, { Schema, Document } from 'mongoose';

export interface IAnomaly extends Document {
  title: string;
  description: string;
  type: 'access' | 'behavior' | 'system' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'investigating' | 'resolved' | 'ignored';
  location: string;
  deviceId?: string;
  personId?: mongoose.Types.ObjectId;
  personType?: 'Employee' | 'Visitor';
  timestamp: Date;
  resolvedAt?: Date;
  resolvedBy?: mongoose.Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AnomalySchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Titre est requis'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Description est requise'],
      trim: true
    },
    type: {
      type: String,
      required: [true, 'Type est requis'],
      enum: ['access', 'behavior', 'system', 'other'],
      default: 'access'
    },
    severity: {
      type: String,
      required: [true, 'Niveau de gravité est requis'],
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    status: {
      type: String,
      required: [true, 'Statut est requis'],
      enum: ['new', 'investigating', 'resolved', 'ignored'],
      default: 'new'
    },
    location: {
      type: String,
      required: [true, 'Emplacement est requis'],
      trim: true
    },
    deviceId: {
      type: String,
      trim: true
    },
    personId: {
      type: Schema.Types.ObjectId,
      refPath: 'personType'
    },
    personType: {
      type: String,
      enum: ['Employee', 'Visitor']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    resolvedAt: {
      type: Date
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Créer des index pour améliorer les performances des requêtes
AnomalySchema.index({ status: 1, timestamp: -1 });
AnomalySchema.index({ type: 1, timestamp: -1 });
AnomalySchema.index({ severity: 1, timestamp: -1 });
AnomalySchema.index({ timestamp: -1 });

export default mongoose.models.Anomaly || mongoose.model<IAnomaly>('Anomaly', AnomalySchema); 