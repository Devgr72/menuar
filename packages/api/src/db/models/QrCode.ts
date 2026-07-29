import mongoose, { Schema } from 'mongoose';
import { genId } from '../id.js';

export interface IQrCode {
  _id: string;
  tableId: string;
  imageKey: string;
  imageUrl: string;
  scanCount: number;
  createdAt: Date;
}

const qrCodeSchema = new Schema(
  {
    _id: { type: String, default: genId },
    tableId: { type: String, ref: 'Table', required: true },
    imageKey: { type: String, required: true },
    imageUrl: { type: String, required: true },
    scanCount: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const QrCode: mongoose.Model<any, any, any, any, any, any> = mongoose.models.QrCode || mongoose.model('QrCode', qrCodeSchema);
