import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  addDays,
  addMonths,
  daysInMonth,
  formatDayMonth,
  formatGuestStamp,
  fromISO,
  hotelClock,
  nightsBetween,
  shiftMonth,
  startOfMonth,
  sundayIndex,
  toISO,
} from '../lib/dates';
import {
  formatHotelDate,
  formatHotelDateTime,
  formatHotelTime,
  formatHotelTimeWithSeconds,
  HOTEL_TIME_ZONE,
} from '../lib/format';

describe('Hotel calendar arithmetic', () => {
  it('1. ISO strings round-trip through Date without a day slip', () => {
    for (const iso of [
      '2026-01-01',
      '2026-02-28',
      '2026-11-05',
      '2026-12-31',
      '2028-02-29',
    ]) {
      assert.equal(toISO(fromISO(iso)), iso);
    }
  });

  it('2. Day arithmetic crosses month and year ends', () => {
    assert.equal(addDays('2026-01-31', 1), '2026-02-01');
    assert.equal(addDays('2026-12-31', 1), '2027-01-01');
    assert.equal(addDays('2026-03-01', -1), '2026-02-28');
    assert.equal(addDays('2028-02-28', 1), '2028-02-29');
  });

  it('3. Night counts survive a DST-shaped day', () => {
    assert.equal(nightsBetween('2026-12-20', '2026-12-23'), 3);
    assert.equal(nightsBetween('2026-11-05', '2026-11-05'), 0);
    assert.equal(nightsBetween('2026-11-06', '2026-11-05'), -1);
    // Europe shifts a wall clock on 29 Mar 2026; a stay over that date is
    // still one night even though the elapsed time is 23 hours.
    assert.equal(nightsBetween('2026-03-28', '2026-03-29'), 1);
  });

  it('4. Month shifts clamp to the target month length', () => {
    assert.equal(daysInMonth('2026-02-01'), 28);
    assert.equal(daysInMonth('2028-02-01'), 29);
    assert.equal(startOfMonth('2026-11-27'), '2026-11-01');
    assert.equal(addMonths('2026-11-27', 1), '2026-12-01');
    assert.equal(addMonths('2026-11-27', -11), '2025-12-01');
    assert.equal(shiftMonth('2026-01-31', 1), '2026-02-28');
    assert.equal(shiftMonth('2028-01-30', 1), '2028-02-29');
    assert.equal(shiftMonth('2026-05-31', 1), '2026-06-30');
    assert.equal(shiftMonth('2026-11-15', 2), '2027-01-15');
  });

  it('5. Week anchors use Sunday so the grid lines up', () => {
    assert.equal(sundayIndex('2026-11-01'), 0);
    assert.equal(sundayIndex('2026-11-07'), 6);
    assert.equal(sundayIndex('2026-11-05'), 4);
  });

  it('6. Guest-facing dates are built from the ISO day itself', () => {
    assert.match(formatDayMonth('2026-11-05'), /^5 Nov$/);
    assert.match(formatGuestStamp('2026-11-05T10:30:00Z'), /5 Nov/);
  });
});

describe('Hotel clock', () => {
  it('1. Ops stamps are read in the hotel day, not the viewer zone', () => {
    // 23:50 UTC is already the next morning in Lagos — the exact case that
    // made a late booking look like an early one on a UTC laptop.
    const instant = new Date('2026-11-12T23:50:00Z');
    assert.equal(HOTEL_TIME_ZONE, 'Africa/Lagos');
    assert.equal(formatHotelDate(instant, HOTEL_TIME_ZONE), '13 Nov 2026');
    assert.equal(formatHotelTime(instant, HOTEL_TIME_ZONE), '00:50');
    assert.notEqual(
      formatHotelDate(instant, 'UTC'),
      formatHotelDate(instant, HOTEL_TIME_ZONE),
    );
    assert.match(
      formatHotelDateTime(instant, HOTEL_TIME_ZONE),
      /^13 Nov 2026, 00:50$/,
    );
  });

  it('2. Times never carry seconds except where webhooks need them', () => {
    const instant = new Date('2026-11-12T23:50:07Z');
    assert.doesNotMatch(formatHotelTime(instant), /:07$/);
    assert.equal(formatHotelTimeWithSeconds(instant), '00:50:07');
  });

  it('3. hotelClock returns the hotel day and minutes-into-that-day', () => {
    const beforeMidnight = hotelClock(new Date('2026-11-12T22:30:00Z'));
    assert.deepEqual(beforeMidnight, { today: '2026-11-12', minutes: 1_410 });

    const justAfterMidnight = hotelClock(new Date('2026-11-12T23:05:00Z'));
    assert.deepEqual(
      justAfterMidnight,
      { today: '2026-11-13', minutes: 5 },
      'the day rolls over with the hotel, and the hour stays in 0..23',
    );

    assert.deepEqual(hotelClock(new Date('2026-11-12T23:00:00Z'), 'UTC'), {
      today: '2026-11-12',
      minutes: 1_380,
    });
  });
});
