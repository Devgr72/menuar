import mongoose, { Schema } from 'mongoose';
import { genId } from '../id.js';

export interface IRestaurant {
  _id: string;
  name: string;
  slug: string;
  plan: 'free' | 'starter' | 'pro';
  qrKey?: string;
  qrUrl?: string;
  logoUrl?: string;
  heroTagline?: string;
  heroHeading1?: string;
  heroHeading2?: string;
  heroDescription?: string;
  scanCount: number;
  photosUsed: number;
  createdAt: Date;
  updatedAt: Date;
}

const restaurantSchema = new Schema(
  {
    _id: { type: String, default: genId },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    plan: { type: String, enum: ['free', 'starter', 'pro'], default: 'free' },
    qrKey: { type: String },
    qrUrl: { type: String },
    logoUrl: { type: String },
    heroTagline: { type: String },
    heroHeading1: { type: String },
    heroHeading2: { type: String },
    heroDescription: { type: String },
    scanCount: { type: Number, default: 0 },
    photosUsed: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Restaurant: mongoose.Model<any, any, any, any, any, any> = mongoose.models.Restaurant || mongoose.model('Restaurant', restaurantSchema);
