import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client.js';

interface Deviation {
  deviationId: string;
  patientId: string;
  siteId: string;
  visitId: string;
  category: string;
  severity: 'Major' | 'Minor' | 'Administrative';
  status: 'open' | 'under_review' | 'resolved' | 'waived';
  description: string;
  protocolSection: string;
  detectedAt: string;
}

interface ApiResponse {
  data: Deviation[];
  meta: { total: number; page: number; limit: number };
}

const severityBadge: Record<string, string> = {
  Major:          'bg-red-100 text-red-800 border border-red-300',
  Minor:          'bg-yellow-100 text-yellow-800 border border-yellow-300',
  Administrative: 'bg-gray-100 text-gray-700 border border-gray-300',
};

const statusBadge: Record<string, string> = {
  open:         'bg-orange-100 text-orange-800',
  under_review: 'bg-blue-100 text-blue-800',
  resolved:     'bg-green-100 text-green-800',
  waived:       'bg-gray-100 text-gray-600',
};

export default function DeviationList() {
  const [severity, setSeverity] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading, error } = useQuery<ApiResponse>({
    queryKey: ['deviations', severity, status, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (severity) params.set('severity', severity);
      if (status) params.set('status', status);
      return apiClient.get(`/api/deviations?${params.toString()}`) as unknown as Promise<ApiResponse>;
    },
  });

  const deviations = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      {/* Header + filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">
          Protocol Deviations
          {total > 0 && <span className="ml-2 text-base font-normal text-gray-400">({total.toLocaleString()} total)</span>}
        </h2>
        <div className="flex gap-2">
          <select
            className="border border-gray-300 rounded px-2 py-1 text-sm"
            value={severity}
            onChange={(e) => { setSeverity(e.target.value); setPage(1); }}
          >
            <option value="">All severities</option>
            <option value="Major">Major</option>
            <option value="Minor">Minor</option>
            <option value="Administrative">Administrative</option>
          </select>
          <select
            className="border border-gray-300 rounded px-2 py-1 text-sm"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          >
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="under_review">Under Review</option>
            <option value="resolved">Resolved</option>
            <option value="waived">Waived</option>
          </select>
        </div>
      </div>

      {isLoading && (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400 text-sm">
          Loading deviations…
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          Backend unavailable — start the backend at localhost:3001
        </div>
      )}

      {!isLoading && !error && deviations.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400 text-sm">
          No deviations found. Try running detect_deviations via Bob, or seed data first.
        </div>
      )}

      {deviations.length > 0 && (
        <>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">ID</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Patient / Site</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Severity</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Detected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {deviations.map((dev) => (
                  <tr key={dev.deviationId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{dev.deviationId}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{dev.patientId}</div>
                      <div className="text-xs text-gray-400">{dev.siteId} · {dev.visitId}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{dev.category?.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${severityBadge[dev.severity] ?? ''}`}>
                        {dev.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${statusBadge[dev.status] ?? ''}`}>
                        {dev.status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs max-w-xs truncate" title={dev.description}>
                      {dev.description}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {dev.detectedAt ? new Date(dev.detectedAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between text-sm text-gray-500">
              <span>Page {page} of {totalPages} · {total.toLocaleString()} deviations</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50"
                >
                  ← Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1 border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50"
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
