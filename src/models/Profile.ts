import mongoose, { Document, Schema } from 'mongoose';

export interface IProfile extends Document {
  name: string;
  description: string;
  isAdmin: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProfileSchema = new Schema<IProfile>(
  {
    name: { 
      type: String, 
      required: true, 
      unique: true,
      trim: true
    },
    description: { 
      type: String, 
      required: true 
    },
    isAdmin: { 
      type: Boolean, 
      default: false 
    },
    isDefault: { 
      type: Boolean, 
      default: false 
    }
  },
  { timestamps: true }
);

// Middleware pour garantir qu'il y a au plus un profil par défaut
ProfileSchema.pre('save', async function(next) {
  // Si ce profil est défini comme par défaut
  if (this.isDefault) {
    try {
      // Vérifier si le modèle Profile existe déjà
      const ProfileModel = mongoose.models.Profile || 
        mongoose.model<IProfile>('Profile', ProfileSchema);
      
      // Trouver tous les autres profils par défaut et les mettre à false
      await ProfileModel.updateMany(
        { _id: { $ne: this._id }, isDefault: true },
        { isDefault: false }
      );
    } catch (error) {
      console.error("Erreur lors de la mise à jour des profils par défaut:", error);
    }
  }
  next();
});

// Créer ou récupérer le modèle de façon sécurisée
let Profile: mongoose.Model<IProfile>;

try {
  // Vérifier si le modèle existe déjà
  Profile = mongoose.model<IProfile>('Profile');
} catch (e) {
  // Si le modèle n'existe pas, le créer
  Profile = mongoose.model<IProfile>('Profile', ProfileSchema);
}

export default Profile; 