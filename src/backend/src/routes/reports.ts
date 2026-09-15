import { Router } from 'express';

const router = Router();

router.post('/capa', (_req, res) => {
  res.json({
    success: true,
    data: {
      reportId: 'pending',
      status: 'draft',
      rawMarkdown: '# CAPA Report\n\nGeneration not yet implemented.',
    },
  });
});

router.get('/capa/:reportId', (_req, res) => {
  res.json({ success: true, data: null });
});

export { router as reportsRouter };
