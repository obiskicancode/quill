import assert from 'node:assert';

import {
  bpsToPercentage,
  minorToNaira,
  nairaToMinor,
  percentageToBps,
  resolveNightlyRate,
  type RateRuleLike,
} from '../lib/rate-resolution';

console.log('=== RUNNING SECTION 2 & 3 INVENTORY & PRICING TESTS ===\n');

// ---------------------------------------------------------------------
// SECTION 2: NAIRA & BASIS POINTS HELPER TESTS
// ---------------------------------------------------------------------

console.log('Test 2.1: nairaToMinor string with commas and decimals');
assert.strictEqual(nairaToMinor('85,000.50'), 8500050);
assert.strictEqual(nairaToMinor('85,000'), 8500000);
assert.strictEqual(nairaToMinor('0'), 0);
assert.strictEqual(nairaToMinor('-100'), 0); // rejects negative
assert.strictEqual(nairaToMinor(75000), 7500000);

console.log('Test 2.2: minorToNaira formatting');
assert.strictEqual(minorToNaira(8500000), '85,000');
assert.strictEqual(minorToNaira(8500050, true), '85,000.50');
assert.strictEqual(minorToNaira(0), '0');
assert.strictEqual(minorToNaira(null), '0');

console.log('Test 2.3: percentageToBps and bpsToPercentage');
assert.strictEqual(percentageToBps(20), 2000); // 20% = 2000 bps
assert.strictEqual(percentageToBps(12.5), 1250); // 12.5% = 1250 bps
assert.strictEqual(percentageToBps(-15), -1500); // -15% = -1500 bps
assert.strictEqual(bpsToPercentage(2000), 20);
assert.strictEqual(bpsToPercentage(1250), 12.5);
assert.strictEqual(bpsToPercentage(-1500), -15);

// ---------------------------------------------------------------------
// SECTION 3: RATE-RULE RESOLUTION TEST CASES
// ---------------------------------------------------------------------

const ROOM_TYPE_A = '11111111-1111-1111-1111-111111111111';
const ROOM_TYPE_B = '22222222-2222-2222-2222-222222222222';
const BASE_PRICE = 50_000_00; // ₦50,000
const WEEKEND_PRICE = 60_000_00; // ₦60,000

// Test 3.1: Weekend on Friday (no active rate rules)
console.log('Test 3.1: Weekend on Friday resolves weekendPriceMinor');
const fridayRes = resolveNightlyRate({
  roomTypeId: ROOM_TYPE_A,
  date: '2026-11-06', // Friday
  basePriceMinor: BASE_PRICE,
  weekendPriceMinor: WEEKEND_PRICE,
  activeRules: [],
});
assert.strictEqual(fridayRes.isWeekend, true);
assert.strictEqual(fridayRes.resolvedRateMinor, WEEKEND_PRICE);
assert.strictEqual(fridayRes.winningRule, null);

// Test 3.2: Peak overlapping weekend (Peak +20% on Friday)
console.log('Test 3.2: Peak season rule (+20%) overlapping weekend Friday');
const peakRule: RateRuleLike = {
  id: 'rule-peak-1',
  roomTypeId: null, // Property-wide
  name: 'December Peak Uplift',
  startDate: '2026-12-01',
  endDate: '2026-12-31',
  minNights: null,
  maxNights: null,
  daysOfWeek: null,
  adjustmentType: 'percent_markup',
  adjustmentValue: 2000, // +20.00%
  priority: 10,
  isActive: true,
};
const peakFridayRes = resolveNightlyRate({
  roomTypeId: ROOM_TYPE_A,
  date: '2026-12-04', // Friday in December
  basePriceMinor: BASE_PRICE,
  weekendPriceMinor: WEEKEND_PRICE, // ₦60,000
  activeRules: [peakRule],
});
// ₦60,000 * 1.20 = ₦72,000
assert.strictEqual(peakFridayRes.isWeekend, true);
assert.strictEqual(peakFridayRes.resolvedRateMinor, 72_000_00);
assert.strictEqual(peakFridayRes.winningRule?.id, 'rule-peak-1');

