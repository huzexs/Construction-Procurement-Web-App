import test from 'node:test';
import assert from 'node:assert/strict';
import { formatLagosDateTime, toLagosDateString, isWorkerOnline, getWorkerState } from './time';
import {
  formatRequestNumber,
  generateAccessCode,
  validateAccessCode,
  calculateItemAmount,
  calculateRequestTotal,
  filterRequests,
  aggregateReportItems,
  validateNewRequestInput,
} from './requests';
import { formatFriendlyFirebaseError } from './errors';
import type { SiteRequest } from '../types';

test('formatRequestNumber formats 4+ digits sequentially', () => {
  assert.equal(formatRequestNumber(1), 'REQ-0001');
  assert.equal(formatRequestNumber(42), 'REQ-0042');
  assert.equal(formatRequestNumber(1005), 'REQ-1005');
});

test('generateAccessCode produces 8-character uppercase alphanumeric codes', () => {
  const code = generateAccessCode(8);
  assert.equal(code.length, 8);
  assert.match(code, /^[A-Z0-9]{8}$/);
});

test('validateAccessCode enforces uppercase and min 4 characters', () => {
  assert.equal(validateAccessCode('ab1').valid, false);
  const ok = validateAccessCode('  site2026 ');
  assert.equal(ok.valid, true);
  assert.equal(ok.normalized, 'SITE2026');
  assert.equal(validateAccessCode('BAD-CODE!').valid, false);
});

test('formatLagosDateTime formats timestamps in Africa/Lagos 12-hour format', () => {
  // 2026-11-16T14:05:00Z -> 15:05 WAT (UTC+1) -> 3:05 PM
  const ms = Date.UTC(2026, 10, 16, 14, 5, 0);
  const formatted = formatLagosDateTime(ms);
  assert.equal(formatted, '16 Nov 2026, 3:05 PM');
  assert.equal(toLagosDateString(ms), '2026-11-16');

  // 2026-11-16T23:30:00Z -> 2026-11-17 12:30 AM WAT
  const midnightWrap = Date.UTC(2026, 10, 16, 23, 30, 0);
  assert.equal(toLagosDateString(midnightWrap), '2026-11-17');
  assert.equal(formatLagosDateTime(midnightWrap), '17 Nov 2026, 12:30 AM');
});

test('getWorkerState derives Online, Offline, Waiting for code, and Removed accurately', () => {
  const now = 1_700_000_000_000;
  assert.equal(getWorkerState({ active: true, removed: true, lastSeenAtMs: now }, now), 'Removed');
  assert.equal(getWorkerState({ active: false, removed: false, lastSeenAtMs: now }, now), 'Waiting for code');
  assert.equal(getWorkerState({ active: true, removed: false, lastSeenAtMs: now - 4 * 60_000 }, now), 'Online');
  assert.equal(getWorkerState({ active: true, removed: false, lastSeenAtMs: now - 6 * 60_000 }, now), 'Offline');
  assert.equal(isWorkerOnline(now - 5 * 60_000, now), true);
  assert.equal(isWorkerOnline(now - 5 * 60_000 - 1, now), false);
});

test('calculateRequestTotal computes item amounts and total only when prices exist', () => {
  const unpriced = calculateRequestTotal([
    { id: '1', name: 'Cement', quantity: 10, unit: 'bags', unitPrice: null },
  ]);
  assert.equal(unpriced.hasAnyPrice, false);
  assert.equal(unpriced.total, 0);

  assert.equal(calculateItemAmount({ quantity: 12, unitPrice: 8500 }), 102000);
  const priced = calculateRequestTotal([
    { id: '1', name: 'Cement', quantity: 10, unit: 'bags', unitPrice: 8500 },
    { id: '2', name: 'Sand', quantity: 2, unit: 'trips', unitPrice: null },
  ]);
  assert.equal(priced.hasAnyPrice, true);
  assert.equal(priced.total, 85000);
});

