import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client.js';

interface Deviation {
  deviationId: string; patientId: string; siteId: string;
  visitId: string; category: string;
  severity: 'Major' | 'Minor' | 'Administrative';
  status: 'open' | 'under_review' | 'resolved' | 'waived';
  description: string; protocolSection: string; detectedAt: string;
}
interface ApiResponse { data: Deviation[]; meta: { total: number; page: number; limit: number } }

const DUMMY_DEVIATIONS: Deviation[] = [
  { deviationId: 'DEV-A1B2C3', patientId: 'PAT-1891', siteId: 'SITE-042', visitId: 'VIS-0312', category: 'missed_procedure', severity: 'Major', status: 'open', description: 'Required procedures not completed: blood_draw, ecg (Observed: blood_draw, ecg, Expected: blood_draw, ecg, vital_signs)', protocolSection: '§8.3 Required Procedures', detectedAt: '2026-09-15T08:22:00Z' },
  { deviationId: 'DEV-D4E5F6', patientId: 'PAT-0432', siteId: 'SITE-017', visitId: 'VIS-0891', category: 'late_visit', severity: 'Minor', status: 'open', description: 'Visit occurred 8d late (window: -3d / +3d)', protocolSection: '§6.1 Visit Schedule Compliance', detectedAt: '2026-09-15T07:45:00Z' },
  { deviationId: 'DEV-G7H8I9', patientId: 'PAT-3301', siteId: 'SITE-138', visitId: 'VIS-1204', category: 'prohibited_medication', severity: 'Major', status: 'under_review', description: 'Prohibited medication(s) taken: warfarin', protocolSection: '§4.2 Concomitant Medications', detectedAt: '2026-09-14T15:30:00Z' },
  { deviationId: 'DEV-J0K1L2', patientId: 'PAT-2210', siteId: 'SITE-079', visitId: 'VIS-0654', category: 'dosing_error', severity: 'Major', status: 'open', description: 'Medication adherence 64% is below required 80%', protocolSection: '§5.2 Investigational Product Administration', detectedAt: '2026-09-14T11:20:00Z' },
  { deviationId: 'DEV-M3N4O5', patientId: 'PAT-0891', siteId: 'SITE-055', visitId: 'VIS-2341', category: 'data_collection_error', severity: 'Administrative', status: 'resolved', description: 'Case report form incomplete — missing adverse event notation', protocolSection: '§8.1 Case Report Forms', detectedAt: '2026-09-13T09:15:00Z' },
  { deviationId: 'DEV-P6Q7R8', patientId: 'PAT-4421', siteId: 'SITE-091', visitId: 'VIS-0781', category: 'early_visit', severity: 'Minor', status: 'open', description: 'Visit occurred 5d early (window: -3d / +3d)', protocolSection: '§6.1 Visit Schedule Compliance', detectedAt: '2026-09-13T14:00:00Z' },
  { deviationId: 'DEV-S9T0U1', patientId: 'PAT-1123', siteId: 'SITE-023', visitId: 'VIS-0432', category: 'missed_procedure', severity: 'Major', status: 'open', description: 'Required procedures not completed: mri_scan, pharmacokinetics_sample', protocolSection: '§8.3 Required Procedures', detectedAt: '2026-09-12T16:45:00Z' },
  { deviationId: 'DEV-V2W3X4', patientId: 'PAT-2987', siteId: 'SITE-067', visitId: 'VIS-1109', category: 'late_visit', severity: 'Minor', status: 'waived', description: 'Visit occurred 4d late (window: -3d / +3d)', protocolSection: '§6.1 Visit Schedule Compliance', detectedAt: '2026-09-11T10:30:00Z' },
];

const sevStyle: Record<string, string> = {
  Major:          'text-red-400 bg-red-400/10 border-red-400/30',
  Minor:          'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  Administrative: 'text-slate-400 bg-slate-400/10 border-slate-400/30',
};
const statusStyle: Record<string, string> = {
  open:         'text-orange-400 bg-orange-400/10',
  under_review: 'text-blue-400 bg-blue-400/10',
  resolved:     'text-green-400 bg-green-400/10',
  waived:       'text-slate-400 bg-slate-400/10',
};

