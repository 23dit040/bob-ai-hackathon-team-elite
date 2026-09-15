import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { riskScoreService } from '../services/RiskScoreService.js';
import { Site } from '../models/Site.js';
import { ValidationError } from '../utils/errors.js';

const router = Router();

const listQuerySchema = z.object({
  page: z.string().default('1').transform(Number),
  limit: z.string().default('50').transform(Number),
});

const highRiskQuerySchema = z.object({
  limit: z.string().default('50').transform(Number),
  threshold: z.string().default('50').transform(Number),
});

/** GET /api/sites — list all sites */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = listQuerySchema.safeParse(req.query);
    if (!q.success) throw new ValidationError(q.error.message);
    const { page, limit } = q.data;
    const skip = (page - 1) * limit;
    const [sites, total] = await Promise.all([
      Site.find().skip(skip).limit(limit).lean(),
      Site.countDocuments(),
    ]);
    res.json({ success: true, data: sites, meta: { total, page, limit } });
  }),
);

/** GET /api/sites/high-risk — ranked high-risk sites */
router.get(
  '/high-risk',
  asyncHandler(async (req, res) => {
    const q = highRiskQuerySchema.safeParse(req.query);
    if (!q.success) throw new ValidationError(q.error.message);
    const sites = await riskScoreService.listHighRiskSites({ limit: q.data.limit, threshold: q.data.threshold });
    res.json({ success: true, data: sites });
  }),
);

/** GET /api/sites/:siteId — single site */
router.get(
  '/:siteId',
  asyncHandler(async (req, res) => {
    const { siteId } = req.params as { siteId: string };
    const site = await Site.findOne({ siteId }).lean();
    if (!site) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: `Site ${siteId} not found` } });
      return;
    }
    res.json({ success: true, data: site });
  }),
);

/** GET /api/sites/:siteId/risk — calculated risk score */
router.get(
  '/:siteId/risk',
  asyncHandler(async (req, res) => {
    const { siteId } = req.params as { siteId: string };
    const score = await riskScoreService.calculateSiteRiskScore(siteId);
    res.json({ success: true, data: score });
  }),
);

export { router as sitesRouter };
