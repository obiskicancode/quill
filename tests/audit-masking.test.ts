import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { generateAuditDiff, maskAuditData } from '../lib/audit/masking';

describe('Audit Masking & Diff Helper', () => {
  it('1. Masks password hashes', () => {
    const input = {
      passwordHash: '$2a$12$e80yvY6B7d3dF.v1/8jG1uO6k.9zE1gH7cT.4qA',
      password_hash: 'legacy-hash-value',
      user: 'alice@example.com',
    };
    const masked = maskAuditData(input) as Record<string, unknown>;
    assert.strictEqual(masked.passwordHash, '[REDACTED_SECRET]');
    assert.strictEqual(masked.password_hash, '[REDACTED_SECRET]');
    assert.strictEqual(masked.user, 'alice@example.com');
  });

  it('2. Masks 2FA secrets and recovery codes', () => {
    const input = {
      mfaSecretEncrypted: 'enc:k3j8s9d8fk3j4h5g2',
      totpSecret: 'JBSWY3DPEHPK3PXP',
      recoveryCodes: ['code-1111', 'code-2222', 'code-3333'],
    };
    const masked = maskAuditData(input) as Record<string, unknown>;
    assert.strictEqual(masked.mfaSecretEncrypted, '[REDACTED_SECRET]');
    assert.strictEqual(masked.totpSecret, '[REDACTED_SECRET]');
    assert.strictEqual(masked.recoveryCodes, '[REDACTED_SECRET]');
  });

  it('3. Masks bank account numbers preserving last 4 digits', () => {
    const input = {
      bankName: 'Access Bank',
      accountNumber: '0123456789',
      bank_account_num: '9876543210',
    };
    const masked = maskAuditData(input) as Record<string, unknown>;
    assert.strictEqual(masked.bankName, 'Access Bank');
    assert.strictEqual(masked.accountNumber, '******6789');
    assert.strictEqual(masked.bank_account_num, '******3210');
  });

  it('4. Recursively masks nested objects and arrays', () => {
    const input = {
      action: 'staff_update',
      metadata: {
        sessionTokenHash: 'hash-abc',
        card: {
          cardNumber: '4111222233334444',
          cvv: '123',
        },
        settings: {
          apiKeySecret: 'secret_live_99999',
        },
      },
    };
    const masked = maskAuditData(input) as Record<string, unknown>;
    const metadata = masked.metadata as Record<string, unknown>;
    const card = metadata.card as Record<string, unknown>;
    const settings = metadata.settings as Record<string, unknown>;

    assert.strictEqual(metadata.sessionTokenHash, '[REDACTED_SECRET]');
    assert.strictEqual(card.cardNumber, '**** **** **** 4444');
    assert.strictEqual(card.cvv, '[REDACTED_SECRET]');
    assert.strictEqual(settings.apiKeySecret, '[REDACTED_SECRET]');
  });

  it('5. Truncates very long text bodies with length and sha256 hash', () => {
    const veryLongString = 'X'.repeat(1200);
    const input = {
      responseBody: veryLongString,
    };
    const masked = maskAuditData(input) as Record<string, unknown>;
    assert.match(
      String(masked.responseBody),
      /^\[LONG_PAYLOAD \(length: 1200, sha256: [0-9a-f]{16}\)\]$/,
    );
  });

  it('6. Generates formatted before/after diffs formatting money and dates', () => {
    const before = {
      basePriceMinor: 5000000,
      status: 'pending',
      accountNumber: '1122334455',
      updatedAt: '2026-10-01T00:00:00Z',
    };
    const after = {
      basePriceMinor: 7500000,
      status: 'confirmed',
      accountNumber: '1122339999',
      updatedAt: '2026-10-02T00:00:00Z',
    };

    const diffs = generateAuditDiff(before, after);

    // basePriceMinor diff
    const priceDiff = diffs.find((d) => d.field === 'basePriceMinor');
    assert.ok(priceDiff);
    assert.strictEqual(priceDiff.before, '₦50,000.00');
    assert.strictEqual(priceDiff.after, '₦75,000.00');

    // status diff
    const statusDiff = diffs.find((d) => d.field === 'status');
    assert.ok(statusDiff);
    assert.strictEqual(statusDiff.before, 'pending');
    assert.strictEqual(statusDiff.after, 'confirmed');

    // accountNumber diff (masked)
    const accDiff = diffs.find((d) => d.field === 'accountNumber');
    assert.ok(accDiff);
    assert.strictEqual(accDiff.before, '******4455');
    assert.strictEqual(accDiff.after, '******9999');

    // updatedAt should be ignored
    assert.strictEqual(
      diffs.some((d) => d.field === 'updatedAt'),
      false,
    );
  });
});
