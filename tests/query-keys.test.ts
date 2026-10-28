import assert from 'node:assert';

import { queryKeys } from '../hooks/services/query-keys';

const stay = {
  checkIn: '2026-11-01',
  checkOut: '2026-11-03',
  adults: 2,
  children: 0,
};

assert.deepStrictEqual(queryKeys.guest.availability(stay, ['b', 'a']), [
  'guest',
  'availability',
  '2026-11-01',
  '2026-11-03',
  2,
  0,
  ['a', 'b'],
]);

assert.deepStrictEqual(queryKeys.admin.reservations.detail('res_123'), [
  'admin',
  'reservations',
  'detail',
  'res_123',
]);

assert.deepStrictEqual(
  queryKeys.guest.checkout.quote({
    ...stay,
    room: 'garden-suite',
    extraBed: false,
    extras: [
      { id: 'breakfast', quantity: 2 },
      { id: 'airport', quantity: 1 },
    ],
  }),
  [
    'guest',
    'checkout',
    'quote',
    'garden-suite',
    '2026-11-01',
    '2026-11-03',
    2,
    0,
    false,
    [
      ['airport', 1],
      ['breakfast', 2],
    ],
  ],
);

assert.notDeepStrictEqual(
  queryKeys.admin.payments.list('page=1'),
  queryKeys.admin.payments.list('page=2'),
);

console.log('Query key tests passed.');
