import mongoose, { Schema } from 'mongoose';
import { genId } from '../id.js';

export type SubscriptionStatus = 'pending' | 'active' | 'halted' | 'cancelled' | 'expired';

export interface ISubscription {
  _id: string;
  restaurantId: string;
  razorpaySubId: string;
  razorpayPlanId: string;
  status: SubscriptionStatus;
  amount: number; // paise
  activatedAt?: Date | null;
  nextBillingAt?: Date | null;
  cancelledAt?: Date | null;
  haltedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema(
  {
    _id: { type: String, default: genId },
    restaurantId: { type: String, ref: 'Restaurant', required: true, unique: true },
    razorpaySubId: { type: String, required: true, unique: true },
    razorpayPlanId: { type: String, required: true },
    status: { type: String, enum: ['pending', 'active', 'halted', 'cancelled', 'expired'], default: 'pending' },
    amount: { type: Number, required: true },
    activatedAt: { type: Date, default: null },
    nextBillingAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    haltedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const Subscription: mongoose.Model<any, any, any, any, any, any> =
  mongoose.models.Subscription || mongoose.model('Subscription', subscriptionSchema);
