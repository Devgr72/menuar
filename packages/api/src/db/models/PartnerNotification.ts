import { Schema, model } from 'mongoose';
import { genId } from '../id.js';

export interface IPartnerNotification {
  _id: string;
  partnerId: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const partnerNotificationSchema = new Schema<IPartnerNotification>(
  {
    _id: { type: String, default: genId },
    partnerId: { type: String, required: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    data: { type: Schema.Types.Mixed },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Index for fast querying by partner and sorting by latest
partnerNotificationSchema.index({ partnerId: 1, createdAt: -1 });

export const PartnerNotification = model<IPartnerNotification>('PartnerNotification', partnerNotificationSchema);
