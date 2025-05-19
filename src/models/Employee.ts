import mongoose, { Schema, Document } from 'mongoose';

export interface IEmployee extends Document {
  badgeNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string;
  phone?: string;
  department?: string;
  position?: string;
  status?: string;
  group?: string;
  employeeId?: string;
  joinDate?: Date;
  leaveDate?: Date;
  profileImage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSchema: Schema = new Schema(
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
    department: {
      type: String,
      trim: true,
      index: true,
    },
    position: {
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
    employeeId: {
      type: String,
      trim: true,
      sparse: true,
    },
    joinDate: {
      type: Date,
    },
    leaveDate: {
      type: Date,
    },
    profileImage: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Créer des index pour améliorer les performances des requêtes
EmployeeSchema.index({ status: 1 });
EmployeeSchema.index({ department: 1 });
EmployeeSchema.index({ badgeNumber: 1 }, { unique: true });
EmployeeSchema.index({ employeeId: 1 }, { sparse: true });
EmployeeSchema.index({ email: 1 }, { sparse: true });

export default mongoose.models.Employee || mongoose.model<IEmployee>('Employee', EmployeeSchema); 