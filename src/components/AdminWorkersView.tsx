import { useState } from 'react';
import type { SignInLog, UserProfile } from '../types';
import { formatLagosDateTime, getWorkerState } from '../utils/time';
import { WorkerStateBadge } from './StatusBadge';

interface AdminWorkersViewProps {
  users: UserProfile[];
  signInLogs: SignInLog[];
  loading: boolean;
  onToggleRemoved: (workerUid: string, nextRemoved: boolean) => Promise<void>;
}

export function AdminWorkersView({
  users,
  signInLogs,
  loading,
  onToggleRemoved,
}: AdminWorkersViewProps) {
  const [pendingUid, setPendingUid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const workers = users.filter((u) => u.role === 'worker');
  const nowMs = Date.now();

  async function handleToggle(worker: UserProfile) {
    setError(null);
    setPendingUid(worker.uid);
    try {
      await onToggleRemoved(worker.uid, !worker.removed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update worker access.');
    } finally {
      setPendingUid(null);
    }
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
      <div>
        <h1 className="font-condensed text-3xl sm:text-4xl font-extrabold text-[#1B2023] leading-none">
          Workers &amp; site access
        </h1>
        <p className="mt-1 text-sm text-[#4A5258]">
          Manage worker access and review the 50 most recent sign-ins.
        </p>
      </div>

      {error && (
        <div role="alert" className="p-3.5 bg-[#FCE8E8] border border-[#E5A3A3] text-[#881B1B] text-sm font-medium rounded-sm">
          {error}
        </div>
      )}

      {/* Workers Table */}
      <section aria-labelledby="workers-heading" className="bg-white border border-[#CFD4D8] rounded-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#DCE1E5] flex items-center justify-between gap-4">
          <h2 id="workers-heading" className="font-condensed text-2xl font-bold text-[#1B2023]">
            Registered workers
          </h2>
          <span className="text-xs font-medium text-[#646D74] tabular-nums">
            {workers.length} {workers.length === 1 ? 'worker' : 'workers'}
          </span>
        </div>

        {loading ? (
          <div className="p-6 space-y-3" aria-busy="true">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-12 bg-[#F3F5F6] rounded-sm animate-pulse" />
            ))}
          </div>
        ) : workers.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-[#1B2023]">No workers signed in yet</p>
            <p className="mt-1 text-xs text-[#646D74]">
              Share your company access code from Settings so site workers can activate their accounts.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F4F6F7] border-b border-[#CFD4D8] text-xs font-semibold text-[#4A5258]">
                  <th className="py-3 px-4 whitespace-nowrap">Name</th>
                  <th className="py-3 px-4 whitespace-nowrap">Email</th>
                  <th className="py-3 px-4 whitespace-nowrap">State</th>
                  <th className="py-3 px-4 whitespace-nowrap">Last seen</th>
                  <th className="py-3 px-4 whitespace-nowrap">Joined</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E8EB] text-sm">
                {workers.map((worker) => {
                  const state = getWorkerState(worker, nowMs);
                  const isBusy = pendingUid === worker.uid;
                  return (
                    <tr key={worker.uid} className="hover:bg-[#F9FAFB]">
                      <td className="py-3 px-4 font-semibold text-[#1B2023] whitespace-nowrap">
                        {worker.displayName}
                      </td>
                      <td className="py-3 px-4 text-xs text-[#4A5258] whitespace-nowrap">
                        {worker.email}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <WorkerStateBadge state={state} />
                      </td>
                      <td className="py-3 px-4 text-xs text-[#4A5258] tabular-nums whitespace-nowrap">
                        {formatLagosDateTime(worker.lastSeenAtMs)}
                      </td>
                      <td className="py-3 px-4 text-xs text-[#4A5258] tabular-nums whitespace-nowrap">
                        {worker.joinedAtMs ? formatLagosDateTime(worker.joinedAtMs) : '—'}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {worker.removed ? (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleToggle(worker)}
                            aria-label={`Restore access for ${worker.displayName}`}
                            className="min-h-[40px] px-3.5 py-1.5 bg-[#F2C200] hover:bg-[#DFB300] disabled:opacity-60 text-[#1B2023] text-xs font-bold rounded-sm transition-colors cursor-pointer"
                          >
                            {isBusy ? 'Updating...' : 'Restore access'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleToggle(worker)}
                            aria-label={`Remove access for ${worker.displayName}`}
                            className="min-h-[40px] px-3.5 py-1.5 bg-white hover:bg-[#FCE8E8] disabled:opacity-60 text-[#881B1B] border border-[#E5A3A3] text-xs font-semibold rounded-sm transition-colors cursor-pointer"
                          >
                            {isBusy ? 'Updating...' : 'Remove access'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 50 Most Recent Sign-ins */}
      <section aria-labelledby="signins-heading" className="bg-white border border-[#CFD4D8] rounded-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#DCE1E5] flex items-center justify-between gap-4">
          <h2 id="signins-heading" className="font-condensed text-2xl font-bold text-[#1B2023]">
            Recent sign-ins (last 50)
          </h2>
          <span className="text-xs font-medium text-[#646D74] tabular-nums">
            {signInLogs.length} entries
          </span>
        </div>

        {signInLogs.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#646D74]">
            No sign-in records yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F4F6F7] border-b border-[#CFD4D8] text-xs font-semibold text-[#4A5258]">
                  <th className="py-2.5 px-4 whitespace-nowrap">Name</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">Email</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">Role</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">Date and time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E8EB] text-sm">
                {signInLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F9FAFB]">
                    <td className="py-2.5 px-4 font-medium text-[#1B2023] whitespace-nowrap">
                      {log.displayName}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-[#4A5258] whitespace-nowrap">
                      {log.email}
                    </td>
                    <td className="py-2.5 px-4 text-xs font-semibold text-[#4A5258] capitalize whitespace-nowrap">
                      {log.role}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-[#4A5258] tabular-nums whitespace-nowrap">
                      {formatLagosDateTime(log.timestampMs)}
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
