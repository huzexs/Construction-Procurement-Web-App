import { useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { UNIT_OPTIONS } from '../config/constants';
import type { SiteRequest, UnitType, UserProfile } from '../types';
import { formatQuantity, validateNewRequestInput } from '../utils/requests';
import { formatLagosDateTime } from '../utils/time';
import { RequestStatusBadge } from './StatusBadge';

interface DraftItem {
  key: string;
  name: string;
  quantity: string;
  unit: UnitType;
}

interface WorkerWorkspaceProps {
  user: UserProfile;
  requests: SiteRequest[];
  loadingRequests: boolean;
  onSubmitRequest: (input: {
    site: string;
    purpose: string;
    notes: string;
    items: { name: string; quantity: number; unit: UnitType }[];
  }) => Promise<string>;
}

function createEmptyItem(index: number): DraftItem {
  return {
    key: `draft_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 6)}`,
    name: '',
    quantity: '',
    unit: 'pcs',
  };
}

export function WorkerWorkspace({
  user,
  requests,
  loadingRequests,
  onSubmitRequest,
}: WorkerWorkspaceProps) {
  const [site, setSite] = useState('');
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<DraftItem[]>(() => [createEmptyItem(0)]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedNumber, setSubmittedNumber] = useState<string | null>(null);

  function handleAddItem() {
    setItems((prev) => [...prev, createEmptyItem(prev.length)]);
  }

  function handleRemoveItem(key: string) {
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((item) => item.key !== key)));
  }

  function handleItemChange(key: string, field: keyof Omit<DraftItem, 'key'>, value: string) {
    setItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, [field]: value } : item))
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmittedNumber(null);

    const check = validateNewRequestInput({
      site,
      purpose,
      notes,
      items: items.map((it) => ({
        name: it.name,
        quantity: it.quantity,
        unit: it.unit,
      })),
    });

    if (!check.valid || !check.sanitized) {
      setError(check.error || 'Please review your request fields.');
      return;
    }

    setSubmitting(true);
    try {
      const reqNum = await onSubmitRequest(check.sanitized);
      setSite('');
      setPurpose('');
      setNotes('');
      setItems([createEmptyItem(0)]);
      setSubmittedNumber(reqNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit request.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h1 className="font-condensed text-3xl sm:text-4xl font-extrabold text-[#1B2023] leading-none">
            Site material &amp; equipment requests
          </h1>
          <p className="mt-1.5 text-sm text-[#4A5258]">
            Signed in as {user.displayName} · {user.email}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* New Request Form */}
        <section
          aria-labelledby="new-request-heading"
          className="lg:col-span-5 bg-white border border-[#CFD4D8] rounded-sm p-5 sm:p-6"
        >
          <h2
            id="new-request-heading"
            className="font-condensed text-2xl font-bold text-[#1B2023] mb-4"
          >
            New request
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="req-site" className="block text-sm font-semibold text-[#1B2023] mb-1">
                Site or project
              </label>
              <input
                id="req-site"
                type="text"
                value={site}
                onChange={(e) => setSite(e.target.value)}
                placeholder="e.g. Lekki Phase 2 — Commercial Annex"
                className="w-full min-h-[44px] px-3 py-2 bg-[#F7F8F9] border border-[#B9C1C7] focus:border-[#1B2023] focus:outline-none rounded-sm text-sm text-[#1B2023]"
              />
            </div>

            <div>
              <label htmlFor="req-purpose" className="block text-sm font-semibold text-[#1B2023] mb-1">
                What it's for
              </label>
              <input
                id="req-purpose"
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="e.g. First floor slab reinforcement"
                className="w-full min-h-[44px] px-3 py-2 bg-[#F7F8F9] border border-[#B9C1C7] focus:border-[#1B2023] focus:outline-none rounded-sm text-sm text-[#1B2023]"
              />
            </div>

            <div className="pt-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-[#1B2023]">Items needed</span>
                <span className="text-xs text-[#646D74] tabular-nums">
                  {items.length} {items.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div
                    key={item.key}
                    className="p-3 bg-[#F7F8F9] border border-[#DCE1E5] rounded-sm space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#4A5258]">
                        Item {idx + 1}
                      </span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.key)}
                          aria-label={`Remove item ${idx + 1}`}
                          className="min-h-[36px] px-2.5 py-1 text-xs font-semibold text-[#881B1B] hover:bg-[#FCE8E8] border border-[#E5A3A3] rounded-sm inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor={`item-name-${item.key}`}
                        className="block text-xs font-medium text-[#4A5258] mb-1"
                      >
                        Item name
                      </label>
                      <input
                        id={`item-name-${item.key}`}
                        type="text"
                        value={item.name}
                        onChange={(e) => handleItemChange(item.key, 'name', e.target.value)}
                        placeholder="e.g. Dangote 3X Cement 50kg"
                        className="w-full min-h-[44px] px-3 py-2 bg-white border border-[#B9C1C7] focus:border-[#1B2023] focus:outline-none rounded-sm text-sm text-[#1B2023]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label
                          htmlFor={`item-qty-${item.key}`}
                          className="block text-xs font-medium text-[#4A5258] mb-1"
                        >
                          Quantity
                        </label>
                        <input
                          id={`item-qty-${item.key}`}
                          type="number"
                          min="0.01"
                          step="any"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(item.key, 'quantity', e.target.value)}
                          placeholder="0"
                          className="w-full min-h-[44px] px-3 py-2 bg-white border border-[#B9C1C7] focus:border-[#1B2023] focus:outline-none rounded-sm text-sm font-mono tabular-nums text-[#1B2023]"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor={`item-unit-${item.key}`}
                          className="block text-xs font-medium text-[#4A5258] mb-1"
                        >
                          Unit
                        </label>
                        <select
                          id={`item-unit-${item.key}`}
                          value={item.unit}
                          onChange={(e) => handleItemChange(item.key, 'unit', e.target.value)}
                          className="w-full min-h-[44px] px-2.5 py-2 bg-white border border-[#B9C1C7] focus:border-[#1B2023] focus:outline-none rounded-sm text-sm text-[#1B2023]"
                        >
                          {UNIT_OPTIONS.map((unit) => (
                            <option key={unit} value={unit}>
                              {unit}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddItem}
                className="mt-3 w-full min-h-[44px] px-4 py-2 bg-white hover:bg-[#F3F5F6] border border-[#1B2023] text-[#1B2023] text-sm font-semibold rounded-sm inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>Add another item</span>
              </button>
            </div>

            <div>
              <label htmlFor="req-notes" className="block text-sm font-semibold text-[#1B2023] mb-1">
                Notes (optional)
              </label>
              <textarea
                id="req-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Delivery window, gate instructions, or spec details"
                className="w-full px-3 py-2.5 bg-[#F7F8F9] border border-[#B9C1C7] focus:border-[#1B2023] focus:outline-none rounded-sm text-sm text-[#1B2023]"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="p-3.5 bg-[#FCE8E8] border border-[#E5A3A3] text-[#881B1B] text-sm font-medium rounded-sm"
              >
                {error}
              </div>
            )}

            {submittedNumber && (
              <div
                role="status"
                className="p-3.5 bg-[#E2F3E8] border border-[#8AC9A2] text-[#14532D] text-sm font-medium rounded-sm"
              >
                Request <span className="font-mono font-bold">{submittedNumber}</span> submitted.
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[48px] px-5 py-3 bg-[#F2C200] hover:bg-[#DFB300] disabled:opacity-60 text-[#1B2023] font-bold text-base rounded-sm transition-colors cursor-pointer"
            >
              {submitting ? 'Submitting request...' : 'Submit request'}
            </button>
          </form>
        </section>

        {/* My Requests List */}
        <section
          aria-labelledby="my-requests-heading"
          className="lg:col-span-7 bg-white border border-[#CFD4D8] rounded-sm p-5 sm:p-6"
        >
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2
              id="my-requests-heading"
              className="font-condensed text-2xl font-bold text-[#1B2023]"
            >
              My requests
            </h2>
            <span className="text-xs font-medium text-[#646D74] tabular-nums">
              {requests.length} {requests.length === 1 ? 'request' : 'requests'}
            </span>
          </div>

          {loadingRequests ? (
            <div className="space-y-3" aria-busy="true">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-28 bg-[#F3F5F6] border border-[#E2E6E9] rounded-sm animate-pulse" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="py-12 px-4 text-center border border-dashed border-[#C7CED3] rounded-sm bg-[#F8F9FA]">
              <p className="text-sm font-semibold text-[#1B2023]">No requests submitted yet</p>
              <p className="mt-1 text-xs text-[#646D74]">
                Use the New request form to submit your first material or equipment request.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#DCE1E5] border border-[#DCE1E5] rounded-sm">
              {requests.map((req) => (
                <article key={req.id} className="p-4 bg-white">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-[#1B2023] tabular-nums">
                        {req.requestNumber}
                      </span>
                      <span className="text-xs text-[#646D74] tabular-nums">
                        {formatLagosDateTime(req.createdAtMs)}
                      </span>
                    </div>
                    <RequestStatusBadge status={req.status} />
                  </div>

                  <p className="text-sm font-semibold text-[#1B2023]">{req.site}</p>
                  <p className="text-sm text-[#4A5258] mb-3">{req.purpose}</p>

                  <ul className="space-y-1 bg-[#F7F8F9] border border-[#E4E8EB] rounded-sm px-3 py-2 text-xs text-[#1B2023]">
                    {req.items.map((item) => (
                      <li key={item.id} className="flex items-baseline justify-between gap-3">
                        <span className="font-medium">{item.name}</span>
                        <span className="font-mono tabular-nums text-[#4A5258] whitespace-nowrap">
                          {formatQuantity(item.quantity)} {item.unit}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {req.notes && (
                    <p className="mt-2.5 text-xs text-[#596269]">
                      <span className="font-semibold text-[#1B2023]">Notes:</span> {req.notes}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
