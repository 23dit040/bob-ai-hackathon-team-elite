import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import type { DeviationDocument } from '../models/Deviation.js';
import { CacheService } from './CacheService.js';

const cache = new CacheService(3600); // 1-hour TTL for embeddings

interface ChromaQueryResult {
  ids: string[][];
  documents: (string | null)[][];
  metadatas: (Record<string, unknown> | null)[][];
  distances: number[][];
}

interface SimilarDeviationResult {
  deviationId: string;
  siteId: string;
  description: string;
  severity: string;
  category: string;
  similarity: number;
}

export class ChromaService {
  private readonly baseUrl: string;
  private readonly collection: string;
  private collectionId: string | null = null;

  constructor() {
    this.baseUrl = env.CHROMA_URL;
    this.collection = env.CHROMA_COLLECTION;
  }

  /**
   * Ensure the ChromaDB collection exists, creating it if needed.
   */
  async ensureCollection(): Promise<string> {
    if (this.collectionId) return this.collectionId;

    try {
      // Try to get existing collection
      const res = await fetch(`${this.baseUrl}/api/v1/collections/${this.collection}`);
      if (res.ok) {
        const data = await res.json() as { id: string };
        this.collectionId = data.id;
        return this.collectionId;
      }

      // Create collection if it doesn't exist
      const createRes = await fetch(`${this.baseUrl}/api/v1/collections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: this.collection,
          metadata: { description: 'Clinical trial protocol deviations for CTRM' },
        }),
      });

      if (!createRes.ok) {
        throw new Error(`Failed to create ChromaDB collection: ${createRes.status}`);
      }
      const created = await createRes.json() as { id: string };
      this.collectionId = created.id;
      logger.info({ collection: this.collection }, 'ChromaDB collection created');
      return this.collectionId;
    } catch (err) {
      logger.error({ err }, 'ChromaService: failed to ensure collection');
      throw err;
    }
  }

  /**
   * Index a deviation document into ChromaDB for semantic search.
   * Uses a simple TF-IDF-style text embedding via ChromaDB's default embedding.
   */
  async indexDeviation(deviation: DeviationDocument): Promise<void> {
    try {
      const collId = await this.ensureCollection();
      const document = `${deviation.category}: ${deviation.description}. Section: ${deviation.protocolSection}. Severity: ${deviation.severity}.`;

      await fetch(`${this.baseUrl}/api/v1/collections/${collId}/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: [deviation.deviationId],
          documents: [document],
          metadatas: [{
            deviationId: deviation.deviationId,
            siteId: deviation.siteId,
            severity: deviation.severity,
            category: deviation.category,
            status: deviation.status,
          }],
        }),
      });
    } catch (err) {
      logger.warn({ err, deviationId: deviation.deviationId }, 'ChromaService: indexDeviation failed');
    }
  }

  /**
   * Semantic search for similar historical deviations.
   */
  async searchSimilar(query: string, topK: number = 5): Promise<SimilarDeviationResult[]> {
    const cacheKey = `chroma:search:${query}:${topK}`;
    const cached = await cache.get<SimilarDeviationResult[]>(cacheKey);
    if (cached) return cached;

    try {
      const collId = await this.ensureCollection();

      const res = await fetch(`${this.baseUrl}/api/v1/collections/${collId}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query_texts: [query],
          n_results: topK,
          include: ['documents', 'metadatas', 'distances'],
        }),
      });

      if (!res.ok) {
        logger.warn({ status: res.status }, 'ChromaService: query returned non-OK');
        return [];
      }

      const data = await res.json() as ChromaQueryResult;
      const results: SimilarDeviationResult[] = [];

      const ids = data.ids?.[0] ?? [];
      const metadatas = data.metadatas?.[0] ?? [];
      const distances = data.distances?.[0] ?? [];
      const documents = data.documents?.[0] ?? [];

      for (let i = 0; i < ids.length; i++) {
        const meta = metadatas[i] ?? {};
        const distance = distances[i] ?? 1;
        const similarity = Math.max(0, 1 - distance);

        results.push({
          deviationId: String(meta['deviationId'] ?? ids[i] ?? ''),
          siteId: String(meta['siteId'] ?? ''),
          description: String(documents[i] ?? ''),
          severity: String(meta['severity'] ?? 'Unknown'),
          category: String(meta['category'] ?? 'other'),
          similarity: Math.round(similarity * 1000) / 1000,
        });
      }

      await cache.set(cacheKey, results, 300);
      return results;
    } catch (err) {
      logger.error({ err, query }, 'ChromaService: searchSimilar failed');
      return [];
    }
  }

  /**
   * Health-check: verify ChromaDB connectivity.
   */
  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/heartbeat`);
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const chromaService = new ChromaService();
