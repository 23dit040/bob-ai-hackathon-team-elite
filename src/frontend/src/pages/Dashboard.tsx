import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client.js';

interface HealthResponse { status: string }
interface SitesResponse { meta: { total: number } }
interface DeviationsResponse { meta: { total: number } }
interface HighRiskResponse { data: unknown[] }

// ── Dummy fallback data shown when backend is offline ──────────────────────
const DUMMY = {
  totalSites: 200,
  highRisk: 47,
  openDeviations: 312,
  majorDeviations: 89,
  recentDeviations: [
    { id: 'DEV-A1B2', site: 'SITE-042', patient: 'PAT-1891', category: 'missed_procedure', severity: 'Major', time: '2 min ago' },
    { id: 'DEV-C3D4', site: 'SITE-017', patient: 'PAT-0432', category: 'late_visit', severity: 'Minor', time: '14 min ago' },
    { id: 'DEV-E5F6', site: 'SITE-138', patient: 'PAT-3301', category: 'prohibited_medication', severity: 'Major', time: '31 min ago' },
    { id: 'DEV-G7H8', site: 'SITE-079', patient: 'PAT-2210', category: 'dosing_error', severity: 'Major', time: '1 hr ago' },
    { id: 'DEV-I9J0', site: 'SITE-055', patient: 'PAT-0891', category: 'data_collection_error', severity: 'Administrative', time: '2 hr ago' },
  ],
  topRiskSites: [
    { siteId: 'SITE-042', name: 'Boston Medical Center', score: 94, tier: 'critical', major: 11, trend: '↑' },
    { siteId: 'SITE-017', name: 'London Royal Infirmary', score: 81, tier: 'critical', major: 8, trend: '↑' },
    { siteId: 'SITE-138', name: 'Tokyo General Hospital', score: 74, tier: 'high', major: 6, trend: '→' },
    { siteId: 'SITE-079', name: 'Paris Salpêtrière', score: 68, tier: 'high', major: 5, trend: '↓' },
    { siteId: 'SITE-055', name: 'Sydney Clinical Research', score: 61, tier: 'high', major: 4, trend: '→' },
  ],
  severityBreakdown: [
    { label: 'Major', count: 89, color: 'bg-red-500', pct: 28 },
    { label: 'Minor', count: 173, color: 'bg-yellow-500', pct: 55 },
    { label: 'Admin', count: 50, color: 'bg-slate-500', pct: 17 },
  ],
  mcpTools: [
    { name: 'detect_deviations', calls: 142, status: 'active' },
    { name: 'get_site_risk_score', calls: 98, status: 'active' },
    { name: 'classify_severity', calls: 76, status: 'active' },
    { name: 'generate_capa_report', calls: 34, status: 'active' },
    { name: 'list_high_risk_sites', calls: 29, status: 'active' },
    { name: 'search_similar_deviations', calls: 21, status: 'active' },
    { name: 'get_patient_records', calls: 18, status: 'active' },
    { name: 'get_protocol_spec', calls: 12, status: 'active' },
  ],
};

const tierColor: Record<string, string> = {
  critical: 'text-red-400 bg-red-400/10 border-red-400/30',
  high: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
  medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  low: 'text-green-400 bg-green-400/10 border-green-400/30',
};

const sevColor: Record<string, string> = {
  Major: 'text-red-400 bg-red-400/10 border border-red-400/30',
  Minor: 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/30',
  Administrative: 'text-slate-400 bg-slate-400/10 border border-slate-400/30',
};

function KpiCard({ label, value, sub, color }: { label: string; value: string | number; sub: string; color: string }) {
  return (
    <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
      <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">{label}</p>
      <p className={`text-3xl font-bold mt-2 ${color}`}>{typeof value === 'number' ? value.toLocaleString() : value}</p>
      <p className="text-slate-500 text-xs mt-1">{sub}</p>
    </div>
  );
}

