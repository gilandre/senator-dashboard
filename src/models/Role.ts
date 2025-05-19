import mongoose, { Document, Schema } from 'mongoose';

export interface IRole extends Document {
  name: string;
  description: string;
  permissions: mongoose.Types.ObjectId[];
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema = new Schema<IRole>(
  {
    name: { 
      type: String, 
      required: true, 
      unique: true,
      trim: true 
    },
    description: { 
      type: String, 
      default: ''
    },
    permissions: [{ 
      type: Schema.Types.ObjectId, 
      ref: 'Permission' 
    }],
    isActive: { 
      type: Boolean, 
      default: true 
    },
    isDefault: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

// Assurez-vous qu'il n'y a pas plus d'un rôle par défaut
RoleSchema.pre('save', async function(next) {
  // Si ce rôle est défini comme par défaut
  if (this.isDefault && (this.isModified('isDefault') || this.isNew)) {
    try {
      // Définir tous les autres rôles comme non-défaut
      await mongoose.model('Role').updateMany(
        { _id: { $ne: this._id } },
        { $set: { isDefault: false } }
      );
    } catch (error) {
      return next(new Error('Erreur lors de la mise à jour des rôles par défaut'));
    }
  }
  next();
});

export default mongoose.models.Role || 
  mongoose.model<IRole>('Role', RoleSchema); 