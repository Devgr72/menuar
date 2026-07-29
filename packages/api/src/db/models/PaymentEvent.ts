import mongoose, { Schema } from 'mongoose';
import { genId } from '../id.js';

export type PaymentEventType =
  | 'subscription_activated'
  | 'subscription_charged'
  | 'subscription_halted'
  | 'subscription_cancelled'
  | 'subscription_completed'
  | 'payment_failed';

export interface IPaymentEvent {
  _id: string;
  subscriptionId: string;
  eventType: PaymentEventType;
  razorpayEventId: string;
  payload: Record<string, unknown>;
  createdAt: Date;
}

const paymentEventSchema = new Schema(
  {
    _id: { type: String, default: genId },
    subscriptionId: { type: String, ref: 'Subscription', required: true },
    eventType: {
      type: String,
      enum: [
        'subscription_activated',
        'subscription_charged',
        'subscription_halted',
        'subscription_cancelled',
        'subscription_completed',
        'payment_failed',
      ],
      required: true,
    },
    razorpayEventId: { type: String, required: true, unique: true },
    payload: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const PaymentEvent: mongoose.Model<any, any, any, any, any, any> =
  mongoose.models.PaymentEvent || mongoose.model('PaymentEvent', paymentEventSchema);
