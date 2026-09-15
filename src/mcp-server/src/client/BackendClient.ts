import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Typed HTTP client wrapping the backend Express API.
 * MCP tool handlers call methods on this class — never fetch directly.
 */
export class BackendClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string = env.BACKEND_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    logger.debug({ url, method: options.method ?? 'GET' }, 'BackendClient request');

    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(options.headers ?? {}),
      },
    });

    const body = await res.json() as { success: boolean; data?: T; error?: { code: string; message: string } };

    if (!res.ok || !body.success) {
      const message = body.error?.message ?? `HTTP ${res.status}`;
      const code = body.error?.code ?? 'BACKEND_ERROR';
      logger.error({ url, status: res.status, code }, message);
      throw new Error(`[${code}] ${message}`);
    }

    return body.data as T;
  }

  async getPatients(params: Record<string, string | number | undefined>): Promise<unknown[]> {
    const entries: [string, string][] = Object.entries(params)
      .filter((entry): entry is [string, string | number] => entry[1] !== undefined)
      .map(([k, v]) => [k, String(v)]);
    const qs = new URLSearchParams(entries).toString();
    return this.request<unknown[]>(`/api/patients${qs ? `?${qs}` : ''}`);
  }

  async getProtocol(protocolId: string): Promise<unknown> {
    return this.request<unknown>(`/api/protocols/${encodeURIComponent(protocolId)}`);
  }

  async detectDeviations(body: Record<string, unknown>): Promise<unknown[]> {
    return this.request<unknown[]>('/api/deviations/detect', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async classifySeverity(body: Record<string, unknown>): Promise<unknown> {
    return this.request<unknown>('/api/deviations/classify', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async getSiteRiskScore(siteId: string): Promise<unknown> {
    return this.request<unknown>(`/api/sites/${encodeURIComponent(siteId)}/risk`);
  }

  async listHighRiskSites(params: Record<string, string | number | undefined>): Promise<unknown[]> {
    const entries: [string, string][] = Object.entries(params)
      .filter((entry): entry is [string, string | number] => entry[1] !== undefined)
      .map(([k, v]) => [k, String(v)]);
    const qs = new URLSearchParams(entries).toString();
    return this.request<unknown[]>(`/api/sites/high-risk${qs ? `?${qs}` : ''}`);
  }

  async searchSimilarDeviations(body: Record<string, unknown>): Promise<unknown[]> {
    return this.request<unknown[]>('/api/deviations/similar', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async generateCapaReport(body: Record<string, unknown>): Promise<unknown> {
    return this.request<unknown>('/api/reports/capa', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async healthCheck(): Promise<{ status: string }> {
    return this.request<{ status: string }>('/health');
  }
}

// Default singleton — tools use this unless injected for testing
export const backendClient = new BackendClient();
