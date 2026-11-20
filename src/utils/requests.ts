import { BLUEPRINT_LIMITS, UNIT_OPTIONS } from '../config/constants';
import type {
  AggregatedReportRow,
  RequestFilters,
  RequestItem,
  SiteRequest,
  UnitType,
} from '../types';
import { toLagosDateString } from './time';

export function formatRequestNumber(num: number): string {
  const safeNum = Math.max(1, Math.floor(num));
  return `REQ-${String(safeNum).padStart(4, '0')}`;
}

export function generateAccessCode(length: number = 8): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

export function normalizeAccessCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export function validateAccessCode(raw: string): { valid: boolean; normalized: string; error?: string } {
  const normalized = normalizeAccessCode(raw);
  if (normalized.length < BLUEPRINT_LIMITS.accessCodeMin) {
    return {
      valid: false,
      normalized,
      error: `Access code must be at least ${BLUEPRINT_LIMITS.accessCodeMin} characters.`,
    };
  }
  if (normalized.length > BLUEPRINT_LIMITS.accessCodeMax) {
    return {
      valid: false,
      normalized,
      error: `Access code must be ${BLUEPRINT_LIMITS.accessCodeMax} characters or fewer.`,
    };
  }
  if (!BLUEPRINT_LIMITS.accessCodePattern.test(normalized)) {
    return {
      valid: false,
      normalized,
      error: 'Access code may only contain uppercase letters (A-Z) and numbers (0-9).',
    };
  }
  return { valid: true, normalized };
}

export function calculateItemAmount(item: Pick<RequestItem, 'quantity' | 'unitPrice'>): number | null {
  if (item.unitPrice == null || !Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
    return null;
  }
  return Math.round(item.quantity * item.unitPrice * 100) / 100;
}

export function calculateRequestTotal(items: readonly RequestItem[]): {
  hasAnyPrice: boolean;
  total: number;
} {
  let hasAnyPrice = false;
  let total = 0;
  for (const item of items) {
    const amount = calculateItemAmount(item);
    if (amount !== null) {
      hasAnyPrice = true;
      total += amount;
    }
  }
  return {
    hasAnyPrice,
    total: Math.round(total * 100) / 100,
  };
}

