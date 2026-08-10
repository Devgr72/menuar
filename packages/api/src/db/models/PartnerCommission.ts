import { Schema, model } from 'mongoose';
import { genId } from '../id.js';

export interface IPartnerCommission {
  _id: string;
  partnerId: string;
  restaurantId: string;
  subscriptionId: string;
  type: 'FIRST_SUBSCRIPTION' | 'RENEWAL';
  amount: number;
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  payoutId?: string; // Reference to PartnerPayout
  createdAt: Date;
  updatedAt: Date;
}

const partnerCommissionSchema = new Schema<IPartnerCommission>(
  {
    _id: { type: String, default: genId },
    partnerId: { type: String, required: true },
    restaurantId: { type: String, required: true },
    subscriptionId: { type: String, required: true },
    type: { type: String, enum: ['FIRST_SUBSCRIPTION', 'RENEWAL'], required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['PENDING', 'PAID', 'CANCELLED'], default: 'PENDING' },
    payoutId: { type: String },
  },
  { timestamps: true }
);

partnerCommissionSchema.index({ partnerId: 1, status: 1 });
partnerCommissionSchema.index({ restaurantId: 1 });

export const PartnerCommission = model<IPartnerCommission>('PartnerCommission', partnerCommissionSchema);
