import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  formatCountdown,
  formatDeadline,
  formatGuestTime,
  formatMinor,
  formatMinorDigits,
  formatMinorExact,
  formatNaira,
  formatNairaDigits,
  formatSecondary,
  pluralCount,
  unitLabels,
} from '../lib/format';

describe('Money display', () => {
  it('1. Divides minor units by 100 once and only once', () => {
    assert.equal(formatMinor(100), '₦1');
    assert.equal(formatMinor(1), '₦0');
    assert.equal(formatMinor(150_000), '₦1,500');
    assert.equal(formatMinorExact(150_050), '₦1,500.50');
    assert.equal(formatMinorExact(100), '₦1.00');
  });

  it('2. The rounded column and the exact column describe the same money', () => {
    // A line item of 1,234.56 reads as ₦1,235 in a dense table and as
    // ₦1,234.56 on the receipt; they must never differ by a whole naira.
    assert.equal(formatMinor(123_456), '₦1,235');
    assert.equal(formatMinorExact(123_456), '₦1,234.56');
    assert.ok(
      Math.abs(
        Number(formatMinor(123_456).replace(/[^\d.]/g, '')) -
          Number(formatMinorExact(123_456).replace(/[^\d.]/g, '')),
      ) < 1,
    );
  });

  it('3. Digit-only variants match the symbolled ones exactly', () => {
    for (const minor of [0, 99, 123_456, 4_500_000]) {
      assert.equal(
        formatMinorDigits(minor, true),
        formatMinorExact(minor).replace('₦', ''),
      );
      assert.equal(
        formatMinorDigits(minor),
        formatMinor(minor).replace('₦', ''),
      );
    }
    assert.ok(!formatNairaDigits(1_200).includes('₦'));
    assert.ok(formatNaira(1_200).includes('₦'));
  });

  it('4. Refunds and zero keep a sign a scanner can read', () => {
    assert.equal(formatMinor(0), '₦0');
    assert.equal(formatMinorExact(0), '₦0.00');
    assert.equal(formatMinor(-150_000), '-₦1,500');
    assert.equal(formatMinorExact(-150_000), '-₦1,500.00');
  });

  it('5. Secondary currencies are labelled, never assumed to be naira', () => {
    assert.equal(formatSecondary('USD', 250), '$250');
    assert.equal(formatSecondary('EUR', 250), '€250');
    assert.equal(formatSecondary('GBP', 250), '£250');
  });

  it('6. Stored clock values read the way guests expect', () => {
    assert.equal(formatGuestTime('14:00'), '2 pm');
    assert.equal(formatGuestTime('14:00:00'), '2 pm');
    assert.equal(formatGuestTime('14:30'), '2:30 pm');
    assert.equal(formatGuestTime('00:30'), '12:30 am');
    assert.equal(formatGuestTime('23:45'), '11:45 pm');
    assert.equal(formatGuestTime('12:00'), '12 pm');
    // Anything unparseable is shown as stored rather than turned into "NaN pm".
    assert.equal(formatGuestTime('2pm'), '2pm');
    assert.equal(formatGuestTime('14'), '2 pm');
  });

  it('7. Countdown, deadline, counts and unit labels', () => {
    assert.equal(formatCountdown(95_000), '01:35');
    assert.equal(formatCountdown(0), '00:00');
    assert.equal(formatCountdown(-10_000), '00:00', 'never a negative hold');
    assert.equal(
      formatDeadline({ date: '2026-12-20', time: '14:00' }),
      '20 Dec, 2:00 PM',
    );
    assert.equal(pluralCount(1, 'night'), '1 night');
    assert.equal(pluralCount(3, 'night'), '3 nights');
    assert.equal(pluralCount(2, 'child', 'children'), '2 children');
    assert.deepEqual(Object.keys(unitLabels), [
      'per_stay',
      'per_night',
      'per_guest',
      'per_guest_per_night',
    ]);
  });
});
