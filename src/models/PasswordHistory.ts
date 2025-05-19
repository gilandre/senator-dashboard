import mongoose from 'mongoose';

export interface IPasswordHistory extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  passwordHashes: string[]; // Liste des hachages de mots de passe précédents
  createdAt: Date;
  updatedAt: Date;
}

const passwordHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  passwordHashes: [{
    type: String,
    required: true
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Mettre à jour la date de dernière modification
passwordHistorySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Créer ou récupérer le modèle de façon sécurisée
let PasswordHistory: mongoose.Model<IPasswordHistory>;

try {
  // Vérifier si le modèle existe déjà pour éviter l'erreur OverwriteModelError
  PasswordHistory = mongoose.model<IPasswordHistory>('PasswordHistory');
} catch (e) {
  // Si le modèle n'existe pas, le créer
  PasswordHistory = mongoose.model<IPasswordHistory>('PasswordHistory', passwordHistorySchema);
}

export default PasswordHistory; 