export default function DeviationList() {
  const [severity, setSeverity] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading } = useQuery<ApiResponse>({
    queryKey: ['deviations', severity, status, page],
    queryFn: () => {
      const p = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (severity) p.set('severity', severity);
      if (status) p.set('status', status);
      return apiClient.get(`/api/deviations?${p.toString()}`) as unknown as Promise<ApiResponse>;
    },
    retry: 1,
  });

  const allDeviations = data?.data?.length ? data.data : DUMMY_DEVIATIONS.filter(d =>
    (!severity || d.severity === severity) && (!status || d.status === status)
  );
  const total = data?.meta?.total ?? allDeviations.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const majorCount = allDeviations.filter(d => d.severity === 'Major').length;
  const openCount = allDeviations.filter(d => d.status === 'open').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-white text-xl font-semibold">Protocol Deviations</h2>
          <p className="text-slate-400 text-sm mt-0.5">
            {total.toLocaleString()} total · {majorCount} major · {openCount} open
          </p>
        </div>
        <div className="flex gap-2">
          <select
            className="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-1.5"
            value={severity}
            onChange={e => { setSeverity(e.target.value); setPage(1); }}
          >
            <option value="">All severities</option>
            <option value="Major">Major</option>
            <option value="Minor">Minor</option>
            <option value="Administrative">Administrative</option>
          </select>
          <select
            className="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-1.5"
            value={status}
            onChange={e => { setStatus(e.target.value); setPage(1); }}
          >
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="under_review">Under Review</option>
            <option value="resolved">Resolved</option>
            <option value="waived">Waived</option>
          </select>
        </div>
      </div>

      {/* Summary pills */}
      <div className="flex gap-3">
        {[
          { label: 'Open', count: allDeviations.filter(d=>d.status==='open').length, color: 'text-orange-400 bg-orange-400/10 border-orange-400/20' },
          { label: 'Under Review', count: allDeviations.filter(d=>d.status==='under_review').length, color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
          { label: 'Resolved', count: allDeviations.filter(d=>d.status==='resolved').length, color: 'text-green-400 bg-green-400/10 border-green-400/20' },
          { label: 'Waived', count: allDeviations.filter(d=>d.status==='waived').length, color: 'text-slate-400 bg-slate-400/10 border-slate-400/20' },
        ].map(p => (
          <div key={p.label} className={`border rounded-lg px-3 py-1.5 text-xs font-medium ${p.color}`}>
            {p.label}: {p.count}
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-8 text-center text-slate-400 text-sm">Loading…</div>
      ) : (
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-700/50 border-b border-slate-700">
                <th className="text-left px-5 py-3 text-slate-400 font-medium text-xs uppercase tracking-wider">ID</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Patient / Site</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Category</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Severity</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Description</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Detected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/40">
              {allDeviations.map(dev => (
                <tr key={dev.deviationId} className="hover:bg-slate-700/20 transition-colors">
                  <td className="px-5 py-3.5 font-mono text-xs text-blue-400">{dev.deviationId}</td>
                  <td className="px-4 py-3.5">
                    <p className="text-white text-xs font-medium">{dev.patientId}</p>
                    <p className="text-slate-500 text-xs">{dev.siteId} · {dev.visitId}</p>
                  </td>
                  <td className="px-4 py-3.5 text-slate-300 text-xs capitalize">{dev.category.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3.5">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-md border ${sevStyle[dev.severity] ?? ''}`}>
                      {dev.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-xs font-medium px-2 py-1 rounded-md capitalize ${statusStyle[dev.status] ?? ''}`}>
                      {dev.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-400 text-xs max-w-xs truncate" title={dev.description}>
                    {dev.description}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                    {dev.detectedAt ? new Date(dev.detectedAt).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="border-t border-slate-700/50 px-5 py-3 flex items-center justify-between">
            <span className="text-slate-500 text-xs">Page {page} of {totalPages} · {total.toLocaleString()} deviations</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 bg-slate-700 border border-slate-600 text-slate-300 text-xs rounded-lg disabled:opacity-30 hover:bg-slate-600 transition-colors"
              >← Prev</button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1 bg-slate-700 border border-slate-600 text-slate-300 text-xs rounded-lg disabled:opacity-30 hover:bg-slate-600 transition-colors"
              >Next →</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
