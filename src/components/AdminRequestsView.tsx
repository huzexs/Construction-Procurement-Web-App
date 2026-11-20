import { Printer } from 'lucide-react';
import { STATUS_OPTIONS, STATUS_LABELS } from '../config/constants';
import type { RequestFilters, SiteRequest, UserProfile } from '../types';
import { formatQuantity } from '../utils/requests';
import { formatLagosDateTime, isWorkerOnline } from '../utils/time';
import { RequestStatusBadge } from './StatusBadge';

interface AdminRequestsViewProps {
  requests: SiteRequest[];
  filteredRequests: SiteRequest[];
  workers: UserProfile[];
  filters: RequestFilters;
  loading: boolean;
  onChangeFilters: (next: RequestFilters) => void;
  onOpenRequest: (requestId: string) => void;
  onOpenPrintableRequirements: () => void;
}

export function AdminRequestsView({
  requests,
  filteredRequests,
  workers,
  filters,
  loading,
  onChangeFilters,
  onOpenRequest,
  onOpenPrintableRequirements,
}: AdminRequestsViewProps) {
  const nowMs = Date.now();
  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const onlineWorkers = workers.filter(
    (w) => w.role === 'worker' && w.active && !w.removed && isWorkerOnline(w.lastSeenAtMs, nowMs)
  );
  const workerList = workers.filter((w) => w.role === 'worker');

  const hasActiveFilters =
    filters.workerId !== 'all' ||
    filters.status !== 'all' ||
    Boolean(filters.fromDate) ||
    Boolean(filters.toDate);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="font-condensed text-3xl sm:text-4xl font-extrabold text-[#1B2023] leading-none">
            Procurement requests
          </h1>
          <p className="mt-1 text-sm text-[#4A5258]">
            All site times displayed in West Africa Time (Africa/Lagos).
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenPrintableRequirements}
          className="min-h-[44px] px-4 py-2 bg-white hover:bg-[#F3F5F6] border border-[#1B2023] text-[#1B2023] text-sm font-semibold rounded-sm inline-flex items-center gap-2 whitespace-nowrap self-start sm:self-auto cursor-pointer"
        >
          <Printer className="w-4 h-4" aria-hidden="true" />
          <span>Print requirements</span>
        </button>
      </div>

      {/* Summary Tiles */}
      <section aria-label="Request overview" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#CFD4D8] rounded-sm p-4 sm:p-5">
          <p className="text-xs font-semibold text-[#596269]">Requests shown</p>
          <p className="mt-1 font-condensed text-4xl font-extrabold text-[#1B2023] tabular-nums">
            {filteredRequests.length}
          </p>
          <p className="mt-1 text-xs text-[#646D74] tabular-nums">
            of {requests.length} total submitted
          </p>
        </div>

        <div className="bg-white border border-[#CFD4D8] rounded-sm p-4 sm:p-5">
          <p className="text-xs font-semibold text-[#596269]">Pending review</p>
          <p className="mt-1 font-condensed text-4xl font-extrabold text-[#1B2023] tabular-nums">
            {pendingCount}
          </p>
          <p className="mt-1 text-xs text-[#646D74]">Awaiting approval or pricing</p>
        </div>

        <div className="bg-white border border-[#CFD4D8] rounded-sm p-4 sm:p-5">
          <p className="text-xs font-semibold text-[#596269]">Online now (last 5 min)</p>
          <p className="mt-1 font-condensed text-4xl font-extrabold text-[#1B2023] tabular-nums">
            {onlineWorkers.length}
          </p>
          <p className="mt-1 text-xs text-[#4A5258] truncate" title={onlineWorkers.map((w) => w.displayName).join(', ')}>
            {onlineWorkers.length > 0
              ? onlineWorkers.map((w) => w.displayName).join(', ')
              : 'No workers currently active'}
          </p>
        </div>
      </section>

      {/* Filters */}
      <section
        aria-label="Filter requests"
        className="bg-white border border-[#CFD4D8] rounded-sm p-4 sm:p-5"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div>
            <label htmlFor="filter-worker" className="block text-xs font-semibold text-[#1B2023] mb-1">
              Worker
            </label>
            <select
              id="filter-worker"
              value={filters.workerId}
              onChange={(e) => onChangeFilters({ ...filters, workerId: e.target.value })}
              className="w-full min-h-[44px] px-3 py-2 bg-[#F7F8F9] border border-[#B9C1C7] rounded-sm text-sm text-[#1B2023]"
            >
              <option value="all">All workers</option>
              {workerList.map((w) => (
                <option key={w.uid} value={w.uid}>
                  {w.displayName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filter-status" className="block text-xs font-semibold text-[#1B2023] mb-1">
              Status
            </label>
            <select
              id="filter-status"
              value={filters.status}
              onChange={(e) =>
                onChangeFilters({
                  ...filters,
                  status: e.target.value as RequestFilters['status'],
                })
              }
              className="w-full min-h-[44px] px-3 py-2 bg-[#F7F8F9] border border-[#B9C1C7] rounded-sm text-sm text-[#1B2023]"
            >
              <option value="all">All statuses</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filter-from-date" className="block text-xs font-semibold text-[#1B2023] mb-1">
              From date
            </label>
            <input
              id="filter-from-date"
              type="date"
              value={filters.fromDate}
              onChange={(e) => onChangeFilters({ ...filters, fromDate: e.target.value })}
              className="w-full min-h-[44px] px-3 py-2 bg-[#F7F8F9] border border-[#B9C1C7] rounded-sm text-sm text-[#1B2023]"
            />
          </div>

          <div>
            <label htmlFor="filter-to-date" className="block text-xs font-semibold text-[#1B2023] mb-1">
              To date
            </label>
            <input
              id="filter-to-date"
              type="date"
              value={filters.toDate}
              onChange={(e) => onChangeFilters({ ...filters, toDate: e.target.value })}
              className="w-full min-h-[44px] px-3 py-2 bg-[#F7F8F9] border border-[#B9C1C7] rounded-sm text-sm text-[#1B2023]"
            />
          </div>

          <div>
            <button
              type="button"
              disabled={!hasActiveFilters}
              onClick={() =>
                onChangeFilters({
                  workerId: 'all',
                  status: 'all',
                  fromDate: '',
                  toDate: '',
                })
              }
              className="w-full min-h-[44px] px-4 py-2 bg-[#EAECEF] hover:bg-[#DCE0E5] disabled:bg-[#F4F6F7] disabled:text-[#78828A] border border-[#C7CED3] text-[#1B2023] text-sm font-semibold rounded-sm transition-colors cursor-pointer disabled:cursor-default"
            >
              Clear filters
            </button>
          </div>
        </div>
      </section>

      {/* Requests Table */}
      <section className="bg-white border border-[#CFD4D8] rounded-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3" aria-busy="true">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-12 bg-[#F3F5F6] rounded-sm animate-pulse" />
            ))}
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-[#1B2023]">No matching requests</p>
            <p className="mt-1 text-xs text-[#646D74]">
              Adjust the worker, status, or date range filters to see more requests.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F4F6F7] border-b border-[#CFD4D8] text-xs font-semibold text-[#4A5258]">
                  <th className="py-3 px-4 whitespace-nowrap">Number</th>
                  <th className="py-3 px-4 whitespace-nowrap">Date and time</th>
                  <th className="py-3 px-4 whitespace-nowrap">Worker</th>
                  <th className="py-3 px-4">Site and purpose</th>
                  <th className="py-3 px-4">Items</th>
                  <th className="py-3 px-4 whitespace-nowrap">Status</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E8EB] text-sm">
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-[#F9FAFB] align-top">
                    <td className="py-3 px-4 font-mono font-bold text-[#1B2023] tabular-nums whitespace-nowrap">
                      {req.requestNumber}
                    </td>
                    <td className="py-3 px-4 text-xs text-[#4A5258] tabular-nums whitespace-nowrap">
                      {formatLagosDateTime(req.createdAtMs)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-medium text-[#1B2023]">{req.workerName}</div>
                      <div className="text-xs text-[#646D74]">{req.workerEmail}</div>
                    </td>
                    <td className="py-3 px-4 min-w-[200px]">
                      <div className="font-semibold text-[#1B2023]">{req.site}</div>
                      <div className="text-xs text-[#4A5258] mt-0.5">{req.purpose}</div>
                    </td>
                    <td className="py-3 px-4 min-w-[240px]">
                      <ul className="space-y-0.5 text-xs text-[#1B2023]">
                        {req.items.map((item) => (
                          <li key={item.id} className="flex items-baseline gap-1.5">
                            <span className="font-mono tabular-nums font-semibold text-[#1B2023] whitespace-nowrap shrink-0">
                              {formatQuantity(item.quantity)} {item.unit}
                            </span>
                            <span className="text-[#4A5258]">· {item.name}</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <RequestStatusBadge status={req.status} />
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onOpenRequest(req.id)}
                        aria-label={`Open ${req.requestNumber}`}
                        className="min-h-[40px] px-3.5 py-1.5 bg-[#F2C200] hover:bg-[#DFB300] text-[#1B2023] text-xs font-bold rounded-sm transition-colors cursor-pointer"
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
