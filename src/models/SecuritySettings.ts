import mongoose from 'mongoose';

export interface ISecuritySettings extends mongoose.Document {
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    preventReuse: number; // Nombre d'anciens mots de passe à vérifier
    expiryDays: number; // 0 = pas d'expiration
  };
  accountPolicy: {
    maxLoginAttempts: number;
    lockoutDuration: number; // durée en minutes
    forcePasswordChangeOnFirstLogin: boolean;
  };
  sessionPolicy: {
    sessionTimeout: number; // en minutes
    inactivityTimeout: number; // en minutes
    singleSessionOnly: boolean;
  };
  networkPolicy: {
    ipRestrictionEnabled: boolean;
    allowedIPs: string[]; // liste des IPs ou plages autorisées
    enforceHTTPS: boolean;
  };
  auditPolicy: {
    logLogins: boolean;
    logModifications: boolean;
    logRetentionDays: number;
    enableNotifications: boolean;
  };
  twoFactorAuth: {
    enabled: boolean;
    requiredForRoles: string[]; // 'all' ou liste de rôles
  };
  createdAt: Date;
  updatedAt: Date;
}

const securitySettingsSchema = new mongoose.Schema({
  passwordPolicy: {
    minLength: { type: Number, default: 8 },
    requireUppercase: { type: Boolean, default: true },
    requireLowercase: { type: Boolean, default: true },
    requireNumbers: { type: Boolean, default: true },
    requireSpecialChars: { type: Boolean, default: true },
    preventReuse: { type: Number, default: 3 },
    expiryDays: { type: Number, default: 90 }
  },
  accountPolicy: {
    maxLoginAttempts: { type: Number, default: 5 },
    lockoutDuration: { type: Number, default: 30 }, // minutes
    forcePasswordChangeOnFirstLogin: { type: Boolean, default: true }
  },
  sessionPolicy: {
    sessionTimeout: { type: Number, default: 60 }, // minutes
    inactivityTimeout: { type: Number, default: 15 }, // minutes
    singleSessionOnly: { type: Boolean, default: false }
  },
  networkPolicy: {
    ipRestrictionEnabled: { type: Boolean, default: false },
    allowedIPs: [{ type: String }],
    enforceHTTPS: { type: Boolean, default: true }
  },
  auditPolicy: {
    logLogins: { type: Boolean, default: true },
    logModifications: { type: Boolean, default: true },
    logRetentionDays: { type: Number, default: 365 },
    enableNotifications: { type: Boolean, default: true }
  },
  twoFactorAuth: {
    enabled: { type: Boolean, default: false },
    requiredForRoles: [{ type: String }]
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Mettre à jour la date de dernière modification
securitySettingsSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Créer ou récupérer le modèle de façon sécurisée
let SecuritySettings: mongoose.Model<ISecuritySettings>;

try {
  // Vérifier si le modèle existe déjà pour éviter l'erreur OverwriteModelError
  SecuritySettings = mongoose.model<ISecuritySettings>('SecuritySettings');
} catch (e) {
  // Si le modèle n'existe pas, le créer
  SecuritySettings = mongoose.model<ISecuritySettings>('SecuritySettings', securitySettingsSchema);
}

export default SecuritySettings; 