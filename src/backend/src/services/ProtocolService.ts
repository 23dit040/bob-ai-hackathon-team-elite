import { Protocol, ProtocolDocument } from '../models/Protocol.js';
import { CacheService } from './CacheService.js';
import { NotFoundError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const cache = new CacheService(600); // 10-minute TTL — protocols rarely change

export class ProtocolService {
  /**
   * Get a protocol by its ID.
   */
  async getProtocol(protocolId: string): Promise<ProtocolDocument> {
    const cacheKey = `protocol:${protocolId}`;
    const cached = await cache.get<ProtocolDocument>(cacheKey);
    if (cached) {
      logger.debug({ protocolId }, 'ProtocolService: cache hit');
      return cached;
    }

    const protocol = await Protocol.findOne({ protocolId }).lean();
    if (!protocol) throw new NotFoundError(`Protocol ${protocolId}`);

    await cache.set(cacheKey, protocol);
    return protocol as unknown as ProtocolDocument;
  }

  /**
   * List all protocols.
   */
  async listProtocols(): Promise<ProtocolDocument[]> {
    const cacheKey = 'protocols:all';
    const cached = await cache.get<ProtocolDocument[]>(cacheKey);
    if (cached) return cached;

    const protocols = (await Protocol.find().lean()) as unknown as ProtocolDocument[];
    await cache.set(cacheKey, protocols);
    return protocols;
  }

  /**
   * Invalidate cached protocol (e.g., after an update).
   */
  async invalidateCache(protocolId: string): Promise<void> {
    await cache.del(`protocol:${protocolId}`);
    await cache.del('protocols:all');
  }
}

export const protocolService = new ProtocolService();
