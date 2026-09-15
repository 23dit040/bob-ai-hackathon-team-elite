import { Schema, model, Document } from 'mongoose';

export interface ProtocolDocument extends Document {
  protocolId: string;
  name: string;
  version: string;
  phase: 'I' | 'II' | 'III' | 'IV';
  sponsor: string;
  visitSchedule: Array<{
    visitNumber: number;
    name: string;
    targetDay: number;
    windowEarly: number;
    windowLate: number;
    procedures: string[];
    isMandatory: boolean;
  }>;
  inclusionCriteria: string[];
  exclusionCriteria: string[];
  requiredProcedures: Map<string, string[]>;
  allowedWindowDays: { early: number; late: number };
  prohibitedMedications: string[];
  primaryEndpoint: string;
  secondaryEndpoints: string[];
  createdAt: Date;
  updatedAt: Date;
}

const visitScheduleEntrySchema = new Schema(
  {
    visitNumber: { type: Number, required: true },
    name: { type: String, required: true },
    targetDay: { type: Number, required: true },
    windowEarly: { type: Number, required: true },
    windowLate: { type: Number, required: true },
    procedures: [String],
    isMandatory: { type: Boolean, default: true },
  },
  { _id: false },
);

const protocolSchema = new Schema<ProtocolDocument>(
  {
    protocolId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    version: { type: String, required: true },
    phase: { type: String, required: true, enum: ['I', 'II', 'III', 'IV'] },
    sponsor: { type: String, required: true },
    visitSchedule: [visitScheduleEntrySchema],
    inclusionCriteria: [String],
    exclusionCriteria: [String],
    requiredProcedures: { type: Map, of: [String] },
    allowedWindowDays: {
      early: { type: Number, required: true },
      late: { type: Number, required: true },
    },
    prohibitedMedications: [String],
    primaryEndpoint: { type: String, required: true },
    secondaryEndpoints: [String],
  },
  { timestamps: true },
);

export const Protocol = model<ProtocolDocument>('Protocol', protocolSchema);