export function formatCurrency(amount: number | null | undefined, symbol: string): string {
  if (amount == null || !Number.isFinite(amount)) return '—';
  const hasDecimals = Math.round(amount * 100) % 100 !== 0;
  const formatted = new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${symbol}${formatted}`;
}

export function formatQuantity(qty: number): string {
  if (!Number.isFinite(qty)) return '0';
  return Number.isInteger(qty) ? String(qty) : qty.toFixed(2).replace(/\.?0+$/, '');
}

export function filterRequests(
  requests: readonly SiteRequest[],
  filters: RequestFilters
): SiteRequest[] {
  return requests.filter((req) => {
    if (filters.workerId !== 'all' && req.workerId !== filters.workerId) {
      return false;
    }
    if (filters.status !== 'all' && req.status !== filters.status) {
      return false;
    }
    if (filters.fromDate || filters.toDate) {
      const lagosDate = toLagosDateString(req.createdAtMs);
      if (filters.fromDate && lagosDate < filters.fromDate) {
        return false;
      }
      if (filters.toDate && lagosDate > filters.toDate) {
        return false;
      }
    }
    return true;
  });
}

export function aggregateReportItems(requests: readonly SiteRequest[]): AggregatedReportRow[] {
  const map = new Map<
    string,
    {
      itemName: string;
      unit: UnitType;
      totalQuantity: number;
      requestIds: Set<string>;
      estimatedTotal: number;
      hasAnyPrice: boolean;
    }
  >();

  for (const req of requests) {
    if (req.status === 'rejected') {
      continue;
    }
    for (const item of req.items) {
      const trimmedName = item.name.trim();
      if (!trimmedName) continue;
      const normalizedKey = `${trimmedName.toLowerCase()}__${item.unit}`;
      const existing = map.get(normalizedKey);
      const amount = calculateItemAmount(item);

      if (!existing) {
        map.set(normalizedKey, {
          itemName: trimmedName,
          unit: item.unit,
          totalQuantity: item.quantity,
          requestIds: new Set([req.id]),
          estimatedTotal: amount ?? 0,
          hasAnyPrice: amount !== null,
        });
      } else {
        existing.totalQuantity = Math.round((existing.totalQuantity + item.quantity) * 1000) / 1000;
        existing.requestIds.add(req.id);
        if (amount !== null) {
          existing.estimatedTotal = Math.round((existing.estimatedTotal + amount) * 100) / 100;
          existing.hasAnyPrice = true;
        }
      }
    }
  }

  return Array.from(map.entries())
    .map(([key, entry]) => ({
      key,
      itemName: entry.itemName,
      unit: entry.unit,
      totalQuantity: entry.totalQuantity,
      requestCount: entry.requestIds.size,
      estimatedTotal: entry.hasAnyPrice ? entry.estimatedTotal : null,
      hasAnyPrice: entry.hasAnyPrice,
    }))
    .sort((a, b) => {
      const nameCompare = a.itemName.localeCompare(b.itemName, undefined, { sensitivity: 'base' });
      if (nameCompare !== 0) return nameCompare;
      return a.unit.localeCompare(b.unit);
    });
}

export function validateNewRequestInput(input: {
  site: string;
  purpose: string;
  notes: string;
  items: readonly { name: string; quantity: string | number; unit: UnitType }[];
}): {
  valid: boolean;
  error?: string;
  sanitized?: {
    site: string;
    purpose: string;
    notes: string;
    items: { name: string; quantity: number; unit: UnitType }[];
  };
} {
  const site = input.site.trim();
  const purpose = input.purpose.trim();
  const notes = input.notes.trim();

  if (!site) {
    return { valid: false, error: 'Please enter the site or project name.' };
  }
  if (site.length > BLUEPRINT_LIMITS.siteMax) {
    return { valid: false, error: `Site name must be ${BLUEPRINT_LIMITS.siteMax} characters or fewer.` };
  }
  if (!purpose) {
    return { valid: false, error: "Please describe what the request is for." };
  }
  if (purpose.length > BLUEPRINT_LIMITS.purposeMax) {
    return { valid: false, error: `Purpose must be ${BLUEPRINT_LIMITS.purposeMax} characters or fewer.` };
  }
  if (notes.length > BLUEPRINT_LIMITS.notesMax) {
    return { valid: false, error: `Notes must be ${BLUEPRINT_LIMITS.notesMax} characters or fewer.` };
  }
  if (input.items.length === 0) {
    return { valid: false, error: 'Add at least one material or equipment item.' };
  }
  if (input.items.length > BLUEPRINT_LIMITS.maxItemsPerRequest) {
    return {
      valid: false,
      error: `Maximum ${BLUEPRINT_LIMITS.maxItemsPerRequest} items per request.`,
    };
  }

  const sanitizedItems: { name: string; quantity: number; unit: UnitType }[] = [];
  for (let i = 0; i < input.items.length; i++) {
    const rawItem = input.items[i];
    const name = rawItem.name.trim();
    const qty = typeof rawItem.quantity === 'number' ? rawItem.quantity : Number(rawItem.quantity);
    if (!name) {
      return { valid: false, error: `Item ${i + 1}: enter an item name.` };
    }
    if (name.length > BLUEPRINT_LIMITS.itemNameMax) {
      return {
        valid: false,
        error: `Item ${i + 1}: name must be ${BLUEPRINT_LIMITS.itemNameMax} characters or fewer.`,
      };
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      return { valid: false, error: `Item ${i + 1}: enter a quantity greater than 0.` };
    }
    if (!UNIT_OPTIONS.includes(rawItem.unit)) {
      return { valid: false, error: `Item ${i + 1}: select a valid unit.` };
    }
    sanitizedItems.push({
      name,
      quantity: Math.round(qty * 1000) / 1000,
      unit: rawItem.unit,
    });
  }

  return {
    valid: true,
    sanitized: {
      site,
      purpose,
      notes,
      items: sanitizedItems,
    },
  };
}
