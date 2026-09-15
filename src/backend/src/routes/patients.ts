import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { patientService } from '../services/PatientService.js';
import { ValidationError } from '../utils/errors.js';

const router = Router();

const listQuerySchema = z.object({
  siteId: z.string().optional(),
  patientId: z.string().optional(),
  page: z.string().default('1').transform(Number),
  limit: z.string().default('50').transform(Number),
});

/** GET /api/patients — list patients */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = listQuerySchema.safeParse(req.query);
    if (!q.success) throw new ValidationError(q.error.message);
    const { siteId, patientId, page, limit } = q.data;

    const result = await patientService.listPatients({ siteId, patientId, page, limit });
    res.json({
      success: true,
      data: result.data,
      meta: { total: result.total, page: result.page, limit: result.limit },
    });
  }),
);

/** GET /api/patients/:patientId — single patient + all visits */
router.get(
  '/:patientId',
  asyncHandler(async (req, res) => {
    const { patientId } = req.params as { patientId: string };
    const result = await patientService.getPatientWithVisits(patientId);
    res.json({ success: true, data: result });
  }),
);

export { router as patientsRouter };
