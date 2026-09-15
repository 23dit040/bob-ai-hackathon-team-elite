import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client.js';

interface SiteRisk {
  siteId: string; siteName: string; riskScore: number;
  riskTier: string; totalDeviations: number; majorDeviations: number;
  minorDeviations: number; openDeviations: number;
  trend: string; contributingFactors: string[];
}
interface ApiResponse { data: SiteRisk[] }

const DUMMY_SITES: SiteRisk[] = [
  { siteId: 'SITE-042', siteName: 'Boston Medical Center', riskScore: 94, riskTier: 'critical', totalDeviations: 23, majorDeviations: 11, minorDeviations: 9, openDeviations: 18, trend: 'worsening', contributingFactors: ['11 major deviations', 'High deviation rate'] },
  { siteId: 'SITE-017', siteName: 'London Royal Infirmary', riskScore: 81, riskTier: 'critical', totalDeviations: 19, majorDeviations: 8, minorDeviations: 8, openDeviations: 14, trend: 'worsening', contributingFactors: ['8 major deviations', '14 open deviations'] },
  { siteId: 'SITE-138', siteName: 'Tokyo General Hospital', riskScore: 74, riskTier: 'high', totalDeviations: 15, majorDeviations: 6, minorDeviations: 7, openDeviations: 10, trend: 'stable', contributingFactors: ['6 major deviations'] },
  { siteId: 'SITE-079', siteName: 'Paris Salpêtrière', riskScore: 68, riskTier: 'high', totalDeviations: 13, majorDeviations: 5, minorDeviations: 6, openDeviations: 8, trend: 'improving', contributingFactors: ['5 major deviations'] },
  { siteId: 'SITE-055', siteName: 'Sydney Clinical Research', riskScore: 61, riskTier: 'high', totalDeviations: 11, majorDeviations: 4, minorDeviations: 5, openDeviations: 7, trend: 'stable', contributingFactors: ['High deviation rate'] },
  { siteId: 'SITE-091', siteName: 'Berlin Charité Institute', riskScore: 54, riskTier: 'high', totalDeviations: 9, majorDeviations: 3, minorDeviations: 5, openDeviations: 6, trend: 'improving', contributingFactors: ['3 major deviations'] },
  { siteId: 'SITE-023', siteName: 'Mumbai Research Centre', riskScore: 42, riskTier: 'medium', totalDeviations: 7, majorDeviations: 2, minorDeviations: 4, openDeviations: 4, trend: 'stable', contributingFactors: ['2 major deviations'] },
  { siteId: 'SITE-067', siteName: 'Toronto General Hospital', riskScore: 38, riskTier: 'medium', totalDeviations: 6, majorDeviations: 1, minorDeviations: 4, openDeviations: 3, trend: 'improving', contributingFactors: ['Minor deviations'] },
];

const tierStyle: Record<string, string> = {
  critical: 'text-red-400 bg-red-400/10 border-red-400/30',
  high:     'text-orange-400 bg-orange-400/10 border-orange-400/30',
  medium:   'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  low:      'text-green-400 bg-green-400/10 border-green-400/30',
};
const trendIcon: Record<string, { icon: string; color: string }> = {
  worsening: { icon: '↑', color: 'text-red-400' },
  stable:    { icon: '→', color: 'text-slate-400' },
  improving: { icon: '↓', color: 'text-green-400' },
};

function ScoreBar({ score }: { score: number }) {
  const color = score >= 75 ? 'bg-red-500' : score >= 50 ? 'bg-orange-500' : score >= 25 ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 bg-slate-700 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-white font-bold text-sm w-6">{score}</span>
    </div>
  );
}

export default function SiteRiskMap() {
  const [threshold, setThreshold] = useState(25);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useQuery<ApiResponse>({
    queryKey: ['high-risk-full', threshold],
    queryFn: () => apiClient.get(`/api/sites/high-risk?threshold=${threshold}&limit=100`) as unknown as Promise<ApiResponse>,
    retry: 1,
  });

  const sites = data?.data?.length ? data.data : DUMMY_SITES.filter(s => s.riskScore >= threshold);
  const critical = sites.filter(s => s.riskTier === 'critical').length;
  const high = sites.filter(s => s.riskTier === 'high').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white text-xl font-semibold">Site Risk Ranking</h2>
          <p className="text-slate-400 text-sm mt-0.5">{sites.length} sites · {critical} critical · {high} high</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-sm">Min score:</span>
          <select
            className="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-1.5"
            value={threshold}
            onChange={e => setThreshold(Number(e.target.value))}
          >
            <option value={0}>All sites</option>
            <option value={25}>≥ 25 Medium+</option>
            <option value={50}>≥ 50 High+</option>
            <option value={75}>≥ 75 Critical</option>
          </select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Critical', count: critical, color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20' },
          { label: 'High', count: high, color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/20' },
          { label: 'Medium', count: sites.filter(s=>s.riskTier==='medium').length, color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20' },
          { label: 'Low', count: sites.filter(s=>s.riskTier==='low').length, color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/20' },
        ].map(c => (
          <div key={c.label} className={`border rounded-xl p-4 ${c.bg}`}>
            <p className="text-slate-400 text-xs uppercase tracking-wider">{c.label}</p>
            <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.count}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-8 text-center text-slate-400 text-sm">Loading…</div>
      ) : (
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-700/50 border-b border-slate-700">
                <th className="text-left px-5 py-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Site</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Risk Score</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Tier</th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Major</th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Minor</th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Open</th>
                <th className="text-center px-4 py-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/40">
              {sites.map(site => {
                const t = trendIcon[site.trend] ?? { icon: '→', color: 'text-slate-400' };
                const isOpen = expanded === site.siteId;
                return (
                  <>
                    <tr
                      key={site.siteId}
                      className="hover:bg-slate-700/30 transition-colors cursor-pointer"
                      onClick={() => setExpanded(isOpen ? null : site.siteId)}
                    >
                      <td className="px-5 py-3.5">
                        <p className="text-white font-medium">{site.siteId}</p>
                        <p className="text-slate-500 text-xs">{site.siteName}</p>
                      </td>
                      <td className="px-4 py-3.5"><ScoreBar score={site.riskScore} /></td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-md border capitalize ${tierStyle[site.riskTier] ?? ''}`}>
                          {site.riskTier}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right text-red-400 font-semibold">{site.majorDeviations}</td>
                      <td className="px-4 py-3.5 text-right text-yellow-400">{site.minorDeviations}</td>
                      <td className="px-4 py-3.5 text-right text-orange-400">{site.openDeviations}</td>
                      <td className={`px-4 py-3.5 text-center font-bold text-lg ${t.color}`}>{t.icon}</td>
                    </tr>
                    {isOpen && (
                      <tr key={`${site.siteId}-expanded`} className="bg-slate-700/20">
                        <td colSpan={7} className="px-5 py-3">
                          <p className="text-slate-300 text-xs font-semibold mb-1">Contributing Factors:</p>
                          <div className="flex gap-2 flex-wrap">
                            {site.contributingFactors.map((f, i) => (
                              <span key={i} className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded">{f}</span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
          <div className="px-5 py-2.5 border-t border-slate-700/50 text-xs text-slate-500">
            {sites.length} sites shown · Click a row to see contributing factors
          </div>
        </div>
      )}
    </div>
  );
}
