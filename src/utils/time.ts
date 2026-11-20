import { ONLINE_THRESHOLD_MS } from '../config/constants';
import type { UserProfile, WorkerState } from '../types';

const LAGOS_TZ = 'Africa/Lagos';

const lagosDateTimePartsFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: LAGOS_TZ,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

const lagosDatePartsFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: LAGOS_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function formatLagosDateTime(timestampMs: number | null | undefined): string {
  if (timestampMs == null || !Number.isFinite(timestampMs) || timestampMs <= 0) {
    return '—';
  }
  const parts = lagosDateTimePartsFormatter.formatToParts(new Date(timestampMs));
  const lookup = new Map(parts.map((p) => [p.type, p.value]));
  const day = lookup.get('day') ?? '';
  const month = lookup.get('month') ?? '';
  const year = lookup.get('year') ?? '';
  const hour = lookup.get('hour') ?? '';
  const minute = lookup.get('minute') ?? '';
  const dayPeriod = (lookup.get('dayPeriod') ?? '').toUpperCase();
  return `${day} ${month} ${year}, ${hour}:${minute} ${dayPeriod}`.trim();
}

export function toLagosDateString(timestampMs: number): string {
  const parts = lagosDatePartsFormatter.formatToParts(new Date(timestampMs));
  const lookup = new Map(parts.map((p) => [p.type, p.value]));
  const year = lookup.get('year') ?? '1970';
  const month = lookup.get('month') ?? '01';
  const day = lookup.get('day') ?? '01';
  return `${year}-${month}-${day}`;
}

export function isWorkerOnline(lastSeenAtMs: number, nowMs: number = Date.now()): boolean {
  if (!Number.isFinite(lastSeenAtMs) || lastSeenAtMs <= 0) return false;
  return nowMs - lastSeenAtMs <= ONLINE_THRESHOLD_MS;
}

export function getWorkerState(
  user: Pick<UserProfile, 'active' | 'removed' | 'lastSeenAtMs'>,
  nowMs: number = Date.now()
): WorkerState {
  if (user.removed) return 'Removed';
  if (!user.active) return 'Waiting for code';
  return isWorkerOnline(user.lastSeenAtMs, nowMs) ? 'Online' : 'Offline';
}
