import mongoose from 'mongoose';

// Définir l'interface pour le type
export interface IHoliday extends mongoose.Document {
  name: string;
  date: Date;
  type: 'national' | 'religious' | 'special' | 'continuous';
  description?: string;
  repeatsYearly: boolean;
}

// Définir le schéma du modèle
const holidaySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  date: {
    type: Date,
    required: true,
    index: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['national', 'religious', 'special', 'continuous'],
    default: 'national',
  },
  description: {
    type: String,
    trim: true,
  },
  repeatsYearly: {
    type: Boolean,
    default: false
  }
});

// Vérifier si le modèle existe déjà pour éviter les erreurs lors du rechargement à chaud
const Holiday = mongoose.models.Holiday || mongoose.model<IHoliday>('Holiday', holidaySchema);

export default Holiday; 