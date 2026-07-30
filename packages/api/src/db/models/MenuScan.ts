import mongoose, { Schema } from 'mongoose';
import { genId } from '../id.js';
import type { MenuScanDraft } from '@menuar/types';

export type MenuScanStatus = 'ready' | 'published' | 'discarded';

export interface IMenuScan {
  _id: string;
  restaurantId: string;
  status: MenuScanStatus;
  photoKeys: string[];
  draft: MenuScanDraft;
  geminiModel: string;
  createdAt: Date;
  publishedAt?: Date;
}

const menuScanSchema = new Schema(
  {
    _id: { type: String, default: genId },
    restaurantId: { type: String, ref: 'Restaurant', required: true },
    status: { type: String, enum: ['ready', 'published', 'discarded'], default: 'ready' },
    photoKeys: { type: [String], default: [] },
    draft: { type: Schema.Types.Mixed, required: true },
    geminiModel: { type: String, required: true },
    publishedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const MenuScan: mongoose.Model<any, any, any, any, any, any> =
  mongoose.models.MenuScan || mongoose.model('MenuScan', menuScanSchema);
