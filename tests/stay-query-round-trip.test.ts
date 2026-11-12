import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  parseRoomQuery,
  serializeRoomQuery,
  stayHref,
  stayProblem,
} from '../lib/rooms/query';

const params = (search: string) =>
  new URLSearchParams(search.replace(/^\?/, ''));

describe('Stay query round-trip', () => {
  it('1. Re-committing the same stay produces the same URL', () => {
    const samples = [
      '',
      'checkIn=2026-12-20&checkOut=2026-12-23&adults=3&children=1',
      'adults=4&sort=price_asc',
      'beds=king,twin&amenities=wifi,pool&minPrice=40000&maxPrice=250000',
      'checkIn=2026-12-20&checkOut=2026-12-23&count=2',
    ];
    for (const search of samples) {
      const once = parseRoomQuery(params(search));
      const twice = parseRoomQuery(params(serializeRoomQuery(once)));
      assert.deepEqual(
        twice,
        once,
        `round trip changed ${search || '(empty)'}`,
      );
      assert.equal(
        serializeRoomQuery(twice),
        serializeRoomQuery(once),
        'second serialise moved',
      );
    }
  });

  it('2. Defaults stay out of the URL until the stay itself is in it', () => {
    const bare = serializeRoomQuery(
      parseRoomQuery(params('adults=2&children=0')),
    );
    assert.equal(bare, '', 'a default search is an empty query string');

    // Once a date is shared, the guest count travels with it even at its
    // default; otherwise the link depends on the code defaults staying put.
    const dated = serializeRoomQuery(
      parseRoomQuery(
        params('checkIn=2026-12-20&checkOut=2026-12-21&children=0'),
      ),
    );
    assert.match(dated, /adults=2/);
    assert.match(dated, /children=0/);
    assert.ok(!dated.includes('sort'), dated);
    assert.ok(!dated.includes('count'), dated);
  });

  it('3. Junk in the URL is dropped, not half-applied', () => {
    const query = parseRoomQuery(
      params(
        'checkIn=2026-13-45&checkOut=next-tuesday&adults=99&beds=king,bunk&amenities=wifi,unicorn',
      ),
    );
    assert.equal(query.checkIn, null);
    assert.equal(query.checkOut, null);
    assert.equal(query.adults, 2);
    assert.deepEqual(query.filters.beds, ['king']);
    assert.deepEqual(query.filters.amenities, ['wifi']);
    assert.deepEqual(query.sort, 'recommended', 'an unknown sort falls back');
  });

  it('4. A one-sided stay is reported, not silently priced', () => {
    const today = '2026-11-05';
    const half = parseRoomQuery(params('checkIn=2026-12-20'));
    assert.equal(
      stayProblem(half, today),
      'Choose a check-out date to see prices for your stay.',
    );
    const backwards = parseRoomQuery(
      params('checkIn=2026-12-20&checkOut=2026-12-18'),
    );
    assert.match(stayProblem(backwards, today) ?? '', /after/i);
    const past = parseRoomQuery(
      params('checkIn=2026-01-02&checkOut=2026-01-04'),
    );
    assert.match(stayProblem(past, today) ?? '', /past|later/i);
    const none = parseRoomQuery(params(''));
    assert.equal(stayProblem(none, today), null);
  });

  it('5. Carry-over links only move a complete stay', () => {
    const withStay = parseRoomQuery(
      params('checkIn=2026-12-20&checkOut=2026-12-23&adults=3&children=1'),
    );
    const href = stayHref('/rooms/skyline-suite', withStay);
    assert.match(href, /checkIn=2026-12-20/);
    assert.match(href, /checkOut=2026-12-23/);
    assert.match(href, /adults=3/);
    assert.match(href, /children=1/);

    const partial = parseRoomQuery(params('checkIn=2026-12-20&adults=2'));
    const partialHref = stayHref('/rooms/skyline-suite', partial);
    assert.doesNotMatch(partialHref, /checkIn/, 'a half stay must not carry');
    assert.match(partialHref, /adults=2/);
  });
});
