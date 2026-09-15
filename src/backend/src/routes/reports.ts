import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { capaReportService } from '../services/CapaReportService.js';
import { ValidationError } from '../utils/errors.js';

const router = Router();

const capaBodySchema = z.object({
  siteId: z.string().min(1),
  deviationIds: z.array(z.string().min(1)).min(1).max(50),
});

/** POST /api/reports/capa — generate CAPA report */
router.post(
  '/capa',
  asyncHandler(async (req, res) => {
    const body = capaBodySchema.safeParse(req.body);
    if (!body.success) throw new ValidationError(body.error.message);
    const report = await capaReportService.generateCapaReport(body.data);
    res.json({ success: true, data: report });
  }),
);

/** GET /api/reports/capa/:reportId — placeholder for stored reports */
router.get(
  '/capa/:reportId',
  asyncHandler(async (_req, res) => {
    // Reports are generated on-demand and optionally cached via Redis.
    // Persistent storage is a Phase 4 enhancement.
    res.status(501).json({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Report retrieval by ID requires persistent storage (Phase 4). Use POST /api/reports/capa to regenerate.',
      },
    });
  }),
);

export { router as reportsRouter };
