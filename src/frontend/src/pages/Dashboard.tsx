import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client.js';

interface HealthResponse {
  status: string;
  checks: Record<string, unknown>;
}

export default function Dashboard() {
  const { data: healthData, isLoading } = useQuery<HealthResponse>({
    queryKey: ['health'],
    queryFn: () => apiClient.get('/health') as unknown as Promise<HealthResponse>,
    refetchInterval: 30_000,
  });

  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">Overview</h2>

      {/* Status banner */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${
              isLoading
                    ? 'bg-gray-300'
                    : healthData?.status === 'ok'
                      ? 'bg-green-500'
                      : 'bg-red-500'
            }`}
          />
          <span className="text-sm font-medium text-gray-700">
            Backend:{' '}
            {isLoading ? 'checking…' : (healthData?.status ?? 'unknown')}
          </span>
        </div>
      </div>

      {/* KPI grid — populated by Phase 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Sites', value: '—', color: 'text-gray-900' },
          { label: 'High-Risk Sites', value: '—', color: 'text-red-600' },
          { label: 'Open Deviations', value: '—', color: 'text-orange-600' },
          { label: 'Major Deviations', value: '—', color: 'text-red-700' },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="bg-white rounded-lg border border-gray-200 p-5"
          >
            <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
            <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
