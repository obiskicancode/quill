import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { clickableRowProps } from '../components/admin/clickableRow';

/** A keyboard event, reduced to the fields the handler reads. */
function key(key: string, target: unknown, currentTarget: unknown) {
  let prevented = false;
  return {
    event: {
      key,
      target,
      currentTarget,
      preventDefault: () => {
        prevented = true;
      },
    },
    wasPrevented: () => prevented,
  };
}

describe('Admin clickable row contract', () => {
  it('1. Opens on Enter and Space pressed on the row itself', () => {
    let opened = 0;
    const row = clickableRowProps(
      'Open reservation ABC123',
      () => opened++,
      'hover:bg-paper',
    );
    const el = { id: 'row' };

    for (const k of ['Enter', ' ']) {
      const { event, wasPrevented } = key(k, el, el);
      row.onKeyDown?.(event as never);
      assert.ok(wasPrevented(), `${k} must stop the browser default`);
    }
    assert.strictEqual(opened, 2);
  });

  it('2. Ignores keys that started on a control inside the row', () => {
    let opened = 0;
    const row = clickableRowProps('Open reservation ABC123', () => opened++);
    const link = { id: 'link-inside-row' };
    const el = { id: 'row' };

    row.onKeyDown?.(key('Enter', link, el).event as never);
    assert.strictEqual(opened, 0, 'a link inside the row owns its own Enter');
  });

  it('3. Ignores unrelated keys', () => {
    let opened = 0;
    const row = clickableRowProps('Open reservation ABC123', () => opened++);
    const el = { id: 'row' };

    row.onKeyDown?.(key('Tab', el, el).event as never);
    assert.strictEqual(opened, 0);
  });

  it('4. Is a focusable button with a label and a visible ring', () => {
    const row = clickableRowProps('Open payment XYZ789', () => {});
    const className = row.className ?? '';

    assert.strictEqual(row.role, 'button');
    assert.strictEqual(row.tabIndex, 0);
    assert.strictEqual(row['aria-label'], 'Open payment XYZ789');
    assert.match(className, /cursor-pointer/);
    assert.match(className, /focus-visible:outline-2/);
    assert.match(className, /focus-visible:outline-ring/);
  });

  it('5. Keeps a consumer radius rather than merging it away', () => {
    const row = clickableRowProps('x', () => {}, 'rounded-card border-2');

    assert.match(row.className ?? '', /rounded-card/);
    assert.match(row.className ?? '', /border-2/);
  });
});
