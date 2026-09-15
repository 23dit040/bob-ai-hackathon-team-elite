import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { protocolService } from '../services/ProtocolService.js';

const router = Router();

/** GET /api/protocols — list all protocols */
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const protocols = await protocolService.listProtocols();
    res.json({ success: true, data: protocols, meta: { total: protocols.length } });
  }),
);

/** GET /api/protocols/:protocolId — single protocol */
router.get(
  '/:protocolId',
  asyncHandler(async (req, res) => {
    const { protocolId } = req.params as { protocolId: string };
    const protocol = await protocolService.getProtocol(protocolId);
    res.json({ success: true, data: protocol });
  }),
);

export { router as protocolsRouter };
