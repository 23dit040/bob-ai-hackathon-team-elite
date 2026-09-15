import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ success: true, data: [], meta: { total: 0, page: 1, limit: 50 } });
});

router.get('/:protocolId', (_req, res) => {
  res.json({ success: true, data: null });
});

export { router as protocolsRouter };
