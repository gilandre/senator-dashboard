import mongoose from 'mongoose';

export interface ISecurityIncident {
  _id?: string;
  type: string;
  timestamp: string;
  userEmail?: string;
  userId?: string;
  ipAddress: string;
  details?: string;
  status: 'info' | 'alert' | 'blocked' | 'resolved' | 'locked';
  metadata?: Record<string, any>;
}

export interface ISecurityIncidentDocument extends mongoose.Document {
  type: string; // Type d'incident
  userId: mongoose.Types.ObjectId | null; // Utilisateur concerné (peut être null pour incidents non liés à un utilisateur)
  userEmail: string | null; // Email de l'utilisateur pour faciliter les recherches
  ipAddress: string;
  details: string;
  status: 'resolved' | 'blocked' | 'alert' | 'locked' | 'info';
  timestamp: Date;
}

const securityIncidentSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: [
      'failed_login',
      'account_locked',
      'password_change',
      'unauthorized_access',
      'session_expired',
      'unusual_ip',
      'password_reset',
      'admin_action',
      'security_setting_change',
      'other'
    ]
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  userEmail: {
    type: String,
    default: null
  },
  ipAddress: {
    type: String,
    required: true
  },
  details: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['resolved', 'blocked', 'alert', 'locked', 'info'],
    default: 'info'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Index pour améliorer les performances des recherches
securityIncidentSchema.index({ timestamp: -1 });
securityIncidentSchema.index({ userId: 1, timestamp: -1 });
securityIncidentSchema.index({ ipAddress: 1, timestamp: -1 });
securityIncidentSchema.index({ type: 1, timestamp: -1 });

// Créer ou récupérer le modèle de façon sécurisée
let SecurityIncident: mongoose.Model<ISecurityIncident>;

try {
  // Vérifier si le modèle existe déjà pour éviter l'erreur OverwriteModelError
  SecurityIncident = mongoose.model<ISecurityIncident>('SecurityIncident');
} catch (e) {
  // Si le modèle n'existe pas, le créer
  SecurityIncident = mongoose.model<ISecurityIncident>('SecurityIncident', securityIncidentSchema);
}

export default SecurityIncident; 