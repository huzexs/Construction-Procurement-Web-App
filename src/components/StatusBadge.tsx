import type { RequestStatus, WorkerState } from '../types';
import { STATUS_LABELS } from '../config/constants';

const REQUEST_STATUS_STYLES: Record<RequestStatus, string> = {
  pending: 'bg-[#FEF6D6] text-[#6B4F00] border-[#E6CA5C]',
  approved: 'bg-[#E3F1FD] text-[#0D4A7C] border-[#96C3E8]',
  delivered: 'bg-[#E2F3E8] text-[#14532D] border-[#8AC9A2]',
  rejected: 'bg-[#FCE8E8] text-[#881B1B] border-[#E5A3A3]',
};

const WORKER_STATE_STYLES: Record<WorkerState, string> = {
  Online: 'bg-[#E2F3E8] text-[#14532D] border-[#8AC9A2]',
  Offline: 'bg-[#EAECEF] text-[#3F474E] border-[#C6CCD1]',
  'Waiting for code': 'bg-[#FEF6D6] text-[#6B4F00] border-[#E6CA5C]',
  Removed: 'bg-[#FCE8E8] text-[#881B1B] border-[#E5A3A3]',
};

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold border rounded-sm whitespace-nowrap ${REQUEST_STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function WorkerStateBadge({ state }: { state: WorkerState }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold border rounded-sm whitespace-nowrap ${WORKER_STATE_STYLES[state]}`}
    >
      {state}
    </span>
  );
}
