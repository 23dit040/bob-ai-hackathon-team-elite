import { Deviation, DeviationDocument } from '../models/Deviation.js';
import { Visit } from '../models/Visit.js';
import { Site, SiteDocument } from '../models/Site.js';
import { CacheService } from './CacheService.js';
import { NotFoundError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const cache = new CacheService(300); // 5-minute TTL

export interface SiteRiskScore {
  siteId: string;
  siteName: string;
  riskScore: number;          // 0-100
  riskTier: 'critical' | 'high' | 'medium' | 'low';
  totalDeviations: number;
  majorDeviations: number;
  minorDeviations: number;
  administrativeDeviations: number;
  deviationRate: number;      // deviations per visit
  openDeviations: number;
  lastCalculatedAt: string;
  trend: 'improving' | 'stable' | 'worsening';
  contributingFactors: string[];
}

// ── Risk score weights (ICH E6 GCP risk-based monitoring) ─────────────────────
const WEIGHTS = {
  majorDeviation: 15,       // direct patient safety impact
  minorDeviation: 5,
  administrativeDeviation: 1,
  openDeviation: 3,         // unresolved deviations compound risk
  highDeviationRate: 10,    // rate per visit > 0.3
} as const;

export class RiskScoreService {
  /**
   * Calculate a site-level risk score using leading indicators.
   * Deterministic, explainable, no LLM involvement.
   */
  async calculateSiteRiskScore(siteId: string): Promise<SiteRiskScore> {
    const cacheKey = `risk:site:${siteId}`;
    const cached = await cache.get<SiteRiskScore>(cacheKey);
    if (cached) {
      logger.debug({ siteId }, 'RiskScoreService: cache hit');
      return cached;
    }

    const site = (await Site.findOne({ siteId }).lean()) as unknown as SiteDocument | null;
    if (!site) throw new NotFoundError(`Site ${siteId}`);

    const [deviationsRaw, visitCount] = await Promise.all([
      Deviation.find({ siteId }).lean(),
      Visit.countDocuments({ siteId }),
    ]);
    const deviations = deviationsRaw as unknown as DeviationDocument[];

    const major = deviations.filter((d) => d.severity === 'Major').length;
    const minor = deviations.filter((d) => d.severity === 'Minor').length;
    const admin = deviations.filter((d) => d.severity === 'Administrative').length;
    const open = deviations.filter((d) => d.status === 'open').length;
    const deviationRate = visitCount > 0 ? deviations.length / visitCount : 0;

    // Score calculation
    let score = 0;
    score += major * WEIGHTS.majorDeviation;
    score += minor * WEIGHTS.minorDeviation;
    score += admin * WEIGHTS.administrativeDeviation;
    score += open * WEIGHTS.openDeviation;
    if (deviationRate > 0.3) score += WEIGHTS.highDeviationRate;
    score = Math.min(100, score);

    const riskTier = this._scoreTier(score);
    const contributingFactors = this._buildFactors({ major, minor, admin, open, deviationRate });
    const trend = await this._calculateTrend(siteId);

    const result: SiteRiskScore = {
      siteId,
      siteName: site.name,
      riskScore: Math.round(score),
      riskTier,
      totalDeviations: deviations.length,
      majorDeviations: major,
      minorDeviations: minor,
      administrativeDeviations: admin,
      deviationRate: Math.round(deviationRate * 100) / 100,
      openDeviations: open,
      lastCalculatedAt: new Date().toISOString(),
      trend,
      contributingFactors,
    };

    // Persist the calculated score on the Site document
    await Site.updateOne({ siteId }, { riskScore: result.riskScore, riskTier });
    await cache.set(cacheKey, result);

    return result;
  }

  /**
   * List sites ranked by risk score, above optional threshold.
   */
  async listHighRiskSites(params: {
    limit: number;
    threshold: number;
  }): Promise<SiteRiskScore[]> {
    const { limit, threshold } = params;
    const cacheKey = `risk:high-risk:${threshold}:${limit}`;
    const cached = await cache.get<SiteRiskScore[]>(cacheKey);
    if (cached) return cached;

    // Get sites from DB, already have cached risk scores
    const sites = ((await Site.find({
      riskScore: { $gte: threshold },
    })
      .sort({ riskScore: -1 })
      .limit(limit)
      .lean()) as unknown) as SiteDocument[];

    // For sites without a cached score, calculate it
    const results: SiteRiskScore[] = await Promise.all(
      sites.map((s) => this.calculateSiteRiskScore(s.siteId)),
    );

    const sorted = results
      .filter((r) => r.riskScore >= threshold)
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, limit);

    await cache.set(cacheKey, sorted, 60);
    return sorted;
  }

  private _scoreTier(score: number): 'critical' | 'high' | 'medium' | 'low' {
    if (score >= 75) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 25) return 'medium';
    return 'low';
  }

  private _buildFactors(stats: {
    major: number;
    minor: number;
    admin: number;
    open: number;
    deviationRate: number;
  }): string[] {
    const factors: string[] = [];
    if (stats.major > 0) factors.push(`${stats.major} major deviation(s) impacting patient safety or data integrity`);
    if (stats.minor > 0) factors.push(`${stats.minor} minor deviation(s)`);
    if (stats.open > 5) factors.push(`${stats.open} unresolved open deviations`);
    if (stats.deviationRate > 0.3) factors.push(`High deviation rate (${(stats.deviationRate * 100).toFixed(1)}% per visit)`);
    if (factors.length === 0) factors.push('No significant risk factors detected');
    return factors;
  }

  private async _calculateTrend(siteId: string): Promise<'improving' | 'stable' | 'worsening'> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 86_400_000);

    const [recent, older] = await Promise.all([
      Deviation.countDocuments({ siteId, detectedAt: { $gte: thirtyDaysAgo } }),
      Deviation.countDocuments({ siteId, detectedAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } }),
    ]);

    if (recent < older * 0.8) return 'improving';
    if (recent > older * 1.2) return 'worsening';
    return 'stable';
  }
}

export const riskScoreService = new RiskScoreService();
