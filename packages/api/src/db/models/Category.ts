import mongoose, { Schema } from 'mongoose';
import { genId } from '../id.js';

export interface ICategory {
  _id: string;
  menuId: string;
  name: string;
  sortOrder: number;
}

const categorySchema = new Schema({
  _id: { type: String, default: genId },
  menuId: { type: String, ref: 'Menu', required: true },
  name: { type: String, required: true },
  sortOrder: { type: Number, default: 0 },
});

export const Category: mongoose.Model<any, any, any, any, any, any> = mongoose.models.Category || mongoose.model('Category', categorySchema);
