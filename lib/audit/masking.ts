import crypto from 'node:crypto';

import { formatHotelDateTime, formatMinorExact } from '@/lib/format';
import type { AuditDiffField } from '@/types/audit.types';

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /recovery_?codes?/i,
  /auth_?cookie/i,
  /mfa_?secret/i,
  /cookie/i,
  /cvv/i,
  /cvc/i,
  /pin/i,
];

const BANK_ACCOUNT_PATTERNS = [/account_?num/i, /bank_?account/i];
const CARD_NUMBER_PATTERNS = [/card_?num/i, /pan/i, /last4/i];

function hashString(val: string): string {
  return crypto.createHash('sha256').update(val).digest('hex').slice(0, 16);
}

/**
 * Recursively masks sensitive fields in audit payloads and database changes.
 * Never leaks passwords, secrets, tokens, card data or bank accounts.
 */
export function maskAuditData(val: unknown): unknown {
  if (val === null || val === undefined) return val;

  if (typeof val === 'string') {
    if (val.length > 500) {
      return `[LONG_PAYLOAD (length: ${val.length}, sha256: ${hashString(val)})]`;
    }
    return val;
  }

  if (Array.isArray(val)) {
    return val.map((item) => maskAuditData(item));
  }

  if (typeof val === 'object') {
    const record = val as Record<string, unknown>;
    const sanitized: Record<string, unknown> = {};

    for (const [key, rawValue] of Object.entries(record)) {
      if (SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key))) {
        sanitized[key] = '[REDACTED_SECRET]';
        continue;
      }

      if (BANK_ACCOUNT_PATTERNS.some((pattern) => pattern.test(key))) {
        if (typeof rawValue === 'string' && rawValue.length >= 4) {
          const last4 = rawValue.slice(-4);
          sanitized[key] = `******${last4}`;
        } else {
          sanitized[key] = '******';
        }
        continue;
      }

      if (CARD_NUMBER_PATTERNS.some((pattern) => pattern.test(key))) {
        if (typeof rawValue === 'string' && rawValue.length >= 4) {
          const last4 = rawValue.slice(-4);
          sanitized[key] = `**** **** **** ${last4}`;
        } else {
          sanitized[key] = '****';
        }
        continue;
      }

      sanitized[key] = maskAuditData(rawValue);
    }
    return sanitized;
  }

  return val;
}

function formatValueForDisplay(key: string, val: unknown): string {
  if (val === null || val === undefined) return '(none)';

  if (typeof val === 'boolean') {
    return val ? 'Yes' : 'No';
  }

  if (typeof val === 'number') {
    if (key.endsWith('Minor') || key.endsWith('_minor')) {
      return formatMinorExact(val);
    }
    return val.toLocaleString();
  }

  if (typeof val === 'string') {
    // If it looks like an ISO date
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
      try {
        const d = new Date(val);
        return formatHotelDateTime(d);
      } catch {
        return val;
      }
    }
    return val;
  }

  if (typeof val === 'object') {
    return JSON.stringify(val);
  }

  return String(val);
}

function humanizeFieldName(field: string): string {
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}

/**
 * Computes human-readable before and after diffs for audit drawers.
 * Automatically masks sensitive data and formats money and dates.
 */
export function generateAuditDiff(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
): AuditDiffField[] {
  const maskedBefore = (maskAuditData(before) as Record<string, unknown>) || {};
  const maskedAfter = (maskAuditData(after) as Record<string, unknown>) || {};

  const allKeys = Array.from(
    new Set([...Object.keys(maskedBefore), ...Object.keys(maskedAfter)]),
  );
  const diffs: AuditDiffField[] = [];

  for (const key of allKeys) {
    if (['updatedAt', 'updated_at', 'version'].includes(key)) continue;

    const bVal = maskedBefore[key];
    const aVal = maskedAfter[key];

    if (JSON.stringify(bVal) !== JSON.stringify(aVal)) {
      diffs.push({
        field: key,
        label: humanizeFieldName(key),
        before: formatValueForDisplay(key, bVal),
        after: formatValueForDisplay(key, aVal),
      });
    }
  }

  return diffs;
}
