import { Schema, model, Document } from 'mongoose';

export interface VisitDocument extends Document {
  visitId: string;
  patientId: string;
  siteId: string;
  protocolId: string;
  visitNumber: number;
  scheduledDate: Date;
  actualDate: Date;
  completedProcedures: string[];
  requiredProcedures: string[];
  vitalSigns?: {
    systolicBP?: number;
    diastolicBP?: number;
    heartRate?: number;
    temperature?: number;
  };
  labResults?: Map<string, unknown>;
  medicationAdherence?: number;
  adverseEvents: string[];
  concomitantMedications: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const visitSchema = new Schema<VisitDocument>(
  {
    visitId: { type: String, required: true, unique: true, index: true },
    patientId: { type: String, required: true, index: true },
    siteId: { type: String, required: true, index: true },
    protocolId: { type: String, required: true, index: true },
    visitNumber: { type: Number, required: true },
    scheduledDate: { type: Date, required: true },
    actualDate: { type: Date, required: true },
    completedProcedures: [String],
    requiredProcedures: [String],
    vitalSigns: {
      systolicBP: Number,
      diastolicBP: Number,
      heartRate: Number,
      temperature: Number,
    },
    labResults: { type: Map, of: Schema.Types.Mixed },
    medicationAdherence: Number,
    adverseEvents: [String],
    concomitantMedications: [String],
    notes: String,
  },
  { timestamps: true },
);

visitSchema.index({ patientId: 1, visitNumber: 1 });
visitSchema.index({ siteId: 1, scheduledDate: 1 });

export const Visit = model<VisitDocument>('Visit', visitSchema);
