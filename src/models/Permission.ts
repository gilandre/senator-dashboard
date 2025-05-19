import mongoose, { Document, Schema } from 'mongoose';

export interface IPermission extends Document {
  name: string;
  description: string;
  code: string;
  module: string;
  isModule: boolean;
  isFunction: boolean;
  parentModule?: string;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  approve: boolean;
  export: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

const PermissionSchema = new Schema<IPermission>(
  {
    name: { 
      type: String, 
      required: true,
      trim: true 
    },
    description: { 
      type: String,
      default: '' 
    },
    code: {
      type: String,
      required: true,
      trim: true
    },
    module: { 
      type: String,
      required: true,
      default: 'default'
    },
    isModule: {
      type: Boolean,
      default: false
    },
    isFunction: {
      type: Boolean,
      default: false
    },
    parentModule: {
      type: String,
      default: null
    },
    view: {
      type: Boolean,
      default: false
    },
    create: {
      type: Boolean,
      default: false
    },
    edit: {
      type: Boolean,
      default: false
    },
    delete: {
      type: Boolean,
      default: false
    },
    approve: {
      type: Boolean,
      default: false
    },
    export: {
      type: Boolean,
      default: false
    },
    createdBy: {
      type: String,
      default: 'Système'
    },
    updatedBy: {
      type: String,
      default: 'Système'
    }
  },
  { timestamps: true }
);

// Créer un index sur le code pour garantir l'unicité
PermissionSchema.index({ code: 1 }, { unique: true });

// Créer ou récupérer le modèle de façon sécurisée
let Permission: mongoose.Model<IPermission>;

try {
  // Vérifier si le modèle existe déjà
  Permission = mongoose.model<IPermission>('Permission');
} catch (e) {
  // Si le modèle n'existe pas, le créer
  Permission = mongoose.model<IPermission>('Permission', PermissionSchema);
}

export default Permission; 