test('aggregateReportItems sums same item+unit and excludes rejected requests', () => {
  const sample: SiteRequest[] = [
    {
      id: 'r1',
      requestNumberNum: 1,
      requestNumber: 'REQ-0001',
      workerId: 'w1',
      workerName: 'Tunde',
      workerEmail: 'tunde@example.com',
      site: 'Lekki Phase 2',
      purpose: 'Foundation',
      notes: '',
      status: 'approved',
      createdAtMs: Date.UTC(2026, 10, 15, 10, 0),
      updatedAtMs: Date.UTC(2026, 10, 15, 10, 0),
      items: [
        { id: 'i1', name: 'Dangote Cement 50kg', quantity: 40, unit: 'bags', unitPrice: 8000 },
        { id: 'i2', name: '12mm Rebar', quantity: 2, unit: 'tonnes', unitPrice: null },
      ],
    },
    {
      id: 'r2',
      requestNumberNum: 2,
      requestNumber: 'REQ-0002',
      workerId: 'w2',
      workerName: 'Chidi',
      workerEmail: 'chidi@example.com',
      site: 'Victoria Island',
      purpose: 'Columns',
      notes: '',
      status: 'pending',
      createdAtMs: Date.UTC(2026, 10, 16, 10, 0),
      updatedAtMs: Date.UTC(2026, 10, 16, 10, 0),
      items: [
        { id: 'i3', name: 'dangote cement 50kg ', quantity: 25, unit: 'bags', unitPrice: 8200 },
      ],
    },
    {
      id: 'r3',
      requestNumberNum: 3,
      requestNumber: 'REQ-0003',
      workerId: 'w1',
      workerName: 'Tunde',
      workerEmail: 'tunde@example.com',
      site: 'Lekki Phase 2',
      purpose: 'Duplicate',
      notes: '',
      status: 'rejected',
      createdAtMs: Date.UTC(2026, 10, 16, 11, 0),
      updatedAtMs: Date.UTC(2026, 10, 16, 11, 0),
      items: [
        { id: 'i4', name: 'Dangote Cement 50kg', quantity: 100, unit: 'bags', unitPrice: 8000 },
      ],
    },
  ];

  const rows = aggregateReportItems(sample);
  assert.equal(rows.length, 2);
  const cement = rows.find((r) => r.unit === 'bags');
  assert.ok(cement);
  assert.equal(cement.totalQuantity, 65);
  assert.equal(cement.requestCount, 2);
  assert.equal(cement.estimatedTotal, 40 * 8000 + 25 * 8200);

  const filtered = filterRequests(sample, {
    workerId: 'w1',
    status: 'all',
    fromDate: '2026-11-16',
    toDate: '2026-11-16',
  });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 'r3');
});

test('validateNewRequestInput catches missing fields and invalid quantities', () => {
  assert.equal(
    validateNewRequestInput({
      site: '   ',
      purpose: 'Roofing',
      notes: '',
      items: [{ name: 'Nails', quantity: 5, unit: 'kg' }],
    }).valid,
    false
  );
  assert.equal(
    validateNewRequestInput({
      site: 'Block A',
      purpose: 'Roofing',
      notes: '',
      items: [{ name: 'Nails', quantity: 0, unit: 'kg' }],
    }).valid,
    false
  );
  const ok = validateNewRequestInput({
    site: 'Block A',
    purpose: 'Roofing',
    notes: 'Urgent',
    items: [{ name: 'Nails', quantity: '5.5', unit: 'kg' }],
  });
  assert.equal(ok.valid, true);
  assert.equal(ok.sanitized?.items[0].quantity, 5.5);
});

test('formatFriendlyFirebaseError surfaces actionable Netlify domain and Firestore messages', () => {
  const unauth = formatFriendlyFirebaseError(
    new Error('Firebase: Error (auth/unauthorized-domain).'),
    'site-requests.netlify.app'
  );
  assert.match(unauth, /site-requests\.netlify\.app/);
  assert.match(unauth, /Authorized domains/);

  const wrappedFirestore = formatFriendlyFirebaseError(
    new Error(JSON.stringify({ error: 'Missing or insufficient permissions.' }))
  );
  assert.match(wrappedFirestore, /Permission denied by Firestore security rules/);
});
