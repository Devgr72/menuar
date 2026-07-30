import mongoose, { Schema } from 'mongoose';
import { genId } from '../id.js';

export type InquiryType = 'contact' | 'newsletter';
export type InquiryStatus = 'new' | 'read' | 'archived';

export interface IInquiry {
  _id: string;
  type: InquiryType;
  name?: string;
  email: string;
  phone?: string;
  subject?: string;
  message?: string;
  status: InquiryStatus;
  /** Kept for spam triage — never surfaced in the admin list. */
  ip?: string;
  createdAt: Date;
  updatedAt: Date;
}

const inquirySchema = new Schema(
  {
    _id: { type: String, default: genId },
    type: { type: String, enum: ['contact', 'newsletter'], required: true },
    name: { type: String, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    subject: { type: String, trim: true },
    message: { type: String, trim: true },
    status: { type: String, enum: ['new', 'read', 'archived'], default: 'new' },
    ip: { type: String },
  },
  { timestamps: true },
);

inquirySchema.index({ type: 1, status: 1, createdAt: -1 });
// One newsletter row per address; contact submissions are never deduped.
inquirySchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { type: 'newsletter' } },
);

export const Inquiry: mongoose.Model<any, any, any, any, any, any> =
  mongoose.models.Inquiry || mongoose.model('Inquiry', inquirySchema);
