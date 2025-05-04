import mongoose, { Schema, Document } from 'mongoose';

export interface IAccessRecord extends Document {
  personId: mongoose.Types.ObjectId;
  personType: 'employee' | 'visitor';
  direction: 'in' | 'out';
  location: string;
  deviceId: string;
  timestamp: Date;
  status: 'valid' | 'invalid' | 'pending';
  createdAt: Date;
  updatedAt: Date;
}

const AccessRecordSchema: Schema = new Schema(
  {
    personId: {
      type: Schema.Types.ObjectId,
      required: [true, 'ID de la personne est requis'],
      refPath: 'personType'
    },
    personType: {
      type: String,
      required: [true, 'Type de personne est requis'],
      enum: ['Employee', 'Visitor']
    },
    direction: {
      type: String,
      required: [true, 'Direction est requise'],
      enum: ['in', 'out']
    },
    location: {
      type: String,
      required: [true, 'Emplacement est requis'],
      trim: true
    },
    deviceId: {
      type: String,
      required: [true, 'ID de l\'appareil est requis'],
      trim: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['valid', 'invalid', 'pending'],
      default: 'valid'
    }
  },
  {
    timestamps: true
  }
);

// Créer des index pour améliorer les performances des requêtes
AccessRecordSchema.index({ personId: 1, timestamp: -1 });
AccessRecordSchema.index({ location: 1, timestamp: -1 });
AccessRecordSchema.index({ timestamp: -1 });
AccessRecordSchema.index({ personType: 1, timestamp: -1 });

export default mongoose.models.AccessRecord || mongoose.model<IAccessRecord>('AccessRecord', AccessRecordSchema); 