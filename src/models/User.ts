import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends mongoose.Document {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'manager' | 'operator' | 'consultant';
  profileId?: mongoose.Types.ObjectId;
  status: 'active' | 'inactive';
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
  firstLogin: boolean;
  loginAttempts: number;
  lockedUntil: Date | null;
  lastPasswordChange: Date | null;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  twoFactorAuth?: {
    enabled: boolean;
    secret: string | null;
    recoveryCode: string | null;
    createdAt: Date | null;
    verifiedAt: Date | null;
  };
  comparePassword: (candidatePassword: string) => Promise<boolean>;
}

// Définir le schéma du modèle
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Le nom est obligatoire'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'L\'email est obligatoire'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Veuillez fournir un email valide'],
  },
  password: {
    type: String,
    required: [true, 'Le mot de passe est obligatoire'],
    minlength: 6,
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'operator', 'consultant'],
    default: 'operator',
  },
  profileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
  lastLogin: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  firstLogin: {
    type: Boolean,
    default: true,
  },
  loginAttempts: {
    type: Number,
    default: 0,
  },
  lockedUntil: {
    type: Date,
    default: null,
  },
  lastPasswordChange: {
    type: Date,
    default: null,
  },
  resetPasswordToken: {
    type: String,
    default: undefined
  },
  resetPasswordExpires: {
    type: Date,
    default: undefined
  },
  twoFactorAuth: {
    enabled: {
      type: Boolean,
      default: false
    },
    secret: {
      type: String,
      default: null
    },
    recoveryCode: {
      type: String,
      default: null
    },
    createdAt: {
      type: Date,
      default: null
    },
    verifiedAt: {
      type: Date,
      default: null
    }
  }
});

// Middleware pour hacher le mot de passe avant l'enregistrement
userSchema.pre('save', async function(next) {
  // Convertir this en any puis en IUser pour éviter l'erreur de typage
  const user = this as any as IUser;
  
  // Si le mot de passe n'a pas été modifié, passer à l'étape suivante
  if (!user.isModified('password')) return next();
  
  try {
    // Générer un sel
    const salt = await bcrypt.genSalt(10);
    // Hacher le mot de passe avec le sel
    user.password = await bcrypt.hash(user.password, salt);
    
    // Mettre à jour la date du dernier changement de mot de passe
    user.lastPasswordChange = new Date();
    
    next();
  } catch (error: any) {
    next(error);
  }
});

// Mettre à jour la date de dernière modification
userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Méthode pour comparer les mots de passe
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Méthode pour ne pas inclure le mot de passe dans les réponses
userSchema.set('toJSON', {
  transform: function(doc, ret) {
    delete ret.password;
    return ret;
  }
});

// Créer ou récupérer le modèle de façon sécurisée
let User: mongoose.Model<IUser>;

try {
  // Vérifier si le modèle existe déjà pour éviter l'erreur OverwriteModelError
  User = mongoose.model<IUser>('User');
} catch (e) {
  // Si le modèle n'existe pas, le créer
  User = mongoose.model<IUser>('User', userSchema);
}

export default User; 