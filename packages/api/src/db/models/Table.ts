import mongoose, { Schema } from 'mongoose';
import { genId } from '../id.js';

export interface ITable {
  _id: string;
  restaurantId: string;
  tableNumber: number;
  qrCode: string;
  qrUrl: string;
}

const tableSchema = new Schema({
  _id: { type: String, default: genId },
  restaurantId: { type: String, ref: 'Restaurant', required: true },
  tableNumber: { type: Number, required: true },
  qrCode: { type: String, required: true, unique: true },
  qrUrl: { type: String, required: true },
});

tableSchema.index({ restaurantId: 1, tableNumber: 1 }, { unique: true });

export const Table: mongoose.Model<any, any, any, any, any, any> = mongoose.models.Table || mongoose.model('Table', tableSchema);
