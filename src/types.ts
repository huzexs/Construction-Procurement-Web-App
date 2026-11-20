export type UserRole = 'admin' | 'worker';

export type RequestStatus = 'pending' | 'approved' | 'delivered' | 'rejected';

export type UnitType =
  | 'pcs'
  | 'bags'
  | 'kg'
  | 'tonnes'
  | 'm'
  | 'm²'
  | 'm³'
  | 'litres'
  | 'rolls'
  | 'packs'
  | 'trips'
  | 'sets';

export type WorkerState = 'Online' | 'Offline' | 'Waiting for code' | 'Removed';

export interface RequestItem {
  id: string;
  name: string;
  quantity: number;
  unit: UnitType;
  unitPrice?: number | null;
}

export interface SiteRequest {
  id: string;
  requestNumberNum: number;
  requestNumber: string;
  workerId: string;
  workerName: string;
  workerEmail: string;
  site: string;
  purpose: string;
  notes: string;
  items: RequestItem[];
  status: RequestStatus;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  active: boolean;
  removed: boolean;
  createdAtMs: number;
  lastSeenAtMs: number;
  joinedAtMs: number | null;
}

export interface SignInLog {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  timestampMs: number;
}

export interface PublicConfig {
  companyName: string;
  currencySymbol: string;
  initialized: boolean;
  updatedAtMs: number;
}

export interface SecurityConfig {
  accessCode: string;
  updatedAtMs: number;
  updatedBy: string;
}

export interface RequestFilters {
  workerId: string;
  status: 'all' | RequestStatus;
  fromDate: string;
  toDate: string;
}

export interface AggregatedReportRow {
  key: string;
  itemName: string;
  unit: UnitType;
  totalQuantity: number;
  requestCount: number;
  estimatedTotal: number | null;
  hasAnyPrice: boolean;
}
