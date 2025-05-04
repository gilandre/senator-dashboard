import mongoose, { Schema, Document } from 'mongoose';

export interface IVisitor extends Document {
  badgeNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string;
  phone?: string;
  company?: string;
  department?: string;
  purpose?: string;
  status?: string;
  group?: string;
  visitDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const VisitorSchema: Schema = new Schema(
  {
    badgeNumber: {
      type: String,
      required: [true, 'Le numéro de badge est requis'],
      unique: true,
      trim: true,
      index: true,
    },
    firstName: {
      type: String,
      required: [true, 'Le prénom est requis'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Le nom est requis'],
      trim: true,
    },
    fullName: {
      type: String,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
    },
    department: {
      type: String,
      trim: true,
    },
    purpose: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      default: 'active',
      index: true,
    },
    group: {
      type: String,
      trim: true,
    },
    visitDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Créer des index pour améliorer les performances des requêtes
VisitorSchema.index({ status: 1 });
VisitorSchema.index({ company: 1 });
VisitorSchema.index({ visitDate: 1 });
VisitorSchema.index({ badgeNumber: 1 }, { unique: true });

export default mongoose.models.Visitor || mongoose.model<IVisitor>('Visitor', VisitorSchema); 