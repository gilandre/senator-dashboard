import mongoose, { Document, Model, Schema } from 'mongoose';

// Interface pour les fonctions d'un module
export interface IModuleFunction {
  name: string;
  description: string;
}

// Interface du module
export interface IModule extends Document {
  name: string;
  description: string;
  functions: IModuleFunction[];
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

// Schéma de fonction
const moduleFunctionSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String, required: true }
});

// Schéma du module
const moduleSchema = new Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  functions: [moduleFunctionSchema],
  order: { type: Number, default: 0 },
}, { 
  timestamps: true 
});

// Création ou récupération du modèle
let Module: Model<IModule>;

try {
  // Essayer de récupérer le modèle existant
  Module = mongoose.model<IModule>('Module');
} catch (error) {
  // Créer le modèle s'il n'existe pas
  Module = mongoose.model<IModule>('Module', moduleSchema);
}

export default Module; 