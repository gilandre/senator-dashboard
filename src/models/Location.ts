import mongoose, { Schema, Document } from 'mongoose';

export interface ILocation extends Document {
  name: string;
  type: 'entrance' | 'exit' | 'room' | 'area';
  building?: string;
  floor?: number;
  capacity?: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LocationSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['entrance', 'exit', 'room', 'area'],
      default: 'entrance',
    },
    building: {
      type: String,
      trim: true,
    },
    floor: {
      type: Number,
    },
    capacity: {
      type: Number,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Location || mongoose.model<ILocation>('Location', LocationSchema); 