import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ success: true, data: [], meta: { total: 0, page: 1, limit: 50 } });
});

router.get('/high-risk', (_req, res) => {
  res.json({ success: true, data: [] });
});

router.get('/:siteId', (_req, res) => {
  res.json({ success: true, data: null });
});

router.get('/:siteId/risk', (_req, res) => {
  res.json({
    success: true,
    data: {
      siteId: _req.params['siteId'],
      riskScore: 0,
      riskTier: 'low',
      totalDeviations: 0,
      majorDeviations: 0,
      minorDeviations: 0,
      administrativeDeviations: 0,
      deviationRate: 0,
      openDeviations: 0,
      lastCalculatedAt: new Date().toISOString(),
      trend: 'stable',
    },
  });
});

export { router as sitesRouter };
