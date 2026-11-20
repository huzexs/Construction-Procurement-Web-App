import { useMemo, useState } from 'react';
import { Printer } from 'lucide-react';
import type { PublicConfig, SiteRequest, UserProfile } from '../types';
import {
  aggregateReportItems,
  filterRequests,
  formatCurrency,
  formatQuantity,
} from '../utils/requests';
import { formatLagosDateTime } from '../utils/time';

interface AdminReportViewProps {
  requests: SiteRequest[];
  workers: UserProfile[];
  publicConfig: PublicConfig;
}

export function AdminReportView({ requests, workers, publicConfig }: AdminReportViewProps) {
  const [workerId, setWorkerId] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const workerList = workers.filter((w) => w.role === 'worker');

  const filtered = useMemo(
    () =>
      filterRequests(requests, {
        workerId,
        status: 'all',
        fromDate,
        toDate,
      }),
    [requests, workerId, fromDate, toDate]
  );

  const nonRejectedCount = filtered.filter((r) => r.status !== 'rejected').length;
  const rejectedCount = filtered.length - nonRejectedCount;
  const rows = useMemo(() => aggregateReportItems(filtered), [filtered]);
  const symbol = publicConfig.currencySymbol || '₦';

  const hasAnyTotalCost = rows.some((r) => r.hasAnyPrice && r.estimatedTotal !== null);
  const grandTotal = rows.reduce((acc, r) => acc + (r.estimatedTotal ?? 0), 0);

  const selectedWorkerLabel =
    workerId === 'all'
      ? 'All workers'
      : workerList.find((w) => w.uid === workerId)?.displayName || 'Selected worker';
  const periodLabel =
    fromDate || toDate ? `${fromDate || 'Start'} to ${toDate || 'Present'}` : 'All dates';

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <div className="no-print flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="font-condensed text-3xl sm:text-4xl font-extrabold text-[#1B2023] leading-none">
            Combined procurement report
          </h1>
          <p className="mt-1 text-sm text-[#4A5258]">
            Identical items and units are summed together. Rejected requests are excluded.
          </p>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="min-h-[44px] px-4 py-2 bg-[#F2C200] hover:bg-[#DFB300] text-[#1B2023] text-sm font-bold rounded-sm inline-flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <Printer className="w-4 h-4" aria-hidden="true" />
          <span>Print or save as PDF</span>
        </button>
      </div>

      {/* Filters (Hidden on print) */}
      <section
        aria-label="Report filters"
        className="no-print bg-white border border-[#CFD4D8] rounded-sm p-4 sm:p-5"
      >
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label htmlFor="report-worker" className="block text-xs font-semibold text-[#1B2023] mb-1">
              Worker
            </label>
            <select
              id="report-worker"
              value={workerId}
              onChange={(e) => setWorkerId(e.target.value)}
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
            <label htmlFor="report-from" className="block text-xs font-semibold text-[#1B2023] mb-1">
              From date
            </label>
            <input
              id="report-from"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 bg-[#F7F8F9] border border-[#B9C1C7] rounded-sm text-sm text-[#1B2023]"
            />
          </div>

          <div>
            <label htmlFor="report-to" className="block text-xs font-semibold text-[#1B2023] mb-1">
              To date
            </label>
            <input
              id="report-to"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 bg-[#F7F8F9] border border-[#B9C1C7] rounded-sm text-sm text-[#1B2023]"
            />
          </div>

          <div>
            <button
              type="button"
              onClick={() => {
                setWorkerId('all');
                setFromDate('');
                setToDate('');
              }}
              className="w-full min-h-[44px] px-4 py-2 bg-[#EAECEF] hover:bg-[#DCE0E5] text-[#1B2023] text-sm font-semibold rounded-sm cursor-pointer"
            >
              Reset filters
            </button>
          </div>
        </div>
      </section>

      {/* Printable Report Sheet */}
      <article className="print-sheet bg-white border border-[#CFD4D8] rounded-sm p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b-2 border-[#1B2023]">
          <div>
            <p className="font-condensed text-3xl font-extrabold text-[#1B2023] leading-none">
              {publicConfig.companyName}
            </p>
            <p className="mt-1 text-sm font-semibold text-[#4A5258]">
              Combined Material &amp; Equipment Totals
            </p>
          </div>
          <div className="sm:text-right text-xs text-[#4A5258] space-y-0.5 tabular-nums">
            <p>Generated: {formatLagosDateTime(Date.now())}</p>
            <p>Worker: {selectedWorkerLabel} · Dates: {periodLabel}</p>
            <p>
              Included requests: {nonRejectedCount}
              {rejectedCount > 0 ? ` (${rejectedCount} rejected excluded)` : ''}
            </p>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm font-semibold text-[#1B2023]">No items to summarize</p>
            <p className="mt-1 text-xs text-[#646D74]">
              No non-rejected requests match the selected worker and date range.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-[#1B2023] text-xs font-semibold text-[#1B2023]">
                  <th className="py-2.5 pr-3">Item</th>
                  <th className="py-2.5 px-3 text-right">Total quantity</th>
                  <th className="py-2.5 px-3">Unit</th>
                  <th className="py-2.5 px-3 text-right">Requests</th>
                  {hasAnyTotalCost && (
                    <th className="py-2.5 pl-3 text-right">Priced total</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E8EB] text-sm">
                {rows.map((row) => (
                  <tr key={row.key}>
                    <td className="py-2.5 pr-3 font-medium text-[#1B2023]">{row.itemName}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-[#1B2023]">
                      {formatQuantity(row.totalQuantity)}
                    </td>
                    <td className="py-2.5 px-3 text-[#4A5258]">{row.unit}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#4A5258]">
                      {row.requestCount}
                    </td>
                    {hasAnyTotalCost && (
                      <td className="py-2.5 pl-3 text-right font-mono tabular-nums font-semibold text-[#1B2023]">
                        {row.hasAnyPrice && row.estimatedTotal !== null
                          ? formatCurrency(row.estimatedTotal, symbol)
                          : '—'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              {hasAnyTotalCost && (
                <tfoot>
                  <tr className="border-t-2 border-[#1B2023]">
                    <td colSpan={4} className="py-3 px-3 text-right text-sm font-bold text-[#1B2023]">
                      Priced subtotal
                    </td>
                    <td className="py-3 pl-3 text-right font-mono text-base font-bold tabular-nums text-[#1B2023]">
                      {formatCurrency(grandTotal, symbol)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </article>
    </main>
  );
}
