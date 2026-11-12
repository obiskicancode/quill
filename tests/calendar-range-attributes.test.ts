import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { dayRangeData } from '../components/ui/calendar';

describe('Range calendar day attributes', () => {
  it('1. An ordinary day carries no selection attribute', () => {
    assert.deepEqual(dayRangeData({}), {
      'data-selected-single': false,
      'data-range-start': false,
      'data-range-end': false,
      'data-range-middle': false,
    });
  });

  it('2. A solo pick is a single selection, not a range', () => {
    assert.deepEqual(dayRangeData({ selected: true }), {
      'data-selected-single': true,
      'data-range-start': false,
      'data-range-end': false,
      'data-range-middle': false,
    });
  });

  it('3. Range endpoints never also read as a solo pick', () => {
    // The whole pill is keyed off data-selected-single, so a start day that
    // stayed "selected" would render with the wrong radius.
    assert.equal(
      dayRangeData({ selected: true, range_start: true })[
        'data-selected-single'
      ],
      false,
    );
    assert.equal(
      dayRangeData({ selected: true, range_start: true })['data-range-start'],
      true,
    );
    assert.equal(
      dayRangeData({ selected: true, range_end: true })['data-selected-single'],
      false,
    );
    assert.equal(
      dayRangeData({ selected: true, range_end: true })['data-range-end'],
      true,
    );
    assert.equal(
      dayRangeData({ selected: true, range_middle: true })[
        'data-selected-single'
      ],
      false,
    );
    assert.equal(
      dayRangeData({ selected: true, range_middle: true })['data-range-middle'],
      true,
    );
  });

  it('4. A one-night stay is start and end at once', () => {
    const one = dayRangeData({
      selected: true,
      range_start: true,
      range_end: true,
    });
    assert.equal(one['data-range-start'], true);
    assert.equal(one['data-range-end'], true);
    assert.equal(one['data-selected-single'], false);
  });

  it('5. Only the four documented attributes come out', () => {
    assert.deepEqual(Object.keys(dayRangeData({ selected: true })), [
      'data-selected-single',
      'data-range-start',
      'data-range-end',
      'data-range-middle',
    ]);
  });
});
