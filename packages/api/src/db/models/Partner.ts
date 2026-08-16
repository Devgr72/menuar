import { Schema, model } from 'mongoose';
import { genId } from '../id.js';

export interface IPartner {
  _id: string;
  partnerId: string;
  fullName: string;
  mobileNumber: string;
  email: string;
  city: string;
  state: string;
  qualification: string;
  college?: string;
  currentStatus: string;
  salesExperience: string;
  dailyTime: string;
  preferredMethod: string;
  passwordHash: string;
  status: 'Active' | 'Inactive';
  createdAt: Date;
  updatedAt: Date;
}

const partnerSchema = new Schema<IPartner>(
  {
    _id: { type: String, default: genId },
    partnerId: { type: String, required: true, unique: true },
    fullName: { type: String, required: true },
    mobileNumber: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    qualification: { type: String, required: true },
    college: { type: String },
    currentStatus: { type: String, required: true },
    salesExperience: { type: String, required: true },
    dailyTime: { type: String, required: true },
    preferredMethod: { type: String, required: true },
    passwordHash: { type: String, required: true },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  },
  { timestamps: true }
);

export const Partner = model<IPartner>('Partner', partnerSchema);