export default function Dashboard() {
  const { data: health, isLoading: healthLoading } = useQuery<HealthResponse>({
    queryKey: ['health'],
    queryFn: () => apiClient.get('/health') as unknown as Promise<HealthResponse>,
    refetchInterval: 30_000,
    retry: 1,
  });
  const { data: sites } = useQuery<SitesResponse>({
    queryKey: ['sites-count'],
    queryFn: () => apiClient.get('/api/sites?limit=1') as unknown as Promise<SitesResponse>,
    retry: 1,
  });
  const { data: highRisk } = useQuery<HighRiskResponse>({
    queryKey: ['high-risk'],
    queryFn: () => apiClient.get('/api/sites/high-risk?threshold=50&limit=200') as unknown as Promise<HighRiskResponse>,
    retry: 1,
  });
  const { data: openDevs } = useQuery<DeviationsResponse>({
    queryKey: ['open-devs'],
    queryFn: () => apiClient.get('/api/deviations?status=open&limit=1') as unknown as Promise<DeviationsResponse>,
    retry: 1,
  });
  const { data: majorDevs } = useQuery<DeviationsResponse>({
    queryKey: ['major-devs'],
    queryFn: () => apiClient.get('/api/deviations?severity=Major&limit=1') as unknown as Promise<DeviationsResponse>,
    retry: 1,
  });

  const backendOk = !healthLoading && health?.status === 'ok';

  const kpis = [
    { label: 'Total Sites', value: sites?.meta?.total ?? DUMMY.totalSites, sub: '200 sites globally enrolled', color: 'text-white' },
    { label: 'High-Risk Sites', value: highRisk?.data?.length ?? DUMMY.highRisk, sub: 'Risk score ≥ 50', color: 'text-red-400' },
    { label: 'Open Deviations', value: openDevs?.meta?.total ?? DUMMY.openDeviations, sub: 'Pending review', color: 'text-orange-400' },
    { label: 'Major Deviations', value: majorDevs?.meta?.total ?? DUMMY.majorDeviations, sub: 'ICH E6 GCP Major', color: 'text-red-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white text-xl font-semibold">Overview</h2>
          <p className="text-slate-400 text-sm mt-0.5">Real-time clinical trial monitoring across all sites</p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${backendOk ? 'bg-green-400/10 border-green-400/30 text-green-400' : 'bg-red-400/10 border-red-400/30 text-red-400'}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${backendOk ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
          {healthLoading ? 'Checking backend…' : backendOk ? 'Live Data' : 'Demo Mode (Backend offline)'}
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => <KpiCard key={k.label} {...k} />)}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Recent deviations */}
        <div className="col-span-2 bg-slate-800 border border-slate-700/50 rounded-xl">
          <div className="px-5 py-4 border-b border-slate-700/50 flex items-center justify-between">
            <h3 className="text-white font-medium text-sm">Recent Deviations</h3>
            <span className="text-slate-500 text-xs">Live feed</span>
          </div>
          <div className="divide-y divide-slate-700/40">
            {DUMMY.recentDeviations.map(dev => (
              <div key={dev.id} className="px-5 py-3 flex items-center gap-4 hover:bg-slate-700/20 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-xs font-medium font-mono">{dev.id}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${sevColor[dev.severity] ?? ''}`}>{dev.severity}</span>
                  </div>
                  <p className="text-slate-400 text-xs mt-0.5 capitalize">{dev.category.replace(/_/g, ' ')} · {dev.site} · {dev.patient}</p>
                </div>
                <span className="text-slate-500 text-xs whitespace-nowrap">{dev.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Severity breakdown */}
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl">
          <div className="px-5 py-4 border-b border-slate-700/50">
            <h3 className="text-white font-medium text-sm">Severity Breakdown</h3>
          </div>
          <div className="px-5 py-4 space-y-4">
            {DUMMY.severityBreakdown.map(s => (
              <div key={s.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">{s.label}</span>
                  <span className="text-slate-400">{s.count} ({s.pct}%)</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div className={`${s.color} h-2 rounded-full`} style={{ width: `${s.pct}%` }}></div>
                </div>
              </div>
            ))}
            <div className="pt-2 border-t border-slate-700/50">
              <p className="text-slate-500 text-xs">Total: {DUMMY.severityBreakdown.reduce((a,b)=>a+b.count,0)} deviations detected</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top risk sites + MCP tools */}
      <div className="grid grid-cols-2 gap-4">
        {/* Top risk sites */}
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl">
          <div className="px-5 py-4 border-b border-slate-700/50">
            <h3 className="text-white font-medium text-sm">Top Risk Sites</h3>
          </div>
          <div className="divide-y divide-slate-700/40">
            {DUMMY.topRiskSites.map(site => (
              <div key={site.siteId} className="px-5 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium truncate">{site.name}</p>
                  <p className="text-slate-500 text-xs">{site.siteId} · {site.major} major</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 bg-slate-700 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full ${site.score >= 75 ? 'bg-red-500' : 'bg-orange-500'}`} style={{ width: `${site.score}%` }}></div>
                  </div>
                  <span className="text-white text-xs font-bold w-6">{site.score}</span>
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded border ${tierColor[site.tier] ?? ''}`}>{site.tier}</span>
                  <span className={site.trend === '↑' ? 'text-red-400' : site.trend === '↓' ? 'text-green-400' : 'text-slate-400'}>{site.trend}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* MCP tool usage */}
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl">
          <div className="px-5 py-4 border-b border-slate-700/50">
            <h3 className="text-white font-medium text-sm">IBM Bob MCP Tool Usage</h3>
            <p className="text-slate-500 text-xs mt-0.5">8 tools registered · Session activity</p>
          </div>
          <div className="px-5 py-3 space-y-2">
            {DUMMY.mcpTools.map(tool => (
              <div key={tool.name} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0"></div>
                <span className="text-slate-300 text-xs font-mono flex-1 truncate">{tool.name}</span>
                <div className="w-20 bg-slate-700 rounded-full h-1">
                  <div className="bg-blue-500 h-1 rounded-full" style={{ width: `${Math.min(100, (tool.calls / 150) * 100)}%` }}></div>
                </div>
                <span className="text-slate-500 text-xs w-8 text-right">{tool.calls}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
