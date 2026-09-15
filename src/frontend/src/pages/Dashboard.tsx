import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client.js';

interface HealthResponse { status: string; }
interface SitesResponse { data: unknown[]; meta: { total: number } }
interface DeviationsResponse { data: Array<{ severity: string; status: string }>; meta: { total: number } }
interface HighRiskResponse { data: unknown[] }

export default function Dashboard() {
  const { data: health, isLoading: healthLoading } = useQuery<HealthResponse>({
    queryKey: ['health'],
    queryFn: () => apiClient.get('/health') as unknown as Promise<HealthResponse>,
    refetchInterval: 30_000,
  });

  const { data: sites } = useQuery<SitesResponse>({
    queryKey: ['sites-count'],
    queryFn: () => apiClient.get('/api/sites?limit=1') as unknown as Promise<SitesResponse>,
  });

  const { data: highRisk } = useQuery<HighRiskResponse>({
    queryKey: ['high-risk-sites'],
    queryFn: () => apiClient.get('/api/sites/high-risk?threshold=50&limit=200') as unknown as Promise<HighRiskResponse>,
  });

  const { data: deviations } = useQuery<DeviationsResponse>({
    queryKey: ['deviations-summary'],
    queryFn: () => apiClient.get('/api/deviations?limit=1') as unknown as Promise<DeviationsResponse>,
  });

  const { data: majorDevs } = useQuery<DeviationsResponse>({
    queryKey: ['major-deviations'],
    queryFn: () => apiClient.get('/api/deviations?severity=Major&limit=1') as unknown as Promise<DeviationsResponse>,
  });

  const { data: openDevs } = useQuery<DeviationsResponse>({
    queryKey: ['open-deviations'],
    queryFn: () => apiClient.get('/api/deviations?status=open&limit=1') as unknown as Promise<DeviationsResponse>,
  });

  const kpis = [
    {
      label: 'Total Sites',
      value: sites?.meta?.total ?? '—',
      color: 'text-gray-900',
      bg: 'bg-gray-50',
    },
    {
      label: 'High-Risk Sites',
      value: highRisk?.data?.length ?? '—',
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
    {
      label: 'Open Deviations',
      value: openDevs?.meta?.total ?? '—',
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
    {
      label: 'Major Deviations',
      value: majorDevs?.meta?.total ?? '—',
      color: 'text-red-700',
      bg: 'bg-red-50',
    },
  ];

  const totalDeviations = deviations?.meta?.total;

  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">Overview</h2>

      {/* Backend status */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${healthLoading ? 'bg-gray-300' : health?.status === 'ok' ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-sm font-medium text-gray-700">
          Backend: {healthLoading ? 'checking…' : (health?.status ?? 'unreachable')}
        </span>
        {totalDeviations !== undefined && (
          <span className="ml-auto text-xs text-gray-400">{totalDeviations.toLocaleString()} total deviations in database</span>
        )}
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-lg border border-gray-200 p-5`}>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{label}</p>
            <p className={`text-3xl font-bold mt-2 ${color}`}>{typeof value === 'number' ? value.toLocaleString() : value}</p>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <strong>IBM Bob MCP Integration:</strong> Use Bob to query deviations, score sites, and generate CAPA reports via the <code className="bg-blue-100 px-1 rounded">clinical-trial-monitor</code> MCP server (8 tools registered).
      </div>
    </div>
  );
}
