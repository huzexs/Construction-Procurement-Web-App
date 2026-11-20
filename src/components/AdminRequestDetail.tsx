import { useEffect, useState } from 'react';
import { ArrowLeft, Printer, Save } from 'lucide-react';
import { STATUS_LABELS, STATUS_OPTIONS } from '../config/constants';
import type { PublicConfig, RequestItem, RequestStatus, SiteRequest } from '../types';
import {
  calculateItemAmount,
  calculateRequestTotal,
  formatCurrency,
  formatQuantity,
} from '../utils/requests';
import { formatLagosDateTime } from '../utils/time';
import { RequestStatusBadge } from './StatusBadge';

interface AdminRequestDetailProps {
  request: SiteRequest;
  publicConfig: PublicConfig;
  onBack: () => void;
  onSave: (requestId: string, status: RequestStatus, items: RequestItem[]) => Promise<void>;
}

export function AdminRequestDetail({
  request,
  publicConfig,
  onBack,
  onSave,
}: AdminRequestDetailProps) {
  const [status, setStatus] = useState<RequestStatus>(request.status);
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const item of request.items) {
      map[item.id] = item.unitPrice != null ? String(item.unitPrice) : '';
    }
    return map;
  });
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setStatus(request.status);
    const map: Record<string, string> = {};
    for (const item of request.items) {
      map[item.id] = item.unitPrice != null ? String(item.unitPrice) : '';
    }
    setPriceInputs(map);
  }, [request]);

  const draftItems: RequestItem[] = request.items.map((item) => {
    const raw = (priceInputs[item.id] ?? '').trim();
    if (!raw) {
      return { ...item, unitPrice: null };
    }
    const parsed = Number(raw);
    return {
      ...item,
      unitPrice: Number.isFinite(parsed) && parsed >= 0 ? parsed : null,
    };
  });

  const { hasAnyPrice, total } = calculateRequestTotal(draftItems);
  const symbol = publicConfig.currencySymbol || '₦';

  async function handleSave() {
    setSaveError(null);
    setSaveMessage(null);

    for (const item of request.items) {
      const raw = (priceInputs[item.id] ?? '').trim();
      if (raw !== '') {
        const parsed = Number(raw);
        if (!Number.isFinite(parsed) || parsed < 0) {
          setSaveError(`Invalid unit price for "${item.name}". Enter 0 or a positive number.`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      await onSave(request.id, status, draftItems);
      setSaveMessage('Request status and unit prices saved.');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Unable to save changes.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Control Bar (Hidden on print) */}
      <div className="no-print space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
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
            className="min-h-[44px] px-4 py-2 bg-[#1B2023] hover:bg-[#2E353A] text-white text-sm font-semibold rounded-sm inline-flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" aria-hidden="true" />
            <span>Print or save as PDF</span>
          </button>
        </div>

        {/* Admin Review & Pricing Panel */}
        <section
          aria-labelledby="review-controls-heading"
          className="bg-white border border-[#CFD4D8] rounded-sm p-5 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 id="review-controls-heading" className="font-condensed text-2xl font-bold text-[#1B2023]">
              Review {request.requestNumber}
            </h1>
            <div className="flex items-center gap-3">
              <label htmlFor="detail-status" className="text-sm font-semibold text-[#1B2023]">
                Status
              </label>
              <select
                id="detail-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as RequestStatus)}
                className="min-h-[44px] px-3 py-2 bg-[#F7F8F9] border border-[#B9C1C7] rounded-sm text-sm font-semibold text-[#1B2023]"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {STATUS_LABELS[opt]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-[#4A5258]">
              Optional unit prices ({symbol})
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {request.items.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-[#F7F8F9] border border-[#DCE1E5] rounded-sm flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#1B2023] truncate">{item.name}</p>
                    <p className="text-xs text-[#646D74] font-mono tabular-nums">
                      {formatQuantity(item.quantity)} {item.unit}
                    </p>
                  </div>
                  <div className="w-40 shrink-0">
                    <label htmlFor={`price-${item.id}`} className="sr-only">
                      Unit price for {item.name}
                    </label>
                    <input
                      id={`price-${item.id}`}
                      type="number"
                      min="0"
                      step="any"
                      value={priceInputs[item.id] ?? ''}
                      onChange={(e) =>
                        setPriceInputs((prev) => ({ ...prev, [item.id]: e.target.value }))
                      }
                      placeholder={`Price (${symbol})`}
                      className="w-full min-h-[44px] px-3 py-2 bg-white border border-[#B9C1C7] focus:border-[#1B2023] focus:outline-none rounded-sm text-sm font-mono tabular-nums text-right text-[#1B2023]"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {saveError && (
            <div role="alert" className="p-3 bg-[#FCE8E8] border border-[#E5A3A3] text-[#881B1B] text-sm font-medium rounded-sm">
              {saveError}
            </div>
          )}

          {saveMessage && (
            <div role="status" className="p-3 bg-[#E2F3E8] border border-[#8AC9A2] text-[#14532D] text-sm font-medium rounded-sm">
              {saveMessage}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="min-h-[44px] px-5 py-2.5 bg-[#F2C200] hover:bg-[#DFB300] disabled:opacity-60 text-[#1B2023] text-sm font-bold rounded-sm inline-flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" aria-hidden="true" />
              <span>{saving ? 'Saving...' : 'Save changes'}</span>
            </button>
          </div>
        </section>
      </div>

      {/* Printable Invoice / Requisition Sheet */}
      <article className="print-sheet bg-white border border-[#CFD4D8] rounded-sm p-6 sm:p-10">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b-2 border-[#1B2023]">
          <div>
            <p className="font-condensed text-3xl font-extrabold text-[#1B2023] leading-none">
              {publicConfig.companyName}
            </p>
            <p className="mt-1 text-xs font-semibold text-[#596269]">
              Material &amp; Equipment Requisition Sheet
            </p>
          </div>
          <div className="sm:text-right">
            <p className="font-mono text-2xl font-bold text-[#1B2023] tabular-nums">
              {request.requestNumber}
            </p>
            <p className="mt-1 text-xs text-[#4A5258] tabular-nums">
              {formatLagosDateTime(request.createdAtMs)}
            </p>
            <div className="mt-2">
              <RequestStatusBadge status={status} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-5 border-b border-[#DCE1E5] text-sm">
          <div>
            <p className="text-xs font-semibold text-[#646D74]">Requested by</p>
            <p className="font-semibold text-[#1B2023]">{request.workerName}</p>
            <p className="text-xs text-[#4A5258]">{request.workerEmail}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-[#646D74]">Site or project</p>
            <p className="font-semibold text-[#1B2023]">{request.site}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs font-semibold text-[#646D74]">What it's for</p>
            <p className="text-[#1B2023]">{request.purpose}</p>
          </div>
        </div>

        <div className="py-5">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-[#1B2023] text-xs font-semibold text-[#1B2023]">
                  <th className="py-2.5 pr-3 w-10">#</th>
                  <th className="py-2.5 px-3">Item description</th>
                  <th className="py-2.5 px-3 text-right">Qty</th>
                  <th className="py-2.5 px-3">Unit</th>
                  {hasAnyPrice && (
                    <>
                      <th className="py-2.5 px-3 text-right">Unit price</th>
                      <th className="py-2.5 pl-3 text-right">Amount</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E8EB] text-sm">
                {draftItems.map((item, idx) => {
                  const amount = calculateItemAmount(item);
                  return (
                    <tr key={item.id}>
                      <td className="py-2.5 pr-3 font-mono text-xs text-[#646D74] tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-[#1B2023]">{item.name}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#1B2023]">
                        {formatQuantity(item.quantity)}
                      </td>
                      <td className="py-2.5 px-3 text-[#4A5258]">{item.unit}</td>
                      {hasAnyPrice && (
                        <>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#4A5258]">
                            {item.unitPrice != null ? formatCurrency(item.unitPrice, symbol) : '—'}
                          </td>
                          <td className="py-2.5 pl-3 text-right font-mono tabular-nums font-semibold text-[#1B2023]">
                            {amount != null ? formatCurrency(amount, symbol) : '—'}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              {hasAnyPrice && (
                <tfoot>
                  <tr className="border-t-2 border-[#1B2023]">
                    <td colSpan={5} className="py-3 px-3 text-right text-sm font-bold text-[#1B2023]">
                      Total
                    </td>
                    <td className="py-3 pl-3 text-right font-mono text-base font-bold tabular-nums text-[#1B2023]">
                      {formatCurrency(total, symbol)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        <div className="py-4 border-t border-[#DCE1E5]">
          <p className="text-xs font-semibold text-[#646D74]">Notes</p>
          <p className="mt-1 text-sm text-[#1B2023]">
            {request.notes ? request.notes : 'No additional notes.'}
          </p>
        </div>

        <div className="mt-10 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-10">
          <div>
            <div className="h-12 border-b border-[#1B2023]" />
            <p className="mt-2 text-xs font-semibold text-[#4A5258]">
              Requested by / Site supervisor
            </p>
          </div>
          <div>
            <div className="h-12 border-b border-[#1B2023]" />
            <p className="mt-2 text-xs font-semibold text-[#4A5258]">
              Approved by / Procurement office
            </p>
          </div>
        </div>
      </article>
    </main>
  );
}
