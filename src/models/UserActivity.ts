import mongoose from 'mongoose';

export interface IUserActivity extends mongoose.Document {
  userId: mongoose.Types.ObjectId | string;
  userName: string;
  action: string;
  timestamp: Date;
  details?: string;
}

// Définir le schéma du modèle
const userActivitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  userName: {
    type: String,
    required: true,
  },
  action: {
    type: String,
    required: true,
    enum: ['login', 'logout', 'create', 'update', 'delete', 'passwordChange'],
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  details: {
    type: String,
  },
});

// Créer des index pour améliorer les performances des requêtes
userActivitySchema.index({ userId: 1, timestamp: -1 });
userActivitySchema.index({ timestamp: -1 });

// Vérifier si le modèle existe déjà pour éviter les erreurs lors du rechargement à chaud
const UserActivity = mongoose.models.UserActivity || mongoose.model<IUserActivity>('UserActivity', userActivitySchema);

export default UserActivity; 