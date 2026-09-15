import { Schema, model, Document } from 'mongoose';

export interface PatientDocument extends Document {
  patientId: string;
  siteId: string;
  protocolId: string;
  enrollmentDate: Date;
  demographics: {
    age: number;
    sex: string;
    weight?: number;
    height?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const patientSchema = new Schema<PatientDocument>(
  {
    patientId: { type: String, required: true, unique: true, index: true },
    siteId: { type: String, required: true, index: true },
    protocolId: { type: String, required: true, index: true },
    enrollmentDate: { type: Date, required: true },
    demographics: {
      age: { type: Number, required: true },
      sex: { type: String, required: true, enum: ['M', 'F', 'Other'] },
      weight: Number,
      height: Number,
    },
  },
  { timestamps: true },
);

export const Patient = model<PatientDocument>('Patient', patientSchema);
