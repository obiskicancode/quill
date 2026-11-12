import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { reservationsListQuerySchema } from '../schemas/reservation.schema';

const filter = reservationsListQuerySchema.shape.filter;

describe('Admin quick-filter enum', () => {
  it('1. Accepts only the four built quick filters', () => {
    for (const value of [
      'arriving_today',
      'departing_today',
      'in_house',
      'needs_attention',
    ]) {
      const parsed = filter.safeParse(value);
      assert.equal(parsed.success, true, `${value} should parse`);
    }
  });

  it('2. Rejects anything else so the bad value never reaches the API', () => {
    for (const value of [
      'arriving',
      'ARRIVING_TODAY',
      'all',
      'check_in',
      '; drop table',
      'needs attention',
    ]) {
      assert.equal(filter.safeParse(value).success, false, `${value} leaked`);
    }
  });

  it('3. An absent filter is valid and means the whole register', () => {
    const parsed = filter.safeParse(undefined);
    assert.equal(parsed.success, true);
    assert.equal(
      reservationsListQuerySchema.parse({}).filter,
      undefined,
      'no filter inferred',
    );
  });

  it('4. Defaults and coercion keep a bare URL sortable', () => {
    const parsed = reservationsListQuerySchema.parse({});
    assert.equal(parsed.sort, 'check_in');
    assert.equal(parsed.order, 'asc');
    assert.equal(parsed.page, 1);
    assert.equal(parsed.pageSize, 25);

    // The picker only offers 25/50/100, so an out-of-range size can only come
    // from a hand-edited URL; the API rejects it rather than honouring it.
    const fromUrl = reservationsListQuerySchema.parse({
      page: '3',
      sort: 'guest_name',
      order: 'desc',
    });
    assert.equal(fromUrl.page, 3, 'page is coerced from the string');
    assert.equal(fromUrl.sort, 'guest_name');
    assert.equal(fromUrl.order, 'desc');

    for (const pageSize of ['500', '7', '0', '25.5', 'all']) {
      assert.equal(
        reservationsListQuerySchema.safeParse({ pageSize }).success,
        false,
        `pageSize ${pageSize} leaked through`,
      );
    }
    assert.equal(
      reservationsListQuerySchema.parse({ pageSize: '100' }).pageSize,
      100,
    );
  });

  it('5. A malformed date or enum fails the parse instead of passing through', () => {
    assert.equal(
      reservationsListQuerySchema.safeParse({ from: 'yesterday' }).success,
      false,
    );
    assert.equal(
      reservationsListQuerySchema.safeParse({ sort: 'total_minor DESC' })
        .success,
      false,
    );
    assert.equal(
      reservationsListQuerySchema.safeParse({
        from: '2026-12-01',
        to: '2026-12-31',
        source: 'walk_in',
        paymentState: 'deposit_paid',
      }).success,
      true,
    );
  });
});
