import { Schema, model, Document } from 'mongoose';

export interface DeviationDocument extends Document {
  deviationId: string;
  patientId: string;
  visitId: string;
  siteId: string;
  protocolId: string;
  detectedAt: Date;
  category: string;
  severity: 'Major' | 'Minor' | 'Administrative';
  description: string;
  protocolSection: string;
  status: 'open' | 'under_review' | 'resolved' | 'waived';
  rootCause?: string;
  correctiveAction?: string;
  resolvedAt?: Date;
  reportedBy?: string;
  embeddingId?: string; // reference to ChromaDB vector
  createdAt: Date;
  updatedAt: Date;
}

const deviationSchema = new Schema<DeviationDocument>(
  {
    deviationId: { type: String, required: true, unique: true, index: true },
    patientId: { type: String, required: true, index: true },
    visitId: { type: String, required: true, index: true },
    siteId: { type: String, required: true, index: true },
    protocolId: { type: String, required: true },
    detectedAt: { type: Date, required: true, default: Date.now },
    category: { type: String, required: true },
    severity: {
      type: String,
      required: true,
      enum: ['Major', 'Minor', 'Administrative'],
    },
    description: { type: String, required: true },
    protocolSection: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: ['open', 'under_review', 'resolved', 'waived'],
      default: 'open',
    },
    rootCause: String,
    correctiveAction: String,
    resolvedAt: Date,
    reportedBy: String,
    embeddingId: String,
  },
  { timestamps: true },
);

deviationSchema.index({ siteId: 1, severity: 1 });
deviationSchema.index({ siteId: 1, status: 1 });
deviationSchema.index({ detectedAt: -1 });

export const Deviation = model<DeviationDocument>('Deviation', deviationSchema);
