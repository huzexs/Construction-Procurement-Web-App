import type { RequestStatus, UnitType } from '../types';

export const ADMIN_EMAIL = 'abubakarkhuzaifa001@gmail.com';

export const UNIT_OPTIONS: readonly UnitType[] = [
  'pcs',
  'bags',
  'kg',
  'tonnes',
  'm',
  'm²',
  'm³',
  'litres',
  'rolls',
  'packs',
  'trips',
  'sets',
] as const;

export const STATUS_OPTIONS: readonly RequestStatus[] = [
  'pending',
  'approved',
  'delivered',
  'rejected',
] as const;

export const STATUS_LABELS: Record<RequestStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  delivered: 'Delivered',
  rejected: 'Rejected',
};

export const HEARTBEAT_INTERVAL_MS = 2 * 60 * 1000;
export const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

export const DEFAULT_COMPANY_NAME = 'SiteWorks Construction Ltd.';
export const DEFAULT_CURRENCY_SYMBOL = '₦';

export const BLUEPRINT_LIMITS = {
  accessCodeMin: 4,
  accessCodeMax: 24,
  accessCodePattern: /^[A-Z0-9]+$/,
  companyNameMax: 120,
  currencySymbolMax: 8,
  siteMax: 160,
  purposeMax: 240,
  notesMax: 1000,
  itemNameMax: 160,
  maxItemsPerRequest: 50,
  displayNameMax: 120,
} as const;
