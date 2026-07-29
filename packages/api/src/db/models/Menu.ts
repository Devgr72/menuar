import mongoose, { Schema } from 'mongoose';
import { genId } from '../id.js';

export interface IMenu {
  _id: string;
  restaurantId: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
}

const menuSchema = new Schema(
  {
    _id: { type: String, default: genId },
    restaurantId: { type: String, ref: 'Restaurant', required: true },
    name: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const Menu: mongoose.Model<any, any, any, any, any, any> = mongoose.models.Menu || mongoose.model('Menu', menuSchema);
