import { ADMIN_EMAIL, DEFAULT_COMPANY_NAME, DEFAULT_CURRENCY_SYMBOL } from '../config/constants';
import type { PublicConfig, SecurityConfig, SignInLog, SiteRequest, UserProfile } from '../types';

export type PreviewRole = 'admin' | 'worker' | 'codegate' | 'removed' | null;

export function getDevPreviewRole(): PreviewRole {
  if (!import.meta.env.DEV) return null;
  const params = new URLSearchParams(window.location.search);
  const role = params.get('previewRole');
  if (role === 'admin' || role === 'worker' || role === 'codegate' || role === 'removed') {
    return role;
  }
  return null;
}

export function createPreviewSeedState(role: Exclude<PreviewRole, null>): {
  currentUser: UserProfile;
  users: UserProfile[];
  requests: SiteRequest[];
  signInLogs: SignInLog[];
  publicConfig: PublicConfig;
  securityConfig: SecurityConfig;
} {
  const now = Date.now();
  const min = 60 * 1000;

  const adminUser: UserProfile = {
    uid: 'admin_uid_1',
    email: ADMIN_EMAIL,
    displayName: 'Khuzaifa Abubakar',
    role: 'admin',
    active: true,
    removed: false,
    createdAtMs: now - 14 * 24 * 60 * min,
    lastSeenAtMs: now - 30 * 1000,
    joinedAtMs: now - 14 * 24 * 60 * min,
  };

  const worker1: UserProfile = {
    uid: 'worker_uid_1',
    email: 'tunde.adeyemi@example.com',
    displayName: 'Tunde Adeyemi',
    role: 'worker',
    active: true,
    removed: false,
    createdAtMs: now - 10 * 24 * 60 * min,
    lastSeenAtMs: now - 90 * 1000, // Online
    joinedAtMs: now - 10 * 24 * 60 * min,
  };

  const worker2: UserProfile = {
    uid: 'worker_uid_2',
    email: 'chidi.okonkwo@example.com',
    displayName: 'Chidi Okonkwo',
    role: 'worker',
    active: true,
    removed: false,
    createdAtMs: now - 8 * 24 * 60 * min,
    lastSeenAtMs: now - 42 * 60 * min, // Offline
    joinedAtMs: now - 8 * 24 * 60 * min,
  };

  const worker3: UserProfile = {
    uid: 'worker_uid_3',
    email: 'amina.bello@example.com',
    displayName: 'Amina Bello',
    role: 'worker',
    active: false,
    removed: false,
    createdAtMs: now - 2 * 60 * min,
    lastSeenAtMs: now - 2 * 60 * min, // Waiting for code
    joinedAtMs: null,
  };

  const worker4: UserProfile = {
    uid: 'worker_uid_4',
    email: 'emeka.nwosu@example.com',
    displayName: 'Emeka Nwosu',
    role: 'worker',
    active: true,
    removed: true, // Removed
    createdAtMs: now - 20 * 24 * 60 * min,
    lastSeenAtMs: now - 5 * 24 * 60 * min,
    joinedAtMs: now - 20 * 24 * 60 * min,
  };

  const requests: SiteRequest[] = [
    {
      id: 'req_3',
      requestNumberNum: 3,
      requestNumber: 'REQ-0003',
      workerId: worker1.uid,
      workerName: worker1.displayName,
      workerEmail: worker1.email,
      site: 'Lekki Phase 2 — Commercial Annex',
      purpose: 'Ground floor slab reinforcement and formwork bracing',
      notes: 'Deliver before 8:00 AM gate lock.',
      status: 'pending',
      createdAtMs: now - 45 * min,
      updatedAtMs: now - 45 * min,
      items: [
        { id: 'i3a', name: '16mm High-Tensile Rebar', quantity: 3.5, unit: 'tonnes', unitPrice: null },
        { id: 'i3b', name: 'Marine Plywood 18mm', quantity: 24, unit: 'pcs', unitPrice: null },
        { id: 'i3c', name: 'Binding Wire', quantity: 4, unit: 'rolls', unitPrice: null },
      ],
    },
    {
      id: 'req_2',
      requestNumberNum: 2,
      requestNumber: 'REQ-0002',
      workerId: worker2.uid,
      workerName: worker2.displayName,
      workerEmail: worker2.email,
      site: 'Victoria Island — Pier 4 Retaining Wall',
      purpose: 'Waterproof concrete mix and drainage bedding',
      notes: 'Pump truck confirmed for Thursday.',
      status: 'approved',
      createdAtMs: now - 5 * 60 * min,
      updatedAtMs: now - 2 * 60 * min,
      items: [
        { id: 'i2a', name: 'Dangote 3X Cement 50kg', quantity: 80, unit: 'bags', unitPrice: 8500 },
        { id: 'i2b', name: 'Sharp River Sand', quantity: 4, unit: 'trips', unitPrice: 115000 },
      ],
    },
    {
      id: 'req_1',
      requestNumberNum: 1,
      requestNumber: 'REQ-0001',
      workerId: worker1.uid,
      workerName: worker1.displayName,
      workerEmail: worker1.email,
      site: 'Lekki Phase 2 — Commercial Annex',
      purpose: 'Sub-base blinding and perimeter blockwork',
      notes: '',
      status: 'delivered',
      createdAtMs: now - 26 * 60 * min,
      updatedAtMs: now - 18 * 60 * min,
      items: [
        { id: 'i1a', name: 'Dangote 3X Cement 50kg', quantity: 50, unit: 'bags', unitPrice: 8400 },
        { id: 'i1b', name: 'Granite Chippings 19mm', quantity: 2, unit: 'trips', unitPrice: 185000 },
      ],
    },
  ];

  const signInLogs: SignInLog[] = [
    {
      id: 'log_1',
      uid: adminUser.uid,
      email: adminUser.email,
      displayName: adminUser.displayName,
      role: 'admin',
      timestampMs: now - 15 * min,
    },
    {
      id: 'log_2',
      uid: worker1.uid,
      email: worker1.email,
      displayName: worker1.displayName,
      role: 'worker',
      timestampMs: now - 50 * min,
    },
    {
      id: 'log_3',
      uid: worker2.uid,
      email: worker2.email,
      displayName: worker2.displayName,
      role: 'worker',
      timestampMs: now - 310 * min,
    },
  ];

  let currentUser = adminUser;
  if (role === 'worker') currentUser = worker1;
  if (role === 'codegate') currentUser = worker3;
  if (role === 'removed') currentUser = worker4;

  return {
    currentUser,
    users: [adminUser, worker1, worker2, worker3, worker4],
    requests,
    signInLogs,
    publicConfig: {
      companyName: DEFAULT_COMPANY_NAME,
      currencySymbol: DEFAULT_CURRENCY_SYMBOL,
      initialized: true,
      updatedAtMs: now - 14 * 24 * 60 * min,
    },
    securityConfig: {
      accessCode: 'SITE2026',
      updatedAtMs: now - 14 * 24 * 60 * min,
      updatedBy: adminUser.uid,
    },
  };
}
