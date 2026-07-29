import mongoose, { Schema } from 'mongoose';
import { genId } from '../id.js';

export type SlotStatus = 'empty' | 'photos_uploaded' | 'processing' | 'glb_ready';

export interface IDishSlot {
  _id: string;
  restaurantId: string;
  slotNumber: number; // 1-10
  dishName?: string;
  description?: string;
  ingredients?: string;
  price?: number;
  isVeg: boolean;
  status: SlotStatus;
  menuPhotoKey?: string;
  menuPhotoUrl?: string;
  photoKeys: string[];
  glbKey?: string;
  glbUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const dishSlotSchema = new Schema(
  {
    _id: { type: String, default: genId },
    restaurantId: { type: String, ref: 'Restaurant', required: true },
    slotNumber: { type: Number, required: true },
    dishName: { type: String },
    description: { type: String },
    ingredients: { type: String },
    price: { type: Number },
    isVeg: { type: Boolean, default: true },
    status: { type: String, enum: ['empty', 'photos_uploaded', 'processing', 'glb_ready'], default: 'empty' },
    menuPhotoKey: { type: String },
    menuPhotoUrl: { type: String },
    photoKeys: { type: [String], default: [] },
    glbKey: { type: String },
    glbUrl: { type: String },
  },
  { timestamps: true },
);

dishSlotSchema.index({ restaurantId: 1, slotNumber: 1 }, { unique: true });

export const DishSlot: mongoose.Model<any, any, any, any, any, any> = mongoose.models.DishSlot || mongoose.model('DishSlot', dishSlotSchema);
