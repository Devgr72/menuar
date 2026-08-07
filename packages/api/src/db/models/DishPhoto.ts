import mongoose, { Schema } from 'mongoose';
import { genId } from '../id.js';

export interface IDishPhoto {
  _id: string;
  dishId: string;
  originalKey: string;
  cleanedKey?: string;
  createdAt: Date;
}

const dishPhotoSchema = new Schema(
  {
    _id: { type: String, default: genId },
    dishId: { type: String, ref: 'Dish', required: true },
    originalKey: { type: String, required: true },
    cleanedKey: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const DishPhoto: mongoose.Model<any, any, any, any, any, any> = mongoose.models.DishPhoto || mongoose.model('DishPhoto', dishPhotoSchema);
