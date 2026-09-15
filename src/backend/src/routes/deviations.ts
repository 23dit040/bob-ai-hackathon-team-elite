import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ success: true, data: [], meta: { total: 0, page: 1, limit: 50 } });
});

router.post('/detect', (_req, res) => {
  res.json({ success: true, data: [] });
});

router.post('/classify', (_req, res) => {
  res.json({ success: true, data: { severity: 'Minor', confidence: 0 } });
});

router.post('/similar', (_req, res) => {
  res.json({ success: true, data: [] });
});

router.get('/:deviationId', (_req, res) => {
  res.json({ success: true, data: null });
});

export { router as deviationsRouter };
