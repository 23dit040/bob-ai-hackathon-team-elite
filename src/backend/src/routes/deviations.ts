import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { deviationService } from '../services/DeviationService.js';
import { chromaService } from '../services/ChromaService.js';
import { ValidationError } from '../utils/errors.js';

const router = Router();

const listQuerySchema = z.object({
  siteId: z.string().optional(),
  patientId: z.string().optional(),
  severity: z.enum(['Major', 'Minor', 'Administrative']).optional(),
  status: z.enum(['open', 'under_review', 'resolved', 'waived']).optional(),
  category: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.string().default('1').transform(Number),
  limit: z.string().default('50').transform(Number),
});

const detectBodySchema = z.object({
  visitId: z.string().optional(),
  siteId: z.string().optional(),
  patientId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
}).refine(
  (d) => d.visitId ?? d.siteId ?? d.patientId ?? d.from ?? d.to,
  { message: 'Provide at least one of: visitId, siteId, patientId, from/to' },
);

const classifyBodySchema = z.object({
  deviationId: z.string().optional(),
  deviationText: z.string().min(1).optional(),
}).refine(
  (d) => d.deviationId ?? d.deviationText,
  { message: 'Provide deviationId or deviationText' },
);

const similarBodySchema = z.object({
  query: z.string().min(1),
  topK: z.number().int().positive().max(20).optional().default(5),
});

/** GET /api/deviations — list with filters */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = listQuerySchema.safeParse(req.query);
    if (!q.success) throw new ValidationError(q.error.message);
    const result = await deviationService.listDeviations(q.data);
    res.json({
      success: true,
      data: result.data,
      meta: { total: result.total, page: result.page, limit: result.limit },
    });
  }),
);

/** POST /api/deviations/detect — run detection engine */
router.post(
  '/detect',
  asyncHandler(async (req, res) => {
    const body = detectBodySchema.safeParse(req.body);
    if (!body.success) throw new ValidationError(body.error.message);
    const deviations = await deviationService.detectDeviations({
      visitId: body.data.visitId,
      siteId: body.data.siteId,
      patientId: body.data.patientId,
      from: body.data.from,
      to: body.data.to,
    });
    res.json({ success: true, data: deviations });
  }),
);

/** POST /api/deviations/classify — classify severity */
router.post(
  '/classify',
  asyncHandler(async (req, res) => {
    const body = classifyBodySchema.safeParse(req.body);
    if (!body.success) throw new ValidationError(body.error.message);
    const result = await deviationService.classifySeverity(body.data);
    res.json({ success: true, data: result });
  }),
);

/** POST /api/deviations/similar — semantic search */
router.post(
  '/similar',
  asyncHandler(async (req, res) => {
    const body = similarBodySchema.safeParse(req.body);
    if (!body.success) throw new ValidationError(body.error.message);
    const results = await chromaService.searchSimilar(body.data.query, body.data.topK);
    res.json({ success: true, data: results });
  }),
);

/** GET /api/deviations/:deviationId — single deviation */
router.get(
  '/:deviationId',
  asyncHandler(async (req, res) => {
    const { deviationId } = req.params as { deviationId: string };
    const deviation = await deviationService.getDeviation(deviationId);
    res.json({ success: true, data: deviation });
  }),
);

export { router as deviationsRouter };
