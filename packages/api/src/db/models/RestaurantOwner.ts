import mongoose, { Schema } from 'mongoose';
import { genId } from '../id.js';

export interface IRestaurantOwner {
  _id: string;
  userId: string; // references better-auth's User id
  ownerName: string;
  email?: string;
  restaurantId: string;
  createdAt: Date;
}

const restaurantOwnerSchema = new Schema(
  {
    _id: { type: String, default: genId },
    userId: { type: String, required: true, unique: true },
    ownerName: { type: String, required: true },
    email: { type: String },
    restaurantId: { type: String, ref: 'Restaurant', required: true, unique: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const RestaurantOwner: mongoose.Model<any, any, any, any, any, any> =
  mongoose.models.RestaurantOwner || mongoose.model('RestaurantOwner', restaurantOwnerSchema);
