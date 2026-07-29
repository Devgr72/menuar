import mongoose, { Schema } from 'mongoose';
import { genId } from '../id.js';

export type ModelStatus = 'pending' | 'bg_removing' | 'bg_done' | 'generating_3d' | 'compressing' | 'ready' | 'failed';
export type ModelSource = 'procedural' | 'tripo' | 'hunyuan';

export interface IDish {
  _id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  isVeg: boolean;
  spiceLevel: number;
  allergens: string[];
  isAvailable: boolean;
  modelUrl?: string;
  thumbnailUrl?: string;
  modelStatus: ModelStatus;
  modelSource: ModelSource;
  aiDescription?: string;
  translations: Record<string, unknown>;
  createdAt: Date;
}

const dishSchema = new Schema(
  {
    _id: { type: String, default: genId },
    categoryId: { type: String, ref: 'Category', required: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true },
    isVeg: { type: Boolean, default: false },
    spiceLevel: { type: Number, default: 0 },
    allergens: { type: [String], default: [] },
    isAvailable: { type: Boolean, default: true },
    modelUrl: { type: String },
    thumbnailUrl: { type: String },
    modelStatus: {
      type: String,
      enum: ['pending', 'bg_removing', 'bg_done', 'generating_3d', 'compressing', 'ready', 'failed'],
      default: 'pending',
    },
    modelSource: { type: String, enum: ['procedural', 'tripo', 'hunyuan'], default: 'procedural' },
    aiDescription: { type: String },
    translations: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const Dish: mongoose.Model<any, any, any, any, any, any> = mongoose.models.Dish || mongoose.model('Dish', dishSchema);
