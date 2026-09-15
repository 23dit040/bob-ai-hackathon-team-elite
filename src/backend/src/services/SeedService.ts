import { v4 as uuidv4 } from 'uuid';
import { Patient } from '../models/Patient.js';
import { Protocol } from '../models/Protocol.js';
import { Site } from '../models/Site.js';
import { Visit } from '../models/Visit.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

// ── Seed configuration ───────────────────────────────────────────────────────
const SITE_COUNT = env.SEED_SITE_COUNT;      // default 200
const PATIENT_COUNT = env.SEED_PATIENT_COUNT; // default 5000
const VISITS_PER_PATIENT = 6;

const COUNTRIES = ['USA', 'UK', 'Germany', 'France', 'Japan', 'Canada', 'Australia', 'India', 'Brazil', 'Spain'];
const CITIES: Record<string, string[]> = {
  USA: ['Boston', 'Houston', 'Chicago', 'Seattle', 'Denver'],
  UK: ['London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow'],
  Germany: ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne'],
  France: ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice'],
  Japan: ['Tokyo', 'Osaka', 'Nagoya', 'Fukuoka', 'Sapporo'],
  Canada: ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa'],
  Australia: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide'],
  India: ['Mumbai', 'Bangalore', 'Delhi', 'Chennai', 'Hyderabad'],
  Brazil: ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Fortaleza', 'Curitiba'],
  Spain: ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Zaragoza'],
};

const PROHIBITED_MEDICATIONS = [
  'warfarin', 'rifampicin', 'carbamazepine', 'phenytoin', 'St. Johns Wort',
  'ketoconazole', 'itraconazole', 'clarithromycin', 'erythromycin',
];

