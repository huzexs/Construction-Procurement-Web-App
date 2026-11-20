import { ArrowLeft, Printer } from 'lucide-react';
import { STATUS_LABELS } from '../config/constants';
import type { PublicConfig, RequestFilters, SiteRequest, UserProfile } from '../types';
import { formatQuantity } from '../utils/requests';
import { formatLagosDateTime } from '../utils/time';
import { RequestStatusBadge } from './StatusBadge';

interface AdminPrintableRequirementsProps {
  requests: SiteRequest[];
  workers: UserProfile[];
  filters: RequestFilters;
  publicConfig: PublicConfig;
  onBack: () => void;
}

export function AdminPrintableRequirements({
  requests,
  workers,
  filters,
  publicConfig,
  onBack,
}: AdminPrintableRequirementsProps) {
  const selectedWorker =
    filters.workerId === 'all'
      ? 'All workers'
      : workers.find((w) => w.uid === filters.workerId)?.displayName || 'Selected worker';
  const selectedStatus =
    filters.status === 'all' ? 'All statuses' : STATUS_LABELS[filters.status];
  const dateLabel =
    filters.fromDate || filters.toDate
      ? `${filters.fromDate || 'Start'} to ${filters.toDate || 'Present'}`
      : 'All dates';

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[44px] px-4 py-2 bg-white hover:bg-[#F3F5F6] border border-[#CFD4D8] text-[#1B2023] text-sm font-semibold rounded-sm inline-flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Back to requests</span>
        </button>

        <button
          type="button"
          onClick={() => window.print()}
          className="min-h-[44px] px-4 py-2 bg-[#F2C200] hover:bg-[#DFB300] text-[#1B2023] text-sm font-bold rounded-sm inline-flex items-center gap-2 cursor-pointer"
        >
          <Printer className="w-4 h-4" aria-hidden="true" />
          <span>Print or save as PDF</span>
        </button>
      </div>

      <article className="print-sheet bg-white border border-[#CFD4D8] rounded-sm p-6 sm:p-10">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b-2 border-[#1B2023]">
          <div>
            <h1 className="font-condensed text-3xl font-extrabold text-[#1B2023] leading-none">
              {publicConfig.companyName}
            </h1>
            <p className="mt-1 text-sm font-semibold text-[#4A5258]">
              Site requirements schedule
            </p>
          </div>
          <div className="sm:text-right text-xs text-[#4A5258] space-y-0.5 tabular-nums">
            <p>Generated: {formatLagosDateTime(Date.now())}</p>
            <p>Worker: {selectedWorker} · Status: {selectedStatus}</p>
            <p>Dates: {dateLabel}</p>
          </div>
        </div>

        {requests.length === 0 ? (
          <p className="py-10 text-center text-sm text-[#646D74]">
            No requests match the selected filters.
          </p>
        ) : (
          <div className="divide-y divide-[#DCE1E5]">
            {requests.map((req) => (
              <section key={req.id} className="py-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-[#1B2023] tabular-nums">
                      {req.requestNumber}
                    </span>
                    <span className="text-xs text-[#646D74] tabular-nums">
                      {formatLagosDateTime(req.createdAtMs)}
                    </span>
                    <span className="text-xs font-medium text-[#4A5258]">
                      · {req.workerName}
                    </span>
                  </div>
                  <RequestStatusBadge status={req.status} />
                </div>

                <p className="text-sm font-semibold text-[#1B2023]">{req.site}</p>
                <p className="text-xs text-[#4A5258] mb-2">{req.purpose}</p>

                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#CFD4D8] text-[#4A5258]">
                      <th className="py-1.5 pr-3">Item</th>
                      <th className="py-1.5 px-3 text-right w-24">Quantity</th>
                      <th className="py-1.5 pl-3 w-24">Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFF2F4]">
                    {req.items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-1.5 pr-3 font-medium text-[#1B2023]">{item.name}</td>
                        <td className="py-1.5 px-3 text-right font-mono tabular-nums text-[#1B2023]">
                          {formatQuantity(item.quantity)}
                        </td>
                        <td className="py-1.5 pl-3 text-[#4A5258]">{item.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            ))}
          </div>
        )}
      </article>
    </main>
  );
}
