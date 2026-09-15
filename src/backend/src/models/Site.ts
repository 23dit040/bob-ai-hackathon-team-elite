import { Schema, model, Document } from 'mongoose';

export interface SiteDocument extends Document {
  siteId: string;
  name: string;
  location: {
    city: string;
    country: string;
    region?: string;
  };
  principalInvestigator: string;
  enrollmentCount: number;
  activePatients: number;
  activeSince: Date;
  riskScore?: number;
  riskTier?: 'critical' | 'high' | 'medium' | 'low';
  createdAt: Date;
  updatedAt: Date;
}

const siteSchema = new Schema<SiteDocument>(
  {
    siteId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    location: {
      city: { type: String, required: true },
      country: { type: String, required: true },
      region: String,
    },
    principalInvestigator: { type: String, required: true },
    enrollmentCount: { type: Number, default: 0 },
    activePatients: { type: Number, default: 0 },
    activeSince: { type: Date, required: true },
    riskScore: { type: Number, min: 0, max: 100 },
    riskTier: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
    },
  },
  { timestamps: true },
);

siteSchema.index({ riskScore: -1 });
siteSchema.index({ riskTier: 1 });

export const Site = model<SiteDocument>('Site', siteSchema);