const PROCEDURES = [
  'blood_draw', 'ecg', 'vital_signs', 'urinalysis', 'mri_scan',
  'chest_xray', 'cognitive_assessment', 'quality_of_life_questionnaire',
  'pharmacokinetics_sample', 'safety_labs',
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

/**
 * Seed the database with realistic synthetic clinical trial data.
 * Idempotent: skips if data already exists.
 */
export class SeedService {
  async seed(): Promise<void> {
    const existingSites = await Site.countDocuments();
    if (existingSites >= SITE_COUNT) {
      logger.info({ existingSites }, 'SeedService: already seeded, skipping');
      return;
    }

    logger.info({ SITE_COUNT, PATIENT_COUNT }, 'SeedService: starting seed');

    // ── 1. Create protocol ────────────────────────────────────────
    const protocolId = 'PROTO-CTRM-2024-001';
    await Protocol.findOneAndUpdate(
      { protocolId },
      {
        protocolId,
        name: 'CTRM Phase III Multi-Site Clinical Trial',
        version: '3.2',
        phase: 'III',
        sponsor: 'CTRM Pharma Inc.',
        visitSchedule: Array.from({ length: VISITS_PER_PATIENT }, (_, i) => ({
          visitNumber: i + 1,
          name: i === 0 ? 'Screening' : i === VISITS_PER_PATIENT - 1 ? 'End of Study' : `Visit ${i + 1}`,
          targetDay: i * 28,
          windowEarly: 3,
          windowLate: 5,
          procedures: PROCEDURES.slice(0, randomInt(3, 6)),
          isMandatory: true,
        })),
        inclusionCriteria: [
          'Age 18-75 years',
          'Diagnosis confirmed by specialist',
          'Signed informed consent',
        ],
        exclusionCriteria: [
          'Pregnancy or breastfeeding',
          'Severe renal impairment',
          'Prior participation in conflicting trial',
        ],
        requiredProcedures: new Map(
          Array.from({ length: VISITS_PER_PATIENT }, (_, i) => [
            String(i + 1),
            PROCEDURES.slice(0, Math.min(3 + i, PROCEDURES.length)),
          ]),
        ),
        allowedWindowDays: { early: 3, late: 5 },
        prohibitedMedications: PROHIBITED_MEDICATIONS,
        primaryEndpoint: 'Change in primary symptom score from baseline at Week 24',
        secondaryEndpoints: [
          'Safety and tolerability',
          'Quality of life (EQ-5D)',
          'Biomarker response',
        ],
      },
      { upsert: true, new: true },
    );
    logger.info({ protocolId }, 'SeedService: protocol upserted');

    // ── 2. Create sites ───────────────────────────────────────────
    const siteIds: string[] = [];
    const siteDocs = [];
    for (let i = 0; i < SITE_COUNT; i++) {
      const siteId = `SITE-${String(i + 1).padStart(3, '0')}`;
      siteIds.push(siteId);
      const country = randomElement(COUNTRIES);
      const city = randomElement(CITIES[country] ?? ['Unknown']);
      siteDocs.push({
        updateOne: {
          filter: { siteId },
          update: {
            $setOnInsert: {
              siteId,
              name: `${city} Clinical Research Center`,
              location: { city, country },
              principalInvestigator: `Dr. ${['Smith', 'Johnson', 'Patel', 'Chen', 'Müller', 'García', 'Tanaka'][i % 7]} (Site ${i + 1})`,
              enrollmentCount: 0,
              activePatients: 0,
              activeSince: addDays(new Date(), -randomInt(180, 730)),
            },
          },
          upsert: true,
        },
      });
    }
    await Site.bulkWrite(siteDocs);
    logger.info({ SITE_COUNT }, 'SeedService: sites upserted');

    // ── 3. Create patients + visits ───────────────────────────────
    const patientBatch = [];
    const visitBatch = [];
    const patientsPerSite = Math.ceil(PATIENT_COUNT / SITE_COUNT);

    let patientCounter = 0;

    for (const siteId of siteIds) {
      const patCountForSite = Math.min(patientsPerSite, PATIENT_COUNT - patientCounter);
      if (patCountForSite <= 0) break;

      for (let p = 0; p < patCountForSite; p++) {
        const patientId = `PAT-${String(patientCounter + 1).padStart(5, '0')}`;
        const enrollmentDate = addDays(new Date(), -randomInt(30, 400));
        const sex = randomElement<'M' | 'F'>(['M', 'F']);

        patientBatch.push({
          updateOne: {
            filter: { patientId },
            update: {
              $setOnInsert: {
                patientId,
                siteId,
                protocolId,
                enrollmentDate,
                demographics: {
                  age: randomInt(22, 72),
                  sex,
                  weight: randomInt(55, 110),
                  height: randomInt(155, 195),
                },
              },
            },
            upsert: true,
          },
        });

        // Generate visits for this patient
        for (let v = 0; v < VISITS_PER_PATIENT; v++) {
          const visitId = `VIS-${uuidv4().slice(0, 8).toUpperCase()}`;
          const targetDay = v * 28;
          const scheduledDate = addDays(enrollmentDate, targetDay);

          // Introduce realistic variance: 20% chance of visit deviation
          const dayOffset = Math.random() < 0.2
            ? randomInt(-5, 10) // window violation
            : randomInt(-2, 3); // within window
          const actualDate = addDays(scheduledDate, dayOffset);

          // 15% chance of missing procedures
          const requiredForVisit = PROCEDURES.slice(0, Math.min(3 + v, PROCEDURES.length));
          const completedProcedures = Math.random() < 0.15
            ? requiredForVisit.slice(1)
            : requiredForVisit;

          // 5% chance of prohibited medication
          const concomitantMedications: string[] = [];
          if (Math.random() < 0.05) {
            concomitantMedications.push(randomElement(PROHIBITED_MEDICATIONS));
          }
          // Add some harmless meds
          if (Math.random() < 0.4) {
            concomitantMedications.push(randomElement(['aspirin', 'metformin', 'lisinopril', 'atorvastatin']));
          }

          visitBatch.push({
            updateOne: {
              filter: { visitId },
              update: {
                $setOnInsert: {
                  visitId,
                  patientId,
                  siteId,
                  protocolId,
                  visitNumber: v + 1,
                  scheduledDate,
                  actualDate,
                  completedProcedures,
                  requiredProcedures: requiredForVisit,
                  vitalSigns: {
                    systolicBP: randomInt(110, 145),
                    diastolicBP: randomInt(70, 95),
                    heartRate: randomInt(60, 100),
                    temperature: 36 + Math.random() * 1.5,
                  },
                  medicationAdherence: Math.random() < 0.1 ? randomInt(60, 79) : randomInt(80, 100),
                  adverseEvents: Math.random() < 0.1 ? ['headache', 'nausea'] : [],
                  concomitantMedications,
                },
              },
              upsert: true,
            },
          });
        }

        patientCounter++;

        // Flush in batches of 500
        if (patientBatch.length >= 500) {
          await Patient.bulkWrite(patientBatch.splice(0));
          await Visit.bulkWrite(visitBatch.splice(0));
          logger.debug({ patientCounter }, 'SeedService: batch flushed');
        }
      }
    }

    // Flush remaining
    if (patientBatch.length > 0) {
      await Patient.bulkWrite(patientBatch);
      await Visit.bulkWrite(visitBatch);
    }

    // Update enrollment counts
    await Promise.all(
      siteIds.map(async (siteId) => {
        const count = await Patient.countDocuments({ siteId });
        await Site.updateOne({ siteId }, { enrollmentCount: count, activePatients: count });
      }),
    );

    logger.info({ patientCounter, totalVisits: patientCounter * VISITS_PER_PATIENT }, 'SeedService: seed complete');
  }
}

export const seedService = new SeedService();
