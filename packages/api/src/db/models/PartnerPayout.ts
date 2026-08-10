import { Schema, model } from 'mongoose';
import { genId } from '../id.js';

export interface IPartnerPayout {
  _id: string;
  partnerId: string;
  amount: number;
  commissionIds: string[];
  status: 'PROCESSING' | 'PAID' | 'FAILED';
  paidAt?: Date;
  referenceId?: string; // e.g. UTR or bank ref
  createdAt: Date;
  updatedAt: Date;
}

const partnerPayoutSchema = new Schema<IPartnerPayout>(
  {
    _id: { type: String, default: genId },
    partnerId: { type: String, required: true },
    amount: { type: Number, required: true },
    commissionIds: [{ type: String, required: true }],
    status: { type: String, enum: ['PROCESSING', 'PAID', 'FAILED'], default: 'PROCESSING' },
    paidAt: { type: Date },
    referenceId: { type: String },
  },
  { timestamps: true }
);

partnerPayoutSchema.index({ partnerId: 1, createdAt: -1 });

export const PartnerPayout = model<IPartnerPayout>('PartnerPayout', partnerPayoutSchema);
