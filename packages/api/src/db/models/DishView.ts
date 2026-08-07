import mongoose, { Schema } from 'mongoose';
import { genId } from '../id.js';

export interface IDishView {
  _id: string;
  dishId: string;
  tableId: string;
  viewedAt: Date;
}

const dishViewSchema = new Schema({
  _id: { type: String, default: genId },
  dishId: { type: String, ref: 'Dish', required: true },
  tableId: { type: String, ref: 'Table', required: true },
  viewedAt: { type: Date, default: Date.now },
});

export const DishView: mongoose.Model<any, any, any, any, any, any> = mongoose.models.DishView || mongoose.model('DishView', dishViewSchema);
