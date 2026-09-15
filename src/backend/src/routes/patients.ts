import { Router } from 'express';
// Route stubs — full implementation in feature/backend phase 2
// Kept minimal so the server starts and routes are registered

const router = Router();

router.get('/', (_req, res) => {
  res.json({ success: true, data: [], meta: { total: 0, page: 1, limit: 50 } });
});

router.get('/:patientId', (_req, res) => {
  res.json({ success: true, data: null });
});

export { router as patientsRouter };
