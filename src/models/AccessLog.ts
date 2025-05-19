import mongoose, { Schema } from 'mongoose';

// Définir le schéma du modèle
const accessLogSchema = new Schema(
  {
    badgeNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    personId: {
      type: Schema.Types.ObjectId,
      refPath: 'personModel',
    },
    personModel: {
      type: String,
      enum: ['Employee', 'Visitor'],
      default: 'Employee',
    },
    eventDate: {
      type: String,
      required: true,
    },
    eventTime: {
      type: String,
      required: true,
    },
    controller: {
      type: String,
      trim: true,
    },
    reader: {
      type: String,
      trim: true,
      index: true,
    },
    eventType: {
      type: String,
      trim: true,
    },
    direction: {
      type: String,
      enum: ['in', 'out', 'unknown'],
      default: 'unknown',
    },
    isVisitor: {
      type: Boolean,
      default: false,
      index: true,
    },
    rawData: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Créer des index composites pour les requêtes courantes
accessLogSchema.index({ badgeNumber: 1, eventDate: 1, eventTime: 1 });
accessLogSchema.index({ reader: 1, eventDate: 1 });
accessLogSchema.index({ personId: 1, eventDate: 1 });
accessLogSchema.index({ isVisitor: 1, eventDate: 1 });
accessLogSchema.index({ direction: 1, eventDate: 1 });

// Vérifier si le modèle existe déjà pour éviter les erreurs lors du rechargement à chaud
const AccessLog = mongoose.models.AccessLog || mongoose.model('AccessLog', accessLogSchema);

export default AccessLog; 