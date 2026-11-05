import assert from 'node:assert';

import { priceBands } from '../lib/rooms/catalog';

console.log('=== RUNNING PRICE BAND TESTS ===\n');

console.log('Test 1: a wide catalogue splits on ₦5,000 lines');
const bands = priceBands({ min: 40000, max: 150000 });
assert.deepStrictEqual(bands, [
  { minPrice: null, maxPrice: 75000 },
  { minPrice: 75000, maxPrice: 115000 },
  { minPrice: 115000, maxPrice: null },
]);

console.log('Test 2: every band keeps at least one room either side');
for (const band of bands) {
  if (band.minPrice !== null) {
    assert.ok(band.minPrice > 40000, 'lower cut stays above the cheapest room');
  }
  if (band.maxPrice !== null) {
    assert.ok(
      band.maxPrice < 150000,
      'upper cut stays below the priciest room',
    );
  }
}

console.log('Test 3: flat, narrow or missing bounds offer no bands');
assert.deepStrictEqual(priceBands(null), []);
assert.deepStrictEqual(priceBands({ min: 60000, max: 60000 }), []);
assert.deepStrictEqual(priceBands({ min: 60000, max: 65000 }), []);

console.log('\n=== PRICE BAND TESTS PASSED ===');
