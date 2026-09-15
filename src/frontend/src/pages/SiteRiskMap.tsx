import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client.js';

interface SiteRisk {
  siteId: string;
  siteName: string;
  riskScore: number;
  riskTier: 'critical' | 'high' | 'medium' | 'low';
  totalDeviations: number;
  majorDeviations: number;
  minorDeviations: number;
  openDeviations: number;
  trend: 'improving' | 'stable' | 'worsening';
  contributingFactors: string[];
}

interface ApiResponse { data: SiteRisk[] }

const tierBadge: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 border border-red-300',
  high:     'bg-orange-100 text-orange-800 border border-orange-300',
  medium:   'bg-yellow-100 text-yellow-800 border border-yellow-300',
  low:      'bg-green-100 text-green-800 border border-green-300',
};

const trendIcon: Record<string, string> = {
  worsening: '↑',
  stable:    '→',
  improving: '↓',
};

const trendColor: Record<string, string> = {
  worsening: 'text-red-600',
  stable:    'text-gray-500',
  improving: 'text-green-600',
};

export default function SiteRiskMap() {
  const [threshold, setThreshold] = useState(25);

  const { data, isLoading, error } = useQuery<ApiResponse>({
    queryKey: ['high-risk-sites-full', threshold],
    queryFn: () =>
      apiClient.get(`/api/sites/high-risk?threshold=${threshold}&limit=100`) as unknown as Promise<ApiResponse>,
  });

  const sites = data?.data ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Site Risk Ranking</h2>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Min risk score:</label>
          <select
            className="border border-gray-300 rounded px-2 py-1 text-sm"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
          >
            <option value={0}>All sites</option>
            <option value={25}>≥ 25 (Medium+)</option>
            <option value={50}>≥ 50 (High+)</option>
            <option value={75}>≥ 75 (Critical)</option>
          </select>
        </div>
      </div>

      {isLoading && (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400 text-sm">
          Loading site risk scores…
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          Backend unavailable — start the backend at localhost:3001
        </div>
      )}

      {!isLoading && !error && sites.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400 text-sm">
          No sites found above risk score {threshold}. Try lowering the threshold or seed data first.
        </div>
      )}

      {sites.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Site</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Risk Score</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tier</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Major</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Minor</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Open</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sites.map((site) => (
                <tr key={site.siteId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{site.siteId}</div>
                    <div className="text-xs text-gray-400">{site.siteName}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            site.riskScore >= 75 ? 'bg-red-500' :
                            site.riskScore >= 50 ? 'bg-orange-500' :
                            site.riskScore >= 25 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${site.riskScore}%` }}
                        />
                      </div>
                      <span className="font-bold text-gray-900">{site.riskScore}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${tierBadge[site.riskTier] ?? ''}`}>
                      {site.riskTier}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-red-700">{site.majorDeviations}</td>
                  <td className="px-4 py-3 text-right text-yellow-700">{site.minorDeviations}</td>
                  <td className="px-4 py-3 text-right text-orange-600">{site.openDeviations}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{site.totalDeviations}</td>
                  <td className={`px-4 py-3 text-center font-bold text-lg ${trendColor[site.trend] ?? ''}`}>
                    {trendIcon[site.trend] ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-gray-100 px-4 py-2 text-xs text-gray-400">
            Showing {sites.length} site{sites.length !== 1 ? 's' : ''} · Risk scores calculated in real-time from MongoDB
          </div>
        </div>
      )}
    </div>
  );
}