// Test 3.3: Equal priority (Specific room type beats property-wide)
console.log('Test 3.3: Equal priority tie-breaker: specific room type wins');
const globalRule: RateRuleLike = {
  id: 'rule-global',
  roomTypeId: null,
  name: 'Global Holiday',
  startDate: '2026-12-20',
  endDate: '2026-12-30',
  minNights: null,
  maxNights: null,
  daysOfWeek: null,
  adjustmentType: 'percent_markup',
  adjustmentValue: 1500, // +15%
  priority: 5,
  isActive: true,
};
const specificRule: RateRuleLike = {
  id: 'rule-specific',
  roomTypeId: ROOM_TYPE_A,
  name: 'Suite Exclusive Christmas',
  startDate: '2026-12-20',
  endDate: '2026-12-30',
  minNights: null,
  maxNights: null,
  daysOfWeek: null,
  adjustmentType: 'fixed_price',
  adjustmentValue: 95_000_00,
  priority: 5, // Equal priority!
  isActive: true,
};
const tieRes = resolveNightlyRate({
  roomTypeId: ROOM_TYPE_A,
  date: '2026-12-25',
  basePriceMinor: BASE_PRICE,
  weekendPriceMinor: null,
  activeRules: [globalRule, specificRule],
});
assert.strictEqual(tieRes.winningRule?.id, 'rule-specific');
assert.strictEqual(tieRes.resolvedRateMinor, 95_000_00);

// Test 3.4: Minimum-nights condition not met
console.log(
  'Test 3.4: Minimum-nights condition not met (requires 3 nights, stay is 2)',
);
const minNightsRule: RateRuleLike = {
  id: 'rule-min-stay',
  roomTypeId: null,
  name: 'Long Stay 10% Discount',
  startDate: '2026-11-01',
  endDate: '2026-11-30',
  minNights: 3,
  maxNights: null,
  daysOfWeek: null,
  adjustmentType: 'percent_markup',
  adjustmentValue: -1000, // -10.00%
  priority: 20,
  isActive: true,
};
const shortStayRes = resolveNightlyRate({
  roomTypeId: ROOM_TYPE_A,
  date: '2026-11-10', // Tuesday
  basePriceMinor: BASE_PRICE, // ₦50,000
  weekendPriceMinor: null,
  stayNights: 2, // Only 2 nights!
  activeRules: [minNightsRule],
});
assert.strictEqual(shortStayRes.winningRule, null);
assert.strictEqual(shortStayRes.resolvedRateMinor, BASE_PRICE);

// Test 3.5: All room types vs specific type (Room B does not match specific rule)
console.log('Test 3.5: Specific rule applies only to Room A, not Room B');
const roomBRes = resolveNightlyRate({
  roomTypeId: ROOM_TYPE_B,
  date: '2026-12-25',
  basePriceMinor: 40_000_00,
  weekendPriceMinor: null,
  activeRules: [globalRule, specificRule],
});
// Room B matches globalRule (+15%), not specificRule
assert.strictEqual(roomBRes.winningRule?.id, 'rule-global');
assert.strictEqual(roomBRes.resolvedRateMinor, 46_000_00); // 40,000 * 1.15

// Test 3.6: Stay crossing rule end (Date inside vs Date outside)
console.log('Test 3.6: Stay crossing rule end date');
const promoRule: RateRuleLike = {
  id: 'rule-black-friday',
  roomTypeId: null,
  name: 'Black Friday Weekend',
  startDate: '2026-11-27',
  endDate: '2026-11-29', // Ends Nov 29
  minNights: null,
  maxNights: null,
  daysOfWeek: null,
  adjustmentType: 'percent_markup',
  adjustmentValue: -2500, // -25.00%
  priority: 15,
  isActive: true,
};
const insideDateRes = resolveNightlyRate({
  roomTypeId: ROOM_TYPE_A,
  date: '2026-11-28', // Saturday (weekend base 60,000 - 25% = 45,000)
  basePriceMinor: BASE_PRICE,
  weekendPriceMinor: WEEKEND_PRICE,
  activeRules: [promoRule],
});
assert.strictEqual(insideDateRes.winningRule?.id, 'rule-black-friday');
assert.strictEqual(insideDateRes.resolvedRateMinor, 45_000_00);

const outsideDateRes = resolveNightlyRate({
  roomTypeId: ROOM_TYPE_A,
  date: '2026-11-30', // Monday (rule ended)
  basePriceMinor: BASE_PRICE,
  weekendPriceMinor: WEEKEND_PRICE,
  activeRules: [promoRule],
});
assert.strictEqual(outsideDateRes.winningRule, null);
assert.strictEqual(outsideDateRes.resolvedRateMinor, BASE_PRICE);

console.log('\nAll Section 2 & 3 rate-resolution tests PASSED successfully!\n